import { useEffect, useMemo, useState } from "react";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";
import { supabase } from "../supabase";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], recoveries: [], appointments: [], notifications: [], chips: [], templates: [],
};

type TabKey = "agenda" | "notifications";
type NotificationAction = "read" | "unread" | "complete" | "archive";

function appointmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Agendada",
    completed: "Concluída",
    cancelled: "Cancelada",
    no_show: "Não compareceu",
  };
  return labels[status] ?? status;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority] ?? priority;
}

function categoryLabel(category: string | null, kind: string) {
  const value = category || kind;
  const labels: Record<string, string> = {
    scheduled_returns: "Retornos programados",
    post_audio: "Retornar após áudio",
    lawyer_agenda: "Agenda dos advogados",
    system: "Sistema",
    chip_health: "Saúde dos chips",
    recovery: "Recuperação de contatos",
    meeting_reminder: "Lembretes de reunião",
  };
  return labels[value] ?? value;
}

export function ProspecAgendaNotificationsReal() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("agenda");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const data = await loadRealDataSnapshot();
    setSnapshot(data);
  }

  useEffect(() => {
    let active = true;
    load()
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Falha ao carregar agenda e notificações."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const contactsById = useMemo(() => new Map(snapshot.contacts.map((item) => [item.id, item])), [snapshot.contacts]);
  const profilesById = useMemo(() => new Map(snapshot.profiles.map((item) => [item.id, item])), [snapshot.profiles]);

  const appointments = useMemo(() => snapshot.appointments.filter((item) => {
    const contact = item.contact_id ? contactsById.get(item.contact_id) : undefined;
    const owner = profilesById.get(item.owner_id);
    const text = `${item.title} ${contact?.full_name || ""} ${owner?.full_name || ""} ${item.status}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [snapshot.appointments, contactsById, profilesById, query]);

  const categories = useMemo(() => [...new Set(snapshot.notifications.map((item) => item.category || item.kind))].sort(), [snapshot.notifications]);

  const notifications = useMemo(() => snapshot.notifications.filter((item) => {
    const archivedAt = (item as typeof item & { archived_at?: string | null }).archived_at;
    const text = `${item.title} ${item.body || ""} ${item.kind} ${item.category || ""} ${item.priority}`.toLowerCase();
    const categoryMatches = category === "all" || (item.category || item.kind) === category;
    const archiveMatches = includeArchived || !archivedAt;
    return text.includes(query.toLowerCase()) && categoryMatches && archiveMatches;
  }), [snapshot.notifications, query, category, includeArchived]);

  const upcoming = appointments.filter((item) => item.status === "scheduled");
  const completed = appointments.filter((item) => item.status === "completed");
  const cancelled = appointments.filter((item) => item.status === "cancelled");
  const noShow = appointments.filter((item) => item.status === "no_show");

  const unread = notifications.filter((item) => !item.read_at);
  const highPriority = notifications.filter((item) => item.priority === "high" || item.priority === "urgent");

  async function runNotificationAction(id: string, action: NotificationAction) {
    try {
      setSavingId(id);
      const { error: actionError } = await supabase.rpc("notification_action", {
        p_notification_id: id,
        p_action: action,
      });
      if (actionError) throw actionError;
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a notificação.");
    } finally {
      setSavingId(null);
    }
  }

  function openNotification(actionUrl: string | null | undefined) {
    if (!actionUrl) return;
    window.location.assign(actionUrl);
  }

  if (loading) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Carregando agenda e notificações...</h1><p>Consultando dados reais com autenticação e RLS.</p></section></main>;
  if (error) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Não foi possível carregar</h1><p>{error}</p><button className="prospec-button-primary" onClick={() => { setError(""); setLoading(true); load().finally(() => setLoading(false)); }}>Tentar novamente</button></section></main>;

  return (
    <main className="prospec-app real-data-shell">
      <header className="all-screens-header">
        <div><p className="eyebrow">AGENDA E NOTIFICAÇÕES</p><h1>Operação real</h1><span>Dados carregados diretamente do Supabase.</span></div>
      </header>

      <section className="real-data-content">
        <div className="attendance-tabs-row">
          <button className={tab === "agenda" ? "is-active" : ""} onClick={() => setTab("agenda")}>Agenda</button>
          <button className={tab === "notifications" ? "is-active" : ""} onClick={() => setTab("notifications")}>Notificações</button>
        </div>

        <div className="all-screens-actions">
          <input className="attendance-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, advogado, status ou categoria..." />
          {tab === "notifications" ? <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item} value={item}>{categoryLabel(item, item)}</option>)}</select> : null}
        </div>

        {tab === "agenda" ? (
          <>
            <section className="all-screens-metrics">
              <article className="prospec-card premium-card"><span>Agendadas</span><strong>{upcoming.length}</strong><small>dados reais</small></article>
              <article className="prospec-card premium-card"><span>Concluídas</span><strong>{completed.length}</strong><small>dados reais</small></article>
              <article className="prospec-card premium-card"><span>Canceladas</span><strong>{cancelled.length}</strong><small>dados reais</small></article>
              <article className="prospec-card premium-card"><span>Ausências</span><strong>{noShow.length}</strong><small>dados reais</small></article>
            </section>
            <section className="all-screens-grid">
              <article className="prospec-card premium-card panel">
                <div className="section-heading-row"><h2>Compromissos</h2><small>{appointments.length} encontrado(s)</small></div>
                {appointments.length ? appointments.map((item) => {
                  const contact = item.contact_id ? contactsById.get(item.contact_id) : undefined;
                  const owner = profilesById.get(item.owner_id);
                  const support = item.support_lawyer_id ? profilesById.get(item.support_lawyer_id) : undefined;
                  return <div className="notification-row" key={item.id}><div><strong>{item.title}</strong><small>{new Date(item.starts_at).toLocaleString("pt-BR")} · {contact?.full_name || "Sem contato vinculado"}</small><small>Responsável: {owner?.full_name || "Não localizado"}{support ? ` · Apoio: ${support.full_name}` : ""}</small></div><em>{appointmentStatusLabel(item.status)}</em></div>;
                }) : <p>Nenhum compromisso encontrado.</p>}
              </article>
              <article className="prospec-card premium-card panel">
                <h2>Resumo por responsável</h2>
                {snapshot.profiles.filter((profile) => profile.role === "lawyer").map((profile) => <div className="list-row" key={profile.id}><strong>{profile.full_name}</strong><span>{snapshot.appointments.filter((item) => item.owner_id === profile.id || item.support_lawyer_id === profile.id).length} compromisso(s)</span></div>)}
              </article>
            </section>
          </>
        ) : null}

        {tab === "notifications" ? (
          <>
            <section className="all-screens-metrics">
              <article className="prospec-card premium-card"><span>Total</span><strong>{notifications.length}</strong><small>dados reais</small></article>
              <article className="prospec-card premium-card"><span>Não lidas</span><strong>{unread.length}</strong><small>dados reais</small></article>
              <article className="prospec-card premium-card"><span>Alta prioridade</span><strong>{highPriority.length}</strong><small>dados reais</small></article>
              <article className="prospec-card premium-card"><span>Saúde dos chips</span><strong>{snapshot.chips.filter((chip) => chip.health_score > 60 || chip.auto_suspended).length}</strong><small>alerta real</small></article>
            </section>
            <div className="all-screens-actions"><label><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Mostrar arquivadas</label></div>
            <section className="all-screens-grid">
              <article className="prospec-card premium-card panel">
                <div className="section-heading-row"><h2>Notificações reais</h2><small>{notifications.length} encontrada(s)</small></div>
                {notifications.length ? notifications.map((item) => {
                  const extended = item as typeof item & { archived_at?: string | null; completed_at?: string | null; action_url?: string | null };
                  const busy = savingId === item.id;
                  return <div className="notification-row" key={item.id}><div><strong>{item.title}</strong><small>{item.body || "Sem descrição"}</small><small>{categoryLabel(item.category, item.kind)} · {new Date(item.created_at).toLocaleString("pt-BR")}</small><div className="all-screens-actions"><button disabled={busy} onClick={() => runNotificationAction(item.id, item.read_at ? "unread" : "read")}>{item.read_at ? "Marcar como não lida" : "Marcar como lida"}</button>{extended.completed_at ? null : <button disabled={busy} onClick={() => runNotificationAction(item.id, "complete")}>Concluir</button>}<button disabled={busy} onClick={() => runNotificationAction(item.id, "archive")}>Arquivar</button>{extended.action_url ? <button className="prospec-button-primary" onClick={() => openNotification(extended.action_url)}>Abrir</button> : null}</div></div><em>{priorityLabel(item.priority)}{extended.completed_at ? " · Concluída" : item.read_at ? " · Lida" : " · Pendente"}{extended.archived_at ? " · Arquivada" : ""}</em></div>;
                }) : <p>Nenhuma notificação registrada.</p>}
              </article>
              <article className="prospec-card premium-card panel">
                <h2>Saúde dos chips</h2>
                {snapshot.chips.length ? snapshot.chips.map((chip) => <div className="list-row" key={chip.id}><strong>{chip.name}</strong><span>{chip.status} · risco {chip.health_score}{chip.auto_suspended ? " · suspenso" : ""}</span></div>) : <p>Nenhum chip cadastrado.</p>}
              </article>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
