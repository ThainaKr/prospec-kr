import { useEffect, useMemo, useState } from "react";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], recoveries: [], appointments: [], notifications: [], chips: [], templates: [],
};

type TabKey = "agenda" | "notifications";

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

export function ProspecAgendaNotificationsReal() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("agenda");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    loadRealDataSnapshot()
      .then((data) => active && setSnapshot(data))
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

  const notifications = useMemo(() => snapshot.notifications.filter((item) => {
    const text = `${item.title} ${item.body || ""} ${item.kind} ${item.category || ""} ${item.priority}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [snapshot.notifications, query]);

  const upcoming = appointments.filter((item) => item.status === "scheduled");
  const completed = appointments.filter((item) => item.status === "completed");
  const cancelled = appointments.filter((item) => item.status === "cancelled");
  const noShow = appointments.filter((item) => item.status === "no_show");

  const unread = notifications.filter((item) => !item.read_at);
  const highPriority = notifications.filter((item) => item.priority === "high" || item.priority === "urgent");

  if (loading) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Carregando agenda e notificações...</h1><p>Consultando dados reais com autenticação e RLS.</p></section></main>;
  if (error) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Não foi possível carregar</h1><p>{error}</p></section></main>;

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
            <section className="all-screens-grid">
              <article className="prospec-card premium-card panel">
                <div className="section-heading-row"><h2>Notificações reais</h2><small>{notifications.length} encontrada(s)</small></div>
                {notifications.length ? notifications.map((item) => <div className="notification-row" key={item.id}><div><strong>{item.title}</strong><small>{item.body || "Sem descrição"}</small><small>{item.category || item.kind} · {new Date(item.created_at).toLocaleString("pt-BR")}</small></div><em>{priorityLabel(item.priority)}{item.read_at ? " · Lida" : " · Pendente"}</em></div>) : <p>Nenhuma notificação registrada.</p>}
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
