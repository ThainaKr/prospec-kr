import { useEffect, useMemo, useState } from "react";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], recoveries: [], appointments: [], notifications: [], chips: [], templates: [],
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function ProspecRealHome() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    loadRealDataSnapshot()
      .then((data) => mounted && setSnapshot(data))
      .catch((reason: unknown) => mounted && setError(reason instanceof Error ? reason.message : "Falha ao carregar o painel."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const metrics = useMemo(() => {
    const scheduled = snapshot.appointments.filter((item) => item.status === "scheduled").length;
    const activeChips = snapshot.chips.filter((item) => item.status === "active").length;
    const recoveryOpen = snapshot.recoveries.filter((item) => item.status !== "recovered").length;
    const activeLists = snapshot.lists.filter((item) => item.active && !item.paused).length;
    return [
      ["Contatos", snapshot.contacts.length, "Base visível ao usuário"],
      ["Listas ativas", activeLists, `${snapshot.lists.length} cadastradas`],
      ["Recuperação", recoveryOpen, "Casos em aberto"],
      ["Agendamentos", scheduled, "Reuniões programadas"],
      ["Chips ativos", activeChips, `${snapshot.chips.length} cadastrados`],
      ["Modelos ativos", snapshot.templates.filter((item) => item.active).length, "Biblioteca disponível"],
    ];
  }, [snapshot]);

  if (loading) {
    return <main className="prospec-app real-home-state"><section className="prospec-card premium-card"><h1>Carregando o início real...</h1><p>Consultando o Supabase com autenticação e RLS.</p></section></main>;
  }

  if (error) {
    return <main className="prospec-app real-home-state"><section className="prospec-card premium-card"><h1>Não foi possível abrir o início</h1><p>{error}</p><small>Entre com um usuário convidado e autorizado.</small></section></main>;
  }

  const recentContacts = snapshot.contacts.slice(0, 8);
  const nextAppointments = snapshot.appointments
    .filter((item) => item.status === "scheduled")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 6);
  const chipAlerts = snapshot.chips.filter((item) => item.status !== "active" || item.health_score >= 61);

  return (
    <main className="prospec-app real-home-shell">
      <header className="all-screens-header">
        <div>
          <p className="eyebrow">INÍCIO OPERACIONAL</p>
          <h1>Painel conectado ao Supabase</h1>
          <span>Dados reais visíveis conforme o perfil e as políticas RLS.</span>
        </div>
      </header>

      <section className="real-home-content">
        <section className="all-screens-metrics">
          {metrics.map(([label, value, helper]) => (
            <article className="prospec-card premium-card" key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{helper}</small>
              <div className="mini-glow-chart">▁▂▃▄▅▆▇</div>
            </article>
          ))}
        </section>

        <section className="all-screens-grid">
          <article className="prospec-card premium-card panel">
            <div className="section-heading-row"><h2>Contatos recentes</h2><small>{snapshot.contacts.length} visíveis</small></div>
            {recentContacts.length ? recentContacts.map((item) => (
              <div className="contact-line" key={item.id}>
                <span className="prospec-avatar">{item.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <div><strong>{item.full_name}</strong><small>{item.company || "Sem empresa"}</small></div>
                <em>{item.current_result || item.queue_status}</em>
              </div>
            )) : <p className="empty-copy">Nenhum contato disponível para este usuário.</p>}
          </article>

          <article className="prospec-card premium-card panel">
            <div className="section-heading-row"><h2>Próximos agendamentos</h2><small>{nextAppointments.length}</small></div>
            {nextAppointments.length ? nextAppointments.map((item) => (
              <div className="list-row" key={item.id}><strong>{item.title}</strong><span>{formatDate(item.starts_at)}</span></div>
            )) : <p className="empty-copy">Nenhum agendamento programado.</p>}
          </article>

          <article className="prospec-card premium-card panel">
            <div className="section-heading-row"><h2>Recuperação de contatos</h2><small>{snapshot.recoveries.length}</small></div>
            {snapshot.recoveries.slice(0, 8).map((item) => (
              <div className="list-row" key={item.id}><strong>{item.status}</strong><span>{item.attempts} tentativa(s)</span></div>
            ))}
          </article>

          <article className="prospec-card premium-card panel">
            <div className="section-heading-row"><h2>Saúde dos chips</h2><small>{snapshot.chips.length}</small></div>
            {snapshot.chips.map((item) => (
              <div className="list-row" key={item.id}><strong>{item.name}</strong><span>{item.status} · risco {item.health_score}</span></div>
            ))}
            {!chipAlerts.length ? <p className="empty-copy">Todos os chips visíveis estão sem alerta.</p> : null}
          </article>
        </section>
      </section>
    </main>
  );
}
