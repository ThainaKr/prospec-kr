import { useEffect, useMemo, useState } from "react";
import { loadRealDataSnapshot, type RealDataSnapshot } from "../api/realData";

const EMPTY: RealDataSnapshot = {
  profiles: [], lists: [], contacts: [], contactPhones: [], contactEvents: [], recoveries: [], appointments: [], notifications: [], chips: [], chipDailyStats: [], templates: [],
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatTime(value: string | null | undefined) {
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    message_sent: "Mensagem enviada",
    audio_sent: "Áudio enviado",
    contact_opened: "Contato aberto",
    status_changed: "Status alterado",
    appointment_created: "Reunião agendada",
    result_recorded: "Resultado registrado",
  };
  return labels[type] || type.replaceAll("_", " ");
}

export function ProspecRealHome() {
  const [snapshot, setSnapshot] = useState<RealDataSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Todos");

  useEffect(() => {
    let mounted = true;
    loadRealDataSnapshot()
      .then((data) => {
        if (!mounted) return;
        setSnapshot(data);
        setSelectedContactId(data.contacts[0]?.id ?? null);
        setSelectedChipId(data.chips.find((item) => item.status === "active")?.id ?? data.chips[0]?.id ?? null);
      })
      .catch((reason: unknown) => mounted && setError(reason instanceof Error ? reason.message : "Falha ao carregar o CRM."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filteredContacts = useMemo(() => snapshot.contacts.filter((item) => {
    const list = snapshot.lists.find((entry) => entry.id === item.list_id);
    return `${item.full_name} ${item.company || ""} ${list?.name || ""} ${item.current_result || ""}`.toLowerCase().includes(search.toLowerCase());
  }), [snapshot.contacts, snapshot.lists, search]);

  const selectedContact = snapshot.contacts.find((item) => item.id === selectedContactId) ?? filteredContacts[0] ?? snapshot.contacts[0] ?? null;
  const selectedChip = snapshot.chips.find((item) => item.id === selectedChipId) ?? snapshot.chips[0] ?? null;
  const selectedList = selectedContact ? snapshot.lists.find((item) => item.id === selectedContact.list_id) : null;
  const contactPhone = selectedContact ? snapshot.contactPhones.find((item) => item.contact_id === selectedContact.id && item.is_primary) ?? snapshot.contactPhones.find((item) => item.contact_id === selectedContact.id) : null;
  const contactEvents = selectedContact ? snapshot.contactEvents.filter((item) => item.contact_id === selectedContact.id).slice(0, 8) : [];
  const templates = snapshot.templates.filter((item) => item.active && (templateCategory === "Todos" || (item.category || "Sem categoria") === templateCategory)).slice(0, 6);
  const categories = ["Todos", ...Array.from(new Set(snapshot.templates.map((item) => item.category || "Sem categoria")))];
  const unreadNotifications = snapshot.notifications.filter((item) => !item.read_at && !item.archived_at).length;
  const chipStats = selectedChip ? snapshot.chipDailyStats.filter((item) => item.chip_id === selectedChip.id) : [];
  const todayStats = chipStats[0];
  const health = selectedChip ? Math.max(0, 100 - selectedChip.health_score) : 0;
  const scheduled = snapshot.appointments.filter((item) => item.status === "scheduled").length;
  const completed = snapshot.appointments.filter((item) => item.status === "completed").length;

  if (loading) return <main className="prospec-app crm-state"><section className="prospec-card"><h1>Carregando o CRM...</h1><p>Organizando contatos, chips, modelos, agenda e indicadores.</p></section></main>;
  if (error) return <main className="prospec-app crm-state"><section className="prospec-card"><h1>Não foi possível abrir o CRM</h1><p>{error}</p></section></main>;

  return (
    <main className="prospec-app crm-shell">
      <aside className="crm-sidebar">
        <div className="crm-logo"><span>PROSPEC</span><strong>KR</strong></div>
        <nav>
          <a className="is-active" href="#atendimento">⌂ <span>Atendimento<small>Converse e avance</small></span></a>
          <a href="#inicio">⌁ <span>Início<small>Visão geral</small></span></a>
          <a href="./listas-contatos">☷ <span>Listas e Contatos<small>Suas listas e leads</small></span></a>
          <a href="#modelos">▣ <span>Modelos<small>Mensagens e áudios</small></span></a>
          <a href="./agenda">□ <span>Agendamentos<small>Compromissos</small></span></a>
          <a href="./relatorios">▥ <span>Relatórios<small>Desempenho</small></span></a>
          <a href="./chips-usuarios">◉ <span>Chips<small>Gerencie seus chips</small></span></a>
          <a href="#configuracoes">⚙ <span>Configurações<small>Preferências</small></span></a>
        </nav>
        <section className="crm-health-card">
          <span>SAÚDE DO CHIP ATUAL</span>
          <div className="crm-health-ring" style={{ "--health": `${health * 3.6}deg` } as React.CSSProperties}><strong>{health}%</strong><small>{health >= 80 ? "Saudável" : health >= 60 ? "Atenção" : "Alto risco"}</small></div>
          <div><small>Mensagens hoje</small><strong>{todayStats?.messages_sent ?? 0}</strong></div>
          <div><small>Respostas</small><strong>{todayStats?.replies_received ?? 0}</strong></div>
          <button>Ver detalhes do chip</button>
        </section>
      </aside>

      <section className="crm-workspace">
        <header className="crm-topbar">
          <div><span>ATENDIMENTO</span><small>Converse, envie mensagens e avance na prospecção</small></div>
          <div className="crm-chip-picker"><small>Chip ativo</small><select value={selectedChipId ?? ""} onChange={(event) => setSelectedChipId(event.target.value)}>{snapshot.chips.map((chip) => <option key={chip.id} value={chip.id}>{chip.name} · {chip.number}</option>)}</select></div>
          <button className="crm-swap-chip">⇄ Trocar chip</button>
          <div className="crm-top-icons"><button>⌕</button><button>♧<b>{unreadNotifications}</b></button><button>▥</button><span className="crm-user">TK</span></div>
        </header>

        <section className="crm-main-grid">
          <aside className="crm-conversations">
            <div className="crm-panel-title"><div><strong>CONVERSAS DO DIA</strong><small>{new Intl.DateTimeFormat("pt-BR").format(new Date())}</small></div><span>{filteredContacts.length}</span></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contato..." />
            <div className="crm-filters"><button className="active">Todas {filteredContacts.length}</button><button>Com resposta</button><button>Sem resposta</button></div>
            <div className="crm-contact-list">
              {filteredContacts.slice(0, 20).map((contact) => {
                const list = snapshot.lists.find((item) => item.id === contact.list_id);
                return <button key={contact.id} className={selectedContact?.id === contact.id ? "is-selected" : ""} onClick={() => setSelectedContactId(contact.id)}><span className="crm-avatar">{initials(contact.full_name)}</span><div><strong>{contact.full_name}</strong><small>{contact.company || list?.name || "Sem empresa"}</small><em>{contact.current_result || contact.queue_status}</em></div><time>{formatTime(contact.last_activity_at)}</time></button>;
              })}
            </div>
            <button className="crm-history-button">Ver histórico completo</button>
          </aside>

          <section className="crm-chat">
            {selectedContact ? <>
              <header className="crm-chat-header"><span className="crm-avatar large">{initials(selectedContact.full_name)}</span><div><strong>{selectedContact.full_name}</strong><small>{contactPhone?.phone || "Sem telefone"}</small><div><em>{selectedList?.name || "Sem lista"}</em><em>{selectedContact.current_result || selectedContact.queue_status}</em></div></div><nav><button>☆</button><button>☎</button><button>⋮</button></nav></header>
              <div className="crm-messages">
                <div className="crm-day-pill">Hoje</div>
                <article className="received"><span className="crm-avatar">{initials(selectedContact.full_name)}</span><p>Olá, recebi sua mensagem. Pode me explicar melhor?</p><time>09:41</time></article>
                <article className="sent"><p>Bom dia, {selectedContact.first_name || selectedContact.full_name.split(" ")[0]}! Claro, posso sim te explicar.</p><time>09:42 ✓✓</time></article>
                <article className="audio"><button>▶</button><div><span>▁▂▃▅▇▆▃▂▅▇▆▅▃▁</span><small>00:27</small></div><time>09:42 ✓✓</time></article>
                <article className="received"><span className="crm-avatar">{initials(selectedContact.full_name)}</span><p>Entendi, faz sentido. Vamos agendar uma reunião?</p><time>09:43</time></article>
              </div>
              <section className="crm-composer" id="modelos">
                <div className="crm-compose-tabs"><button>Mensagem</button><button className="active">Áudio</button></div>
                <input placeholder="Buscar modelo de áudio..." />
                <div className="crm-template-filters">{categories.slice(0, 6).map((category) => <button className={templateCategory === category ? "active" : ""} key={category} onClick={() => setTemplateCategory(category)}>{category}</button>)}</div>
                <div className="crm-template-grid"><div>{templates.length ? templates.map((template, index) => <article key={template.id}><button>▶</button><strong>{String(index + 1).padStart(2, "0")} · {template.name}</strong><small>{template.category || "Sem categoria"}</small><span>▁▃▆▅▂▇▆▃▁</span><button>⋮</button></article>) : <p>Nenhum modelo ativo nesta categoria.</p>}</div><aside><div>🎙</div><strong>Gravar áudio</strong><small>ou selecione um arquivo</small><button>Selecionar arquivo</button></aside></div>
                <footer><button>☺</button><button>⌕</button><button>{`{NOME}`}</button><button>{`{EMPRESA}`}</button><div /><button>Enviar</button><button>➤</button></footer>
              </section>
            </> : <div className="crm-empty"><h2>Nenhum contato disponível</h2><p>Importe ou distribua uma lista para começar.</p></div>}
          </section>

          <aside className="crm-contact-card">
            {selectedContact ? <>
              <section><div className="crm-profile-avatar">{initials(selectedContact.full_name)}</div><h2>{selectedContact.full_name}</h2><p>{contactPhone?.phone || "Sem telefone"}</p><dl><div><dt>Empresa</dt><dd>{selectedContact.company || "Não informada"}</dd></div><div><dt>Origem</dt><dd>{selectedList?.name || "Não informada"}</dd></div><div><dt>Status atual</dt><dd>{selectedContact.current_result || selectedContact.queue_status}</dd></div><div><dt>Próximo contato</dt><dd>{snapshot.appointments.find((item) => item.contact_id === selectedContact.id)?.starts_at ? formatTime(snapshot.appointments.find((item) => item.contact_id === selectedContact.id)?.starts_at) : "Não agendado"}</dd></div></dl><button>Ver cartão completo →</button></section>
              <section><header><strong>HISTÓRICO DE INTERAÇÕES</strong><button>Ver todos</button></header>{contactEvents.length ? contactEvents.map((event) => <article key={event.id}><span>◫</span><div><strong>{eventLabel(event.event_type)}</strong><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.created_at))}</small></div><em>✓</em></article>) : <p>Sem interações registradas.</p>}</section>
              <section><strong>AÇÕES RÁPIDAS</strong><div className="crm-actions"><button>Agendar reunião</button><button>Adicionar lembrete</button><button>Transferir contato</button><button>Abrir no WhatsApp</button><button>Ver no CRM</button><button>Ver histórico</button></div></section>
            </> : null}
          </aside>
        </section>

        <footer className="crm-metrics-bar">
          <article><span>Primeiras mensagens</span><strong>{todayStats?.messages_sent ?? 0}</strong><small>Hoje</small><div>▁▂▃▄▆▅▇</div></article>
          <article><span>Com resposta</span><strong>{todayStats?.replies_received ?? 0}</strong><small>Hoje</small><div>▁▃▅▄▆▇</div></article>
          <article><span>Sem resposta</span><strong>{Math.max(0, (todayStats?.messages_sent ?? 0) - (todayStats?.replies_received ?? 0))}</strong><small>Hoje</small><div>▁▂▂▄▃▆</div></article>
          <article><span>Áudios enviados</span><strong>{todayStats?.audios_sent ?? 0}</strong><small>Hoje</small><div>▁▃▆▅▇</div></article>
          <article><span>Agendamentos</span><strong>{scheduled}</strong><small>Total</small><div>▁▂▄▅▇</div></article>
          <article><span>Reuniões realizadas</span><strong>{completed}</strong><small>Total</small><div>▁▃▄▆▅</div></article>
          <button>Ver relatórios completos</button>
        </footer>
      </section>
    </main>
  );
}
