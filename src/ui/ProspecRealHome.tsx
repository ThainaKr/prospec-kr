import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadInbox, loadMessages, sendWhatsAppMessage } from "../api/inbox";
import type { ConversationRow, MessageRow, WhatsAppChannelRow } from "../types/database";
import { supabase } from "../supabase";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function time(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "";
}

function ChannelStatus({ channel }: { channel: WhatsAppChannelRow }) {
  const label = { connected: "Conectado", connecting: "Conectando", setup_required: "Configurar", paused: "Pausado", error: "Com erro" }[channel.status];
  return <span className={`inbox-status ${channel.status}`}><i />{label}</span>;
}

function providerLabel(provider: WhatsAppChannelRow["provider"]) {
  if (provider === "whatsapp_web") return "WhatsApp comum";
  if (provider === "evolution") return "WhatsApp via servidor";
  return "WhatsApp oficial";
}

export function ProspecRealHome() {
  const [channels, setChannels] = useState<WhatsAppChannelRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [channelId, setChannelId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const data = await loadInbox();
    setChannels(data.channels);
    setConversations(data.conversations);
    setChannelId((current) => current || data.channels[0]?.id || "");
    setConversationId((current) => current || data.conversations[0]?.id || "");
  }

  useEffect(() => {
    refresh().catch((reason) => setError(reason.message)).finally(() => setLoading(false));
    const realtime = supabase.channel("crm-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as MessageRow;
        if (row?.conversation_id === conversationId) void loadMessages(conversationId).then(setMessages);
      }).subscribe();
    return () => { void supabase.removeChannel(realtime); };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return setMessages([]);
    loadMessages(conversationId).then(setMessages).catch((reason) => setError(reason.message));
  }, [conversationId]);

  const selectedChannel = channels.find((item) => item.id === channelId) ?? null;
  const visible = useMemo(() => conversations.filter((item) =>
    (!channelId || item.channel_id === channelId) &&
    `${item.display_name ?? ""} ${item.remote_wa_id} ${item.last_message_preview ?? ""}`.toLowerCase().includes(search.toLowerCase())
  ), [conversations, channelId, search]);
  const selected = conversations.find((item) => item.id === conversationId) ?? visible[0] ?? null;

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const message = await sendWhatsAppMessage(selected.id, draft.trim());
      setMessages((current) => [...current, message]);
      setDraft("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha no envio.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="prospec-app option1-shell">
      <aside className="option1-nav">
        <div className="crm-logo"><span>PROSPEC</span><strong>KR</strong></div>
        <nav>
          <a className="is-active" href="./inicio"><b>◉</b><span>Atendimento<small>Caixa de entrada</small></span></a>
          <a href="./funis"><b>⌁</b><span>Funis<small>Etapas e oportunidades</small></span></a>
          <a href="./listas-contatos"><b>☷</b><span>Listas e contatos<small>Base comercial</small></span></a>
          <a href="./agenda"><b>□</b><span>Agenda<small>Atividades e reuniões</small></span></a>
          <a href="./relatorios"><b>▥</b><span>Relatórios<small>Métricas reais</small></span></a>
          <a href="./chips-usuarios"><b>♙</b><span>Equipe e canais<small>Cargos e permissões</small></span></a>
        </nav>
        <a className="option1-settings" href="./configuracoes">⚙ Configurações</a>
      </aside>

      <section className="option1-app">
        <header className="option1-topbar">
          <div><p>CENTRAL DE ATENDIMENTO</p><h1>Conversas</h1></div>
          <div className="option1-channel">
            <label>CANAL ATIVO</label>
            <select value={channelId} onChange={(event) => setChannelId(event.target.value)}>
              {!channels.length && <option value="">Nenhum WhatsApp conectado</option>}
              {channels.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.phone_number} · {providerLabel(item.provider)}</option>)}
            </select>
            {selectedChannel && <ChannelStatus channel={selectedChannel} />}
          </div>
          <button className="option1-new">＋ Nova conversa</button>
          <button className="option1-bell">♧</button>
          <span className="option1-user">TK</span>
        </header>

        {error && <div className="option1-error">{error}<button onClick={() => setError("")}>×</button></div>}

        <div className="option1-grid">
          <aside className="option1-conversations">
            <header><div><strong>CAIXA DE ENTRADA</strong><small>{visible.length} conversas</small></div><button>☷</button></header>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, número ou mensagem" />
            <div className="option1-filter"><button className="active">Todas</button><button>Não lidas</button><button>Minhas</button></div>
            <section>
              {loading ? <p className="option1-muted">Carregando conversas...</p> : visible.map((item) =>
                <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setConversationId(item.id)}>
                  <span>{initials(item.display_name || item.remote_wa_id)}</span>
                  <div><strong>{item.display_name || item.remote_wa_id}</strong><small>{item.last_message_preview || "Conversa iniciada"}</small></div>
                  <time>{time(item.last_message_at)}{item.unread_count > 0 && <b>{item.unread_count}</b>}</time>
                </button>
              )}
              {!loading && !visible.length && <div className="option1-empty-list"><b>✦</b><strong>Sua caixa está vazia</strong><p>As conversas reais aparecerão aqui assim que um canal receber mensagens.</p></div>}
            </section>
          </aside>

          <section className="option1-chat">
            {selected ? <>
              <header><span>{initials(selected.display_name || selected.remote_wa_id)}</span><div><h2>{selected.display_name || selected.remote_wa_id}</h2><small>+{selected.remote_wa_id} · WhatsApp</small></div><button>☆</button><button>⋮</button></header>
              <div className="option1-messages">
                <div className="option1-day">Hoje</div>
                {messages.map((item) => <article key={item.id} className={item.direction}>
                  {item.message_type === "audio" ? <div className="option1-audio">▶ <span>▁▃▆▅▂▇▆▃▁</span></div> : <p>{item.body}</p>}
                  <time>{time(item.created_at)} {item.direction === "outbound" && (item.status === "read" ? "✓✓" : "✓")}</time>
                  {item.status === "failed" && <em>{item.error_message || "Falha no envio"}</em>}
                </article>)}
              </div>
              <form className="option1-composer" onSubmit={send}>
                <nav><button type="button">Modelos</button><button type="button">Áudios</button><button type="button">Anexos</button></nav>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva uma mensagem... Use {NOME} ou {EMPRESA}" />
                <footer><button type="button">☺</button><button type="button">📎</button><button type="button">🎙</button><span /><button disabled={sending || selectedChannel?.status !== "connected"}>{sending ? "Enviando..." : "Enviar ➤"}</button></footer>
              </form>
            </> : <div className="option1-empty-chat"><div>◉</div><h2>Conecte qualquer WhatsApp por QR Code</h2><p>Use WhatsApp comum, Business ou contas próprias da equipe. Cada número vira um canal separado dentro do CRM.</p><a href="./chips-usuarios">Conectar primeiro WhatsApp</a><small>Conversas, áudios, anexos e histórico ficam centralizados no PROSPEC KR.</small></div>}
          </section>

          <aside className="option1-details">
            <header><strong>DETALHES</strong><button>×</button></header>
            {selected ? <><section className="option1-person"><span>{initials(selected.display_name || selected.remote_wa_id)}</span><h2>{selected.display_name || "Contato sem nome"}</h2><p>+{selected.remote_wa_id}</p><button>Editar contato</button></section><dl><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Responsável</dt><dd>{selected.assigned_to ? "Pessoa designada" : "Não atribuído"}</dd></div><div><dt>Canal</dt><dd>{selectedChannel?.name || "WhatsApp"}</dd></div></dl><section><strong>AÇÕES</strong><button>Adicionar ao funil</button><button>Agendar atividade</button><button>Transferir atendimento</button><button>Encerrar conversa</button></section></> :
            <div className="option1-empty-details"><b>⌁</b><p>Selecione uma conversa para ver contato, responsável, funil e histórico.</p></div>}
          </aside>
        </div>
      </section>
    </main>
  );
}
