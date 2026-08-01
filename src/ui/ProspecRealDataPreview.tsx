import { useEffect, useMemo, useState } from "react";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], recoveries: [], appointments: [], notifications: [], chips: [], templates: [],
};

export function ProspecRealDataPreview() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadRealDataSnapshot()
      .then((data) => active && setSnapshot(data))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Falha ao carregar os dados reais."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const metrics = useMemo(() => [
    ["Contatos", snapshot.contacts.length],
    ["Listas", snapshot.lists.length],
    ["Em recuperação", snapshot.recoveries.filter((item) => item.status !== "recovered").length],
    ["Agendamentos", snapshot.appointments.length],
    ["Chips", snapshot.chips.length],
    ["Usuários", snapshot.profiles.length],
  ], [snapshot]);

  if (loading) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Carregando dados reais...</h1><p>Consultando o Supabase com as permissões do usuário autenticado.</p></section></main>;
  if (error) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Não foi possível carregar</h1><p>{error}</p><small>Esta rota exige login e respeita as políticas RLS do projeto.</small></section></main>;

  return (
    <main className="prospec-app real-data-shell">
      <header className="all-screens-header">
        <div><p className="eyebrow">DADOS REAIS</p><h1>PROSPEC KR conectado ao Supabase</h1><span>Leitura operacional protegida por autenticação e RLS.</span></div>
      </header>
      <section className="real-data-content">
        <section className="all-screens-metrics">
          {metrics.map(([label, value]) => <article className="prospec-card premium-card" key={String(label)}><span>{label}</span><strong>{value}</strong><small>valor real</small></article>)}
        </section>
        <section className="all-screens-grid">
          <article className="prospec-card premium-card panel"><h2>Listas recentes</h2>{snapshot.lists.slice(0, 8).map((item) => <div className="list-row" key={item.id}><strong>{item.name}</strong><span>{item.paused ? "Pausada" : item.active ? "Ativa" : "Inativa"}</span></div>)}</article>
          <article className="prospec-card premium-card panel"><h2>Contatos recentes</h2>{snapshot.contacts.slice(0, 8).map((item) => <div className="contact-line" key={item.id}><span className="prospec-avatar">{item.full_name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><strong>{item.full_name}</strong><small>{item.company || "Sem empresa"}</small></div><em>{item.current_result || item.queue_status}</em></div>)}</article>
          <article className="prospec-card premium-card panel"><h2>Recuperação</h2>{snapshot.recoveries.slice(0, 8).map((item) => <div className="list-row" key={item.id}><strong>{item.status}</strong><span>{item.attempts} tentativa(s)</span></div>)}</article>
          <article className="prospec-card premium-card panel"><h2>Chips</h2>{snapshot.chips.map((item) => <div className="list-row" key={item.id}><strong>{item.name}</strong><span>{item.status} · risco {item.health_score}</span></div>)}</article>
          <article className="prospec-card premium-card panel"><h2>Agenda</h2>{snapshot.appointments.slice(0, 8).map((item) => <div className="list-row" key={item.id}><strong>{item.title}</strong><span>{new Date(item.starts_at).toLocaleString("pt-BR")}</span></div>)}</article>
          <article className="prospec-card premium-card panel"><h2>Modelos</h2>{snapshot.templates.slice(0, 8).map((item) => <div className="list-row" key={item.id}><strong>{item.name}</strong><span>{item.category || "Sem categoria"} · {item.usage_count} usos</span></div>)}</article>
        </section>
      </section>
    </main>
  );
}
