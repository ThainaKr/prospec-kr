import { useEffect, useMemo, useState } from "react";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";
import { supabase } from "../supabase";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], recoveries: [], appointments: [], notifications: [], chips: [], templates: [],
};

type Role = "admin" | "lawyer";
type Period = "day" | "week" | "month" | "custom";

type PermissionRow = {
  can_view_reports_overview: boolean;
  can_view_reports_my_performance: boolean;
  can_manage_reports: boolean;
};

function inPeriod(dateValue: string | null | undefined, period: Period, start?: string, end?: string) {
  if (!dateValue) return false;
  const value = new Date(dateValue);
  const now = new Date();
  if (period === "day") return value.toDateString() === now.toDateString();
  if (period === "week") return value >= new Date(now.getTime() - 7 * 86400000);
  if (period === "month") return value >= new Date(now.getTime() - 30 * 86400000);
  if (period === "custom") {
    const min = start ? new Date(`${start}T00:00:00`) : new Date(0);
    const max = end ? new Date(`${end}T23:59:59`) : new Date();
    return value >= min && value <= max;
  }
  return true;
}

function statusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    waiting: "Aguardando",
    in_progress: "Em andamento",
    returned_to_end: "Retornado ao fim da fila",
    completed: "Concluído",
    recovery: "Em recuperação",
    scheduled: "Agendada",
    cancelled: "Cancelada",
    no_show: "Ausência",
    active: "Ativo",
    paused: "Pausado",
    restricted: "Restrito",
    blocked: "Bloqueado",
  };
  return value ? labels[value] ?? value : "Sem status";
}

export function ProspecReportsReal() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [role, setRole] = useState<Role>("lawyer");
  const [permissions, setPermissions] = useState<PermissionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lawyerTab, setLawyerTab] = useState<"overview" | "performance">("overview");

  useEffect(() => {
    let active = true;
    Promise.all([
      loadRealDataSnapshot(),
      supabase.auth.getUser(),
    ]).then(async ([data, auth]) => {
      if (!active) return;
      setSnapshot(data);
      const userId = auth.data.user?.id;
      if (!userId) throw new Error("Usuário autenticado não localizado.");
      const [{ data: profile, error: profileError }, { data: permissionData, error: permissionError }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", userId).single(),
        supabase.from("user_permissions").select("can_view_reports_overview,can_view_reports_my_performance,can_manage_reports").eq("user_id", userId).single(),
      ]);
      if (profileError) throw profileError;
      if (permissionError) throw permissionError;
      setRole((profile?.role ?? "lawyer") as Role);
      setPermissions(permissionData as PermissionRow);
    }).catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Falha ao carregar relatórios."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filteredContacts = useMemo(() => snapshot.contacts.filter((item) => inPeriod(item.last_activity_at, period, start, end)), [snapshot.contacts, period, start, end]);
  const filteredAppointments = useMemo(() => snapshot.appointments.filter((item) => inPeriod(item.starts_at, period, start, end)), [snapshot.appointments, period, start, end]);
  const filteredRecoveries = useMemo(() => snapshot.recoveries.filter((item) => inPeriod(item.updated_at, period, start, end)), [snapshot.recoveries, period, start, end]);

  const listRanking = useMemo(() => snapshot.lists.map((list) => ({
    id: list.id,
    name: list.name,
    contacts: filteredContacts.filter((contact) => contact.list_id === list.id).length,
    completed: filteredContacts.filter((contact) => contact.list_id === list.id && contact.queue_status === "completed").length,
    recovery: filteredContacts.filter((contact) => contact.list_id === list.id && contact.queue_status === "recovery").length,
  })).sort((a, b) => b.contacts - a.contacts), [snapshot.lists, filteredContacts]);

  if (loading) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Carregando relatórios reais...</h1><p>Consultando dados e permissões do usuário.</p></section></main>;
  if (error) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Não foi possível carregar</h1><p>{error}</p></section></main>;
  if (!permissions?.can_view_reports_overview && !permissions?.can_manage_reports) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Acesso restrito</h1><p>Seu perfil não possui permissão para visualizar relatórios.</p></section></main>;

  const isAdmin = role === "admin";
  const showPerformance = !isAdmin && permissions.can_view_reports_my_performance;
  const completed = filteredAppointments.filter((item) => item.status === "completed").length;
  const scheduled = filteredAppointments.filter((item) => item.status === "scheduled").length;
  const cancelled = filteredAppointments.filter((item) => item.status === "cancelled").length;
  const noShow = filteredAppointments.filter((item) => item.status === "no_show").length;
  const recovered = filteredRecoveries.filter((item) => item.status === "recovered").length;

  return (
    <main className="prospec-app real-data-shell">
      <header className="all-screens-header">
        <div><p className="eyebrow">RELATÓRIOS REAIS</p><h1>{isAdmin ? "Visão Geral da Operação" : "Relatórios do Advogado"}</h1><span>Indicadores provenientes do Supabase e limitados por perfil e RLS.</span></div>
      </header>

      <section className="real-data-content">
        <div className="attendance-tabs-row">
          <button className={period === "day" ? "is-active" : ""} onClick={() => setPeriod("day")}>Dia</button>
          <button className={period === "week" ? "is-active" : ""} onClick={() => setPeriod("week")}>Semana</button>
          <button className={period === "month" ? "is-active" : ""} onClick={() => setPeriod("month")}>Mês</button>
          <button className={period === "custom" ? "is-active" : ""} onClick={() => setPeriod("custom")}>Período personalizado</button>
        </div>
        {period === "custom" ? <div className="all-screens-actions"><input className="attendance-search" type="date" value={start} onChange={(event) => setStart(event.target.value)} /><input className="attendance-search" type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></div> : null}

        {!isAdmin && showPerformance ? <div className="attendance-tabs-row"><button className={lawyerTab === "overview" ? "is-active" : ""} onClick={() => setLawyerTab("overview")}>Visão Geral</button><button className={lawyerTab === "performance" ? "is-active" : ""} onClick={() => setLawyerTab("performance")}>Meu Desempenho</button></div> : null}

        <section className="all-screens-metrics">
          <article className="prospec-card premium-card"><span>Contatos movimentados</span><strong>{filteredContacts.length}</strong><small>no período</small></article>
          <article className="prospec-card premium-card"><span>Agendamentos</span><strong>{scheduled}</strong><small>marcados</small></article>
          <article className="prospec-card premium-card"><span>Reuniões concluídas</span><strong>{completed}</strong><small>registradas</small></article>
          <article className="prospec-card premium-card"><span>Em recuperação</span><strong>{filteredRecoveries.filter((item) => item.status !== "recovered").length}</strong><small>casos abertos</small></article>
          <article className="prospec-card premium-card"><span>Recuperados</span><strong>{recovered}</strong><small>no período</small></article>
          <article className="prospec-card premium-card"><span>Canceladas / ausência</span><strong>{cancelled + noShow}</strong><small>{cancelled} canceladas · {noShow} ausências</small></article>
        </section>

        {!isAdmin && lawyerTab === "performance" ? (
          <section className="all-screens-grid">
            <article className="prospec-card premium-card panel"><h2>Meu desempenho</h2><p><strong>{filteredContacts.filter((item) => item.queue_status === "completed").length}</strong><span> contatos concluídos</span></p><p><strong>{completed}</strong><span> reuniões concluídas</span></p><p><strong>{scheduled}</strong><span> reuniões agendadas</span></p><p><strong>{filteredContacts.filter((item) => item.queue_status === "recovery").length}</strong><span> contatos em recuperação</span></p></article>
            <article className="prospec-card premium-card panel"><h2>Distribuição dos meus contatos</h2>{(["waiting", "in_progress", "returned_to_end", "completed", "recovery"] as const).map((status) => <div className="list-row" key={status}><strong>{statusLabel(status)}</strong><span>{filteredContacts.filter((item) => item.queue_status === status).length}</span></div>)}</article>
          </section>
        ) : (
          <section className="all-screens-grid">
            <article className="prospec-card premium-card panel"><h2>Distribuição por resultado</h2>{(["waiting", "in_progress", "returned_to_end", "completed", "recovery"] as const).map((status) => <div className="list-row" key={status}><strong>{statusLabel(status)}</strong><span>{filteredContacts.filter((item) => item.queue_status === status).length}</span></div>)}</article>
            <article className="prospec-card premium-card panel"><h2>Agenda</h2>{(["scheduled", "completed", "cancelled", "no_show"] as const).map((status) => <div className="list-row" key={status}><strong>{statusLabel(status)}</strong><span>{filteredAppointments.filter((item) => item.status === status).length}</span></div>)}</article>
            {isAdmin ? <><article className="prospec-card premium-card panel"><h2>Ranking de listas</h2>{listRanking.length ? listRanking.slice(0, 8).map((item, index) => <div className="list-row" key={item.id}><strong>{index + 1}. {item.name}</strong><span>{item.contacts} contatos · {item.completed} concluídos · {item.recovery} em recuperação</span></div>) : <p>Nenhuma lista com movimentação no período.</p>}</article><article className="prospec-card premium-card panel"><h2>Saúde dos chips</h2>{snapshot.chips.length ? snapshot.chips.map((chip) => <div className="list-row" key={chip.id}><strong>{chip.name}</strong><span>{statusLabel(chip.status)} · índice {chip.health_score}</span></div>) : <p>Nenhum chip disponível.</p>}</article></> : null}
          </section>
        )}
      </section>
    </main>
  );
}
