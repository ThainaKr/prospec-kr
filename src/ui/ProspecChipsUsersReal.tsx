import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { callProspecApi } from "../api/prospecApi";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";
import type { WhatsAppChannelRow } from "../types/database";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], recoveries: [], appointments: [], notifications: [], chips: [], templates: [],
};

type PermissionRow = {
  user_id: string;
  can_manage_chips_users: boolean;
  can_manage_chips: boolean;
  can_manage_users: boolean;
  can_view_settings: boolean;
};

type ChipIncident = {
  id: string;
  chip_id: string;
  incident_type: string;
  occurred_at: string;
  reason: string | null;
  messages_24h: number;
  replies: number;
  meetings: number;
};

type DailyStat = {
  id: string;
  chip_id: string;
  stat_date: string;
  messages_sent: number;
  replies_received: number;
  audios_sent: number;
  schedules_created: number;
  meetings_completed: number;
  contracts_closed: number;
  usage_minutes: number;
};

type InviteRole = "member" | "admin";
type InvitePermissionKey =
  | "can_view_home"
  | "can_view_agenda"
  | "can_view_lists"
  | "can_view_contacts"
  | "can_view_recovery"
  | "can_view_notifications"
  | "can_view_reports_overview"
  | "can_view_reports_my_performance"
  | "can_view_message_templates"
  | "can_view_profile"
  | "can_manage_chips_users"
  | "can_view_settings";

type InviteResult = {
  ok: boolean;
  email: string;
  email_sent: boolean;
};

const PERMISSION_OPTIONS: Array<{ key: InvitePermissionKey; label: string; route: string }> = [
  { key: "can_view_home", label: "Início", route: "/inicio" },
  { key: "can_view_agenda", label: "Agenda", route: "/agenda" },
  { key: "can_view_lists", label: "Listas", route: "/listas-contatos" },
  { key: "can_view_contacts", label: "Contatos", route: "/listas-contatos" },
  { key: "can_view_recovery", label: "Recuperação de Contatos", route: "/listas-contatos" },
  { key: "can_view_notifications", label: "Notificações", route: "/agenda-notificacoes" },
  { key: "can_view_reports_overview", label: "Relatórios · Visão Geral", route: "/relatorios" },
  { key: "can_view_reports_my_performance", label: "Relatórios · Meu Desempenho", route: "/relatorios" },
  { key: "can_view_message_templates", label: "Modelos de Mensagens", route: "/modelos-mensagens" },
  { key: "can_view_profile", label: "Meu Perfil", route: "/perfil" },
  { key: "can_manage_chips_users", label: "Chips e Usuários", route: "/chips-usuarios" },
  { key: "can_view_settings", label: "Configurações", route: "/configuracoes" },
];

const MEMBER_DEFAULTS: Record<InvitePermissionKey, boolean> = {
  can_view_home: false,
  can_view_agenda: true,
  can_view_lists: false,
  can_view_contacts: true,
  can_view_recovery: false,
  can_view_notifications: true,
  can_view_reports_overview: true,
  can_view_reports_my_performance: true,
  can_view_message_templates: true,
  can_view_profile: true,
  can_manage_chips_users: false,
  can_view_settings: false,
};

const ADMIN_DEFAULTS: Record<InvitePermissionKey, boolean> = Object.fromEntries(
  PERMISSION_OPTIONS.map((item) => [item.key, true]),
) as Record<InvitePermissionKey, boolean>;

function chipHealthLabel(score: number) {
  if (score <= 60) return "Saudável";
  if (score <= 80) return "Atenção";
  if (score <= 95) return "Alto risco";
  return "Risco crítico";
}

function userStatusLabel(status: string) {
  if (status === "active") return "Ativo";
  if (status === "pending") return "Pendente";
  if (status === "blocked") return "Bloqueado";
  return status;
}

export function ProspecChipsUsersReal() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [permissions, setPermissions] = useState<PermissionRow | null>(null);
  const [incidents, setIncidents] = useState<ChipIncident[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"chips" | "users">("chips");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteHonorific, setInviteHonorific] = useState("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [invitePermissions, setInvitePermissions] = useState<Record<InvitePermissionKey, boolean>>(MEMBER_DEFAULTS);
  const [landingRoute, setLandingRoute] = useState("/agenda");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [channels, setChannels] = useState<WhatsAppChannelRow[]>([]);
  const [channelName, setChannelName] = useState("");
  const [channelPhone, setChannelPhone] = useState("");
  const [channelBusy, setChannelBusy] = useState(false);
  const [channelMessage, setChannelMessage] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) throw new Error("Sessão não encontrada.");

        const [data, permissionResult, incidentResult, statResult, channelResult] = await Promise.all([
          loadRealDataSnapshot(),
          supabase.from("user_permissions").select("user_id,can_manage_chips_users,can_manage_chips,can_manage_users,can_view_settings").eq("user_id", userId).maybeSingle(),
          supabase.from("chip_incidents").select("id,chip_id,incident_type,occurred_at,reason,messages_24h,replies,meetings").order("occurred_at", { ascending: false }).limit(50),
          supabase.from("chip_daily_stats").select("id,chip_id,stat_date,messages_sent,replies_received,audios_sent,schedules_created,meetings_completed,contracts_closed,usage_minutes").order("stat_date", { ascending: false }).limit(100),
          supabase.from("whatsapp_channels").select("id,organization_id,chip_id,name,phone_number,phone_number_id,provider,owner_id,connection_mode,session_state,status,quality_rating,last_webhook_at,last_error").eq("active", true).order("name"),
        ]);

        if (permissionResult.error) throw permissionResult.error;
        if (incidentResult.error) throw incidentResult.error;
        if (statResult.error) throw statResult.error;
        if (channelResult.error) throw channelResult.error;
        if (!active) return;
        setSnapshot(data);
        setPermissions(permissionResult.data as PermissionRow | null);
        setIncidents((incidentResult.data ?? []) as ChipIncident[]);
        setDailyStats((statResult.data ?? []) as DailyStat[]);
        setChannels((channelResult.data ?? []) as WhatsAppChannelRow[]);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Falha ao carregar chips e usuários.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const canAccess = Boolean(permissions?.can_manage_chips_users || permissions?.can_manage_chips || permissions?.can_manage_users);

  const filteredChips = useMemo(() => snapshot.chips.filter((item) => `${item.name} ${item.number} ${item.operator || ""} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [snapshot.chips, query]);
  const filteredUsers = useMemo(() => snapshot.profiles.filter((item) => `${item.full_name} ${item.email || ""} ${item.role} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [snapshot.profiles, query]);
  const availableLandingRoutes = useMemo(() => {
    const unique = new Map<string, string>();
    PERMISSION_OPTIONS.forEach((item) => {
      if (invitePermissions[item.key] && !unique.has(item.route)) unique.set(item.route, item.label);
    });
    return Array.from(unique.entries()).map(([route, label]) => ({ route, label }));
  }, [invitePermissions]);

  useEffect(() => {
    if (availableLandingRoutes.some((item) => item.route === landingRoute)) return;
    setLandingRoute(availableLandingRoutes[0]?.route || "/perfil");
  }, [availableLandingRoutes, landingRoute]);

  function changeInviteRole(role: InviteRole) {
    setInviteRole(role);
    const defaults = role === "admin" ? ADMIN_DEFAULTS : MEMBER_DEFAULTS;
    setInvitePermissions(defaults);
    setLandingRoute(role === "admin" ? "/inicio" : "/agenda");
  }

  function toggleInvitePermission(key: InvitePermissionKey) {
    setInvitePermissions((current) => ({ ...current, [key]: !current[key] }));
  }

  async function refreshChannels() {
    const { data, error: refreshError } = await supabase.from("whatsapp_channels").select("id,organization_id,chip_id,name,phone_number,phone_number_id,provider,owner_id,connection_mode,session_state,status,quality_rating,last_webhook_at,last_error").eq("active", true).order("name");
    if (refreshError) throw refreshError;
    setChannels((data ?? []) as WhatsAppChannelRow[]);
  }

  async function addChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChannelBusy(true); setChannelMessage(""); setQrCode(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Sessão não encontrada.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("organization_id").eq("id", userId).single();
      if (profileError || !profile?.organization_id) throw new Error("Empresa da administradora não encontrada.");
      const phone = channelPhone.replace(/\D/g, "");
      if (!channelName.trim() || phone.length < 10) throw new Error("Informe o nome e o número com DDD.");
      const { error: insertError } = await supabase.from("whatsapp_channels").insert({ organization_id: profile.organization_id, name: channelName.trim(), phone_number: phone, provider: "whatsapp_web", connection_mode: "qr", session_state: "new", status: "setup_required", active: true });
      if (insertError) throw insertError;
      setChannelName(""); setChannelPhone(""); setChannelMessage("WhatsApp cadastrado. Clique em Conectar para gerar o QR Code.");
      await refreshChannels();
    } catch (reason) { setChannelMessage(reason instanceof Error ? reason.message : "Não foi possível cadastrar."); }
    finally { setChannelBusy(false); }
  }

  async function connectChannel(channelId: string) {
    setChannelBusy(true); setChannelMessage("Iniciando sessão no notebook..."); setQrCode(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("whatsapp-gateway", { body: { action: "start_instance", channelId } });
      if (invokeError || !data?.ok) throw new Error(data?.error || invokeError?.message || "Não foi possível iniciar a sessão.");
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        const result = await supabase.functions.invoke("whatsapp-gateway", { body: { action: "get_instance_qr", channelId } });
        if (result.data?.state === "connected") { setChannelMessage("WhatsApp conectado com sucesso."); break; }
        if (result.data?.qr) { setQrCode(result.data.qr); setChannelMessage("Escaneie o QR Code no WhatsApp."); break; }
      }
      await refreshChannels();
    } catch (reason) { setChannelMessage(reason instanceof Error ? reason.message : "Falha ao conectar."); }
    finally { setChannelBusy(false); }
  }

  async function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissions?.can_manage_users) return;
    const fullName = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();
    if (!fullName || !email) {
      setInviteMessage("Informe nome e e-mail para enviar o convite.");
      return;
    }
    if (!Object.values(invitePermissions).some(Boolean)) {
      setInviteMessage("Selecione pelo menos uma página de acesso.");
      return;
    }

    setInviteBusy(true);
    setInviteMessage("");
    try {
      const result = await callProspecApi<InviteResult>("invite_user", {
        fullName,
        email,
        honorific: inviteHonorific.trim() || null,
        jobTitle: inviteJobTitle.trim() || null,
        role: inviteRole,
        permissions: invitePermissions,
        landingRoute,
      });
      setInviteMessage(result.email_sent ? `Convite enviado para ${result.email}.` : `Convite salvo para ${result.email}. O e-mail não foi reenviado porque a conta já existe.`);
      setInviteName("");
      setInviteEmail("");
      setInviteHonorific("");
      setInviteJobTitle("");
      setInviteRole("member");
      setInvitePermissions(MEMBER_DEFAULTS);
      setLandingRoute("/agenda");
      const refreshed = await loadRealDataSnapshot();
      setSnapshot(refreshed);
    } catch (reason) {
      setInviteMessage(reason instanceof Error ? reason.message : "Não foi possível enviar o convite.");
    } finally {
      setInviteBusy(false);
    }
  }

  if (loading) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Carregando chips e usuários...</h1><p>Consultando permissões, métricas e incidentes.</p></section></main>;
  if (error) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Não foi possível carregar</h1><p>{error}</p></section></main>;
  if (!canAccess) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Acesso restrito</h1><p>Esta área é exclusiva da Administradora.</p></section></main>;

  return (
    <main className="prospec-app real-data-shell">
      <header className="all-screens-header">
        <div><p className="eyebrow">CHIPS E USUÁRIOS</p><h1>Gestão operacional real</h1><span>Dados protegidos por autenticação, permissões e RLS.</span></div>
      </header>

      <section className="real-data-content">
        <div className="attendance-tabs-row">
          <button className={tab === "chips" ? "is-active" : ""} onClick={() => setTab("chips")}>Chips</button>
          <button className={tab === "users" ? "is-active" : ""} onClick={() => setTab("users")}>Usuários</button>
        </div>
        <input className="attendance-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, número, operadora, e-mail ou status..." />

        {tab === "chips" ? (
          <>
            <section className="all-screens-metrics">
              <article className="prospec-card premium-card"><span>Chips cadastrados</span><strong>{snapshot.chips.length}</strong><small>valor real</small></article>
              <article className="prospec-card premium-card"><span>Saudáveis</span><strong>{snapshot.chips.filter((item) => item.health_score <= 60).length}</strong><small>0 a 60</small></article>
              <article className="prospec-card premium-card"><span>Em atenção</span><strong>{snapshot.chips.filter((item) => item.health_score > 60 && item.health_score <= 80).length}</strong><small>61 a 80</small></article>
              <article className="prospec-card premium-card"><span>Alto/crítico</span><strong>{snapshot.chips.filter((item) => item.health_score > 80).length}</strong><small>acima de 80</small></article>
            </section>
            <section className="all-screens-grid">
              <article className="prospec-card premium-card panel">
                <h2>Chips reais</h2>
                {filteredChips.length ? filteredChips.map((item) => {
                  const stats = dailyStats.filter((stat) => stat.chip_id === item.id);
                  const latest = stats[0];
                  return <div className="recovery-card" key={item.id}><strong>{item.name}</strong><span>{item.number} · {item.operator || "Operadora não informada"}</span><small>{item.status} · {chipHealthLabel(item.health_score)} · índice {item.health_score}</small><small>{latest ? `${latest.messages_sent} mensagens · ${latest.replies_received} respostas · ${latest.usage_minutes} min` : "Sem estatística diária registrada"}</small><em>{item.auto_suspended ? "Envios suspensos automaticamente" : "Envios não suspensos"}</em></div>;
                }) : <p>Nenhum chip encontrado.</p>}
              </article>
              <article className="prospec-card premium-card panel">
                <h2>Incidentes recentes</h2>
                {incidents.length ? incidents.map((item) => {
                  const chip = snapshot.chips.find((entry) => entry.id === item.chip_id);
                  return <div className="list-row" key={item.id}><div><strong>{chip?.name || "Chip não localizado"}</strong><small>{new Date(item.occurred_at).toLocaleString("pt-BR")}</small></div><span>{item.incident_type}</span><em>{item.reason || "Sem motivo registrado"}</em></div>;
                }) : <p>Nenhum incidente registrado.</p>}
              </article>
            </section>
            <section className="prospec-card premium-card panel" style={{ marginTop: 14 }}>
              <div className="section-heading-row"><div><h2>WhatsApps conectados ao CRM</h2><small>Contas comuns ou Business por QR Code</small></div></div>
              <form className="prospec-invite-form" onSubmit={addChannel}>
                <label>Nome do WhatsApp<input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Ex.: Chip 01 · Thainá" /></label>
                <label>Número com DDD<input value={channelPhone} onChange={(event) => setChannelPhone(event.target.value)} placeholder="Ex.: 4798405980" inputMode="tel" /></label>
                <button className="prospec-button-primary" disabled={channelBusy || !permissions?.can_manage_chips}>{channelBusy ? "Aguarde..." : "Cadastrar WhatsApp"}</button>
              </form>
              {channelMessage ? <p>{channelMessage}</p> : null}
              {qrCode ? <div className="prospec-card" style={{ maxWidth: 390, margin: "14px auto", padding: 14, textAlign: "center" }}><img src={qrCode} alt="QR Code para conectar o WhatsApp" style={{ width: "100%", borderRadius: 12 }} /><p>WhatsApp → Aparelhos conectados → Conectar aparelho</p></div> : null}
              {channels.length ? channels.map((channel) => <div className="recovery-card" key={channel.id}><strong>{channel.name}</strong><span>+{channel.phone_number}</span><small>{channel.session_state === "connected" ? "Conectado" : channel.session_state === "awaiting_pairing" ? "Aguardando QR Code" : "Desconectado"}</small><button className="prospec-button-outline" disabled={channelBusy} onClick={() => void connectChannel(channel.id)}>{channel.session_state === "connected" ? "Verificar" : "Conectar"}</button></div>) : <p>Nenhum WhatsApp cadastrado ainda.</p>}
            </section>
          </>
        ) : (
          <section className="all-screens-grid">
            <article className="prospec-card premium-card panel">
              <div className="section-heading-row"><h2>Usuários reais</h2><small>{filteredUsers.length} encontrado(s)</small></div>
              {filteredUsers.length ? filteredUsers.map((item) => <div className="contact-line" key={item.id}><span className="prospec-avatar">{item.full_name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><strong>{item.honorific ? `${item.honorific} ` : ""}{item.full_name}</strong><small>{item.email || "E-mail não informado"}</small></div><em>{item.role === "admin" ? "Administrador" : item.job_title || "Membro da equipe"} · {userStatusLabel(item.status)}</em></div>) : <p>Nenhum usuário encontrado.</p>}
            </article>
            <article className="prospec-card premium-card panel">
              <h2>Fluxo de acesso</h2>
              <p>O acesso é feito exclusivamente por convite enviado por e-mail.</p>
              <p>A Administradora escolhe individualmente as páginas e ações liberadas para cada pessoa.</p>
              <p>Não existe página inicial obrigatória por perfil.</p>
              <button className="prospec-button-primary" disabled={!permissions?.can_manage_users} onClick={() => setInviteOpen((current) => !current)}>{inviteOpen ? "Fechar convite" : "Convidar por e-mail"}</button>
              {!permissions?.can_manage_users ? <small>Seu perfil não possui permissão para gerenciar usuários.</small> : null}
              {inviteOpen && permissions?.can_manage_users ? (
                <form className="prospec-invite-form" onSubmit={submitInvite}>
                  <label>Nome completo<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Nome do usuário" autoComplete="name" /></label>
                  <label>E-mail<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="usuario@empresa.com" autoComplete="email" /></label>
                  <label>Tratamento opcional<input value={inviteHonorific} onChange={(event) => setInviteHonorific(event.target.value)} placeholder="Ex.: Dr., Dra., Sr., Sra." /></label>
                  <label>Cargo<input value={inviteJobTitle} onChange={(event) => setInviteJobTitle(event.target.value)} placeholder="Ex.: Vendedor, Advogado, Consultor" required /></label>
                  <label>Nível de acesso<select value={inviteRole} onChange={(event) => changeInviteRole(event.target.value as InviteRole)}><option value="member">Membro da equipe</option><option value="admin">Administrador</option></select></label>
                  <fieldset className="prospec-permissions-grid">
                    <legend>Páginas e acessos</legend>
                    {PERMISSION_OPTIONS.map((item) => (
                      <label key={item.key} className="prospec-permission-option">
                        <input type="checkbox" checked={invitePermissions[item.key]} onChange={() => toggleInvitePermission(item.key)} />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </fieldset>
                  <label>Página inicial<select value={landingRoute} onChange={(event) => setLandingRoute(event.target.value)}>{availableLandingRoutes.map((item) => <option key={item.route} value={item.route}>{item.label}</option>)}</select></label>
                  <button className="prospec-button-primary" type="submit" disabled={inviteBusy}>{inviteBusy ? "Enviando..." : "Enviar convite"}</button>
                  {inviteMessage ? <p className="prospec-invite-feedback" role="status">{inviteMessage}</p> : null}
                </form>
              ) : null}
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
