import { useMemo, useState } from "react";

const conversations = [
  { name: "Carlos Eduardo Silva", company: "Bradesco Premium", time: "09:42", status: "Primeira mensagem enviada", unread: 2 },
  { name: "Juliana Martins", company: "Itaú Empresas", time: "09:41", status: "Aguardando resposta", unread: 1 },
  { name: "Roberto Almeida", company: "Santander PJ", time: "09:40", status: "Aguardando resposta", unread: 0 },
  { name: "Fernanda Costa", company: "Bradesco Premium", time: "09:36", status: "Áudio enviado", unread: 0 },
  { name: "Ricardo Oliveira", company: "Itaú Empresas", time: "09:30", status: "Áudio enviado", unread: 0 },
];

const metrics = [
  ["Primeiras mensagens", "18 / 40"],
  ["Com resposta", "12 / 18"],
  ["Sem resposta", "6 / 18"],
  ["Áudios enviados", "9 hoje"],
  ["Agendamentos", "4 hoje"],
  ["Reuniões realizadas", "2 hoje"],
];

export function ProspecAttendancePreview() {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [activeConversation, setActiveConversation] = useState(0);
  const current = useMemo(() => conversations[activeConversation], [activeConversation]);

  return (
    <main className="prospec-app prospec-desktop-shell">
      <aside className="attendance-sidebar">
        <div className="prospec-brand attendance-brand">PROSPEC <strong>KR</strong></div>
        <button className="attendance-nav-item is-active">⌂ <span><strong>Atendimento</strong><small>Converse e avance</small></span></button>
        {['Início','Listas e Contatos','Modelos','Agendamentos','Relatórios','Chips','Configurações','Ajuda'].map((item) => (
          <button className="attendance-nav-item" key={item}>○ <span><strong>{item}</strong><small>Gerencie sua operação</small></span></button>
        ))}
        <section className="chip-health-card prospec-card">
          <p>SAÚDE DO CHIP ATUAL</p>
          <div className="chip-health-ring"><strong>82%</strong><span>Saudável</span></div>
          <div className="chip-health-progress"><span style={{ width: '40%' }} /></div>
          <div className="chip-health-progress"><span style={{ width: '45%' }} /></div>
          <button className="prospec-button-outline">Ver detalhes do chip</button>
        </section>
      </aside>

      <section className="attendance-main">
        <header className="attendance-topbar">
          <div><p className="eyebrow">ATENDIMENTO</p><span>Converse, envie mensagens e avance na prospecção</span></div>
          <div className="chip-switcher"><small>Chip ativo</small><button className="prospec-button-ghost">● Chip 02 · +55 47 9 8405-980</button><button className="prospec-button-outline">⇄ Trocar chip</button></div>
          <div className="attendance-user">⌕  ◔  ◌  <strong>Thainá Krause</strong></div>
        </header>

        <div className={`attendance-workspace ${detailsOpen ? '' : 'details-closed'}`}>
          <section className="conversation-list prospec-card">
            <div className="section-heading-row"><div><h2>CONVERSAS DO DIA</h2><small>15/05/2025</small></div><span>☰</span></div>
            <input className="attendance-search" placeholder="Buscar contato..." />
            <div className="attendance-tabs-row"><button className="is-active">Todas 32</button><button>Com resposta 12</button><button>Sem resposta 20</button></div>
            <div className="conversation-items">
              {conversations.map((conversation, index) => (
                <button key={conversation.name} className={`conversation-item ${index === activeConversation ? 'is-active' : ''}`} onClick={() => setActiveConversation(index)}>
                  <div className="prospec-avatar">{conversation.name.split(' ').map((part) => part[0]).slice(0,2).join('')}</div>
                  <span><strong>{conversation.name}</strong><small>{conversation.company}</small><em>{conversation.status}</em></span>
                  <span className="conversation-time">{conversation.time}{conversation.unread ? <b>{conversation.unread}</b> : null}</span>
                </button>
              ))}
            </div>
            <button className="prospec-button-primary full-width">Ver histórico completo</button>
          </section>

          <section className="chat-panel prospec-card">
            <div className="chat-header">
              <div className="prospec-avatar">CE</div>
              <div><h2>{current.name}</h2><p>+55 11 98765-4321 <span className="prospec-status prospec-status--warning">Bradesco Premium</span> <span className="prospec-status prospec-status--success">Primeira mensagem</span></p></div>
              <div className="chat-actions">☆ ☎ ⋮</div>
            </div>
            <div className="chat-timeline">
              <div className="message incoming">Bom dia! Recebi sua mensagem, pode me explicar melhor?<small>09:41</small></div>
              <div className="message outgoing">Bom dia, Carlos! Claro, posso sim te explicar.<small>09:41 ✓✓</small></div>
              <div className="message outgoing audio-message">▶ ▂▃▅▇▆▅▃▂▅▆▇▅▃▂▅▆▇▃▂ <small>00:27 · 09:42 ✓✓</small></div>
              <div className="message incoming">Entendi, faz sentido. Vamos agendar uma reunião?<small>09:43</small></div>
              <div className="message outgoing">Perfeito! Vou verificar alguns horários e te envio.<small>09:43 ✓✓</small></div>
            </div>
            <div className="audio-library">
              <div className="section-heading-row"><h3>Mensagem <span>Áudio</span></h3><span>⌃</span></div>
              <input className="attendance-search" placeholder="Buscar modelo de áudio..." />
              <div className="audio-tags"><button>Todos</button><button className="is-active">Primeira mensagem</button><button>Apresentação</button><button>Objeções</button><button>Follow-up</button></div>
              {[1,2,3,4,5].map((item) => <div className="audio-row" key={item}><button>▶</button><span>0{item} · Modelo de áudio</span><small>00:2{item + 3}</small><em>▂▅▇▆▃▅▇▂▃▆</em><b>☆ ⋮</b></div>)}
            </div>
            <div className="chat-composer"><button>☺</button><button>⌕</button><button>{'{NOME}'}</button><button>{'{EMPRESA}'}</button><div /><button className="prospec-button-primary">Enviar</button></div>
          </section>

          <aside className="contact-details prospec-card">
            <div className="section-heading-row"><h2>CARTÃO DO CONTATO</h2><button className="collapse-button" onClick={() => setDetailsOpen(false)}>⌃</button></div>
            <div className="contact-profile"><div className="contact-photo">CE</div><h2>{current.name}</h2><p>+55 11 98765-4321</p></div>
            <div className="contact-facts">
              <p><span>Empresa</span><strong>Silva Transportes Ltda</strong></p>
              <p><span>Cargo</span><strong>Diretor Financeiro</strong></p>
              <p><span>Origem</span><strong>Bradesco Premium</strong></p>
              <p><span>Status atual</span><strong className="prospec-status prospec-status--warning">Aguardando resposta</strong></p>
              <p><span>Próximo contato</span><strong>21/05/2025 · 14:00</strong></p>
            </div>
            <button className="prospec-button-primary full-width">Ver cartão completo →</button>
            <div className="details-block"><div className="section-heading-row"><h3>HISTÓRICO DE INTERAÇÕES</h3><small>Ver todos</small></div>{['Áudio enviado (00:27)','Mensagem enviada','Contato aberto'].map((item) => <div className="history-item" key={item}><span>◉</span><div><strong>15/05/2025 · 09:42</strong><small>{item}</small></div><b>✓</b></div>)}</div>
            <div className="details-block"><h3>AÇÕES RÁPIDAS</h3><div className="quick-actions">{['Agendar reunião','Adicionar lembrete','Transferir contato','Abrir no WhatsApp','Ver no CRM','Ver histórico completo'].map((item) => <button key={item}>{item}</button>)}</div></div>
          </aside>
          {!detailsOpen ? <button className="details-reopen" onClick={() => setDetailsOpen(true)}>›</button> : null}
        </div>

        <footer className="attendance-metrics">
          {metrics.map(([label, value]) => <div className="metric-strip" key={label}><span>{label}</span><strong>{value}</strong><div className="sparkline">⌁⌁⌁⌁⌁</div></div>)}
          <button className="prospec-button-outline">Ver relatórios completos</button>
        </footer>
      </section>
    </main>
  );
}
