import { useEffect, useMemo, useState } from "react";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], recoveries: [], appointments: [], notifications: [], chips: [], templates: [],
};

type TabKey = "lists" | "contacts" | "recovery";

function statusLabel(value: string | null | undefined) {
  if (!value) return "Sem status";
  const labels: Record<string, string> = {
    waiting: "Aguardando",
    in_progress: "Em andamento",
    returned_to_end: "Retornado ao fim da fila",
    completed: "Concluído",
    recovery: "Em recuperação",
    searching: "Em busca",
    new_number: "Novo número encontrado",
    impossible: "Não recuperado",
    recovered: "Recuperado",
  };
  return labels[value] ?? value;
}

export function ProspecListsContactsReal() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("lists");
  const [query, setQuery] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>("");

  useEffect(() => {
    let active = true;
    loadRealDataSnapshot()
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setSelectedListId((current) => current || data.lists[0]?.id || "");
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Falha ao carregar listas e contatos."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filteredLists = useMemo(() => snapshot.lists.filter((item) => {
    const text = `${item.name} ${item.bank || ""} ${item.origin_bank || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [snapshot.lists, query]);

  const contacts = useMemo(() => snapshot.contacts.filter((item) => {
    const listMatches = !selectedListId || item.list_id === selectedListId;
    const text = `${item.full_name} ${item.company || ""} ${item.current_result || ""}`.toLowerCase();
    return listMatches && text.includes(query.toLowerCase());
  }), [snapshot.contacts, selectedListId, query]);

  const recoveryByContact = useMemo(() => new Map(snapshot.recoveries.map((item) => [item.contact_id, item])), [snapshot.recoveries]);
  const recoveryContacts = useMemo(() => snapshot.contacts.filter((item) => recoveryByContact.has(item.id)).filter((item) => {
    const text = `${item.full_name} ${item.company || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [snapshot.contacts, recoveryByContact, query]);

  if (loading) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Carregando listas e contatos...</h1><p>Consultando dados reais com autenticação e RLS.</p></section></main>;
  if (error) return <main className="prospec-app real-data-state"><section className="prospec-card"><h1>Não foi possível carregar</h1><p>{error}</p></section></main>;

  return (
    <main className="prospec-app real-data-shell">
      <header className="all-screens-header">
        <div><p className="eyebrow">LISTAS E CONTATOS</p><h1>Operação real</h1><span>Dados carregados diretamente do Supabase.</span></div>
      </header>

      <section className="real-data-content">
        <div className="attendance-tabs-row">
          <button className={tab === "lists" ? "is-active" : ""} onClick={() => setTab("lists")}>Listas</button>
          <button className={tab === "contacts" ? "is-active" : ""} onClick={() => setTab("contacts")}>Contatos</button>
          <button className={tab === "recovery" ? "is-active" : ""} onClick={() => setTab("recovery")}>Recuperação de Contatos</button>
        </div>

        <div className="all-screens-actions">
          <input className="attendance-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, empresa, banco ou status..." />
          {tab === "contacts" ? (
            <select className="attendance-search" value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)}>
              <option value="">Todas as listas</option>
              {snapshot.lists.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          ) : null}
        </div>

        {tab === "lists" ? (
          <section className="all-screens-grid">
            <article className="prospec-card premium-card panel">
              <div className="section-heading-row"><h2>Listas reais</h2><small>{filteredLists.length} encontrada(s)</small></div>
              {filteredLists.length ? filteredLists.map((item) => {
                const total = snapshot.contacts.filter((contact) => contact.list_id === item.id).length;
                return <div className="list-row" key={item.id}><div><strong>{item.name}</strong><small>{item.bank || item.origin_bank || "Banco não informado"}</small></div><span>{total} contato(s)</span><em>{item.paused ? "Pausada" : item.active ? "Ativa" : "Inativa"}</em></div>;
              }) : <p>Nenhuma lista encontrada.</p>}
            </article>
            <article className="prospec-card premium-card panel">
              <h2>Indicadores</h2>
              <p><strong>{snapshot.lists.filter((item) => item.active && !item.paused).length}</strong><span> listas ativas</span></p>
              <p><strong>{snapshot.contacts.length}</strong><span> contatos carregados</span></p>
              <p><strong>{snapshot.contacts.filter((item) => item.pending).length}</strong><span> contatos pendentes</span></p>
              <p><strong>{snapshot.contacts.filter((item) => item.recovered).length}</strong><span> contatos recuperados</span></p>
            </article>
          </section>
        ) : null}

        {tab === "contacts" ? (
          <section className="all-screens-grid">
            <article className="prospec-card premium-card panel">
              <div className="section-heading-row"><h2>Contatos reais</h2><small>{contacts.length} encontrado(s)</small></div>
              {contacts.length ? contacts.map((item) => <div className="contact-line" key={item.id}><span className="prospec-avatar">{item.full_name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><strong>{item.full_name}</strong><small>{item.company || "Sem empresa"}</small></div><em>{item.current_result || statusLabel(item.queue_status)}</em></div>) : <p>Nenhum contato encontrado para os filtros atuais.</p>}
            </article>
            <article className="prospec-card premium-card panel">
              <h2>Resumo da fila</h2>
              {(["waiting", "in_progress", "returned_to_end", "completed", "recovery"] as const).map((status) => <div className="list-row" key={status}><strong>{statusLabel(status)}</strong><span>{snapshot.contacts.filter((item) => item.queue_status === status).length}</span></div>)}
            </article>
          </section>
        ) : null}

        {tab === "recovery" ? (
          <section className="all-screens-grid">
            <article className="prospec-card premium-card panel">
              <div className="section-heading-row"><h2>Fila de recuperação</h2><small>{recoveryContacts.length} contato(s)</small></div>
              {recoveryContacts.length ? recoveryContacts.map((contact) => {
                const recovery = recoveryByContact.get(contact.id)!;
                const listName = snapshot.lists.find((item) => item.id === recovery.original_list_id)?.name || "Lista original não localizada";
                return <div className="recovery-card" key={recovery.id}><strong>{contact.full_name}</strong><span>{contact.company || "Sem empresa"}</span><small>{listName} · {statusLabel(recovery.status)} · {recovery.attempts} tentativa(s)</small><button className="prospec-button-outline" disabled>Integração Telegram pendente</button></div>;
              }) : <p>Nenhum contato encontrado em recuperação.</p>}
            </article>
            <article className="prospec-card premium-card panel">
              <h2>Distribuição da recuperação</h2>
              {(["waiting", "searching", "new_number", "impossible", "recovered"] as const).map((status) => <div className="list-row" key={status}><strong>{statusLabel(status)}</strong><span>{snapshot.recoveries.filter((item) => item.status === status).length}</span></div>)}
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
