import { useMemo, useState } from "react";

const stages = [
  { id: "first", title: "Primeira mensagem", color: "var(--prospec-orange-soft)" },
  { id: "audio", title: "Áudio enviado", color: "var(--prospec-green-light)" },
  { id: "waiting", title: "Aguardando resposta", color: "var(--prospec-yellow)" },
  { id: "interest", title: "Interesse", color: "var(--prospec-green)" },
  { id: "meeting", title: "Reunião agendada", color: "var(--prospec-cyan)" },
  { id: "contract", title: "Contrato enviado", color: "var(--prospec-red)" },
  { id: "client", title: "Cliente", color: "var(--prospec-green-light-soft)" },
];

const seedCards = [
  { id: "1", name: "Carlos Eduardo Silva", company: "Silva Transportes", stage: "first", owner: "Thainá", chip: "Chip 02", tag: "Bradesco" },
  { id: "2", name: "Juliana Martins", company: "JM Comércio", stage: "audio", owner: "Thainá", chip: "Chip 03", tag: "Itaú" },
  { id: "3", name: "Roberto Almeida", company: "Almeida & Filhos", stage: "waiting", owner: "Adv. Camila", chip: "Chip 01", tag: "Santander" },
  { id: "4", name: "Fernanda Costa", company: "Costa Serviços", stage: "interest", owner: "Adv. Júlia", chip: "Chip 04", tag: "Bradesco" },
  { id: "5", name: "Ricardo Oliveira", company: "RO Soluções", stage: "meeting", owner: "Adv. Camila", chip: "Chip 02", tag: "Itaú" },
  { id: "6", name: "Luciana Vieira", company: "Vieira Consultoria", stage: "contract", owner: "Adv. Júlia", chip: "Chip 03", tag: "Santander" },
  { id: "7", name: "Marcos Lima", company: "ML Logística", stage: "client", owner: "Thainá", chip: "Chip 01", tag: "Bradesco" },
];

export function ProspecFunnelPreview() {
  const [cards, setCards] = useState(seedCards);
  const [filter, setFilter] = useState("Todos");
  const visible = useMemo(() => filter === "Todos" ? cards : cards.filter((card) => card.tag === filter), [cards, filter]);

  const moveCard = (cardId: string, stage: string) => {
    setCards((current) => current.map((card) => card.id === cardId ? { ...card, stage } : card));
  };

  return (
    <main className="prospec-app funnel-shell">
      <aside className="attendance-sidebar">
        <div className="prospec-brand attendance-brand">PROSPEC <strong>KR</strong></div>
        {['Atendimento','Início','Funil','Listas e Contatos','Modelos','Agenda','Relatórios','Chips e Usuários'].map((item) => (
          <button key={item} className={`attendance-nav-item ${item === 'Funil' ? 'is-active' : ''}`}>◫ <span><strong>{item}</strong><small>Gestão operacional</small></span></button>
        ))}
      </aside>

      <section className="funnel-main">
        <header className="attendance-topbar funnel-topbar">
          <div><p className="eyebrow">FUNIL INTELIGENTE</p><span>Acompanhe contatos, avanço e conversão por etapa</span></div>
          <div className="funnel-filters">
            {['Todos','Bradesco','Itaú','Santander'].map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'is-active' : ''}>{item}</button>)}
          </div>
          <button className="prospec-button-primary">+ Novo funil</button>
        </header>

        <section className="funnel-metrics">
          {[
            ['Contatos ativos','142'],
            ['Taxa de resposta','61%'],
            ['Reuniões','28'],
            ['Contratos','11'],
            ['Conversão geral','7,7%'],
            ['Tempo médio','3,2 dias'],
          ].map(([label, value]) => <div className="prospec-card funnel-metric" key={label}><span>{label}</span><strong>{value}</strong><small>Atualizado agora</small></div>)}
        </section>

        <section className="funnel-board-wrap">
          <div className="funnel-board">
            {stages.map((stage) => {
              const stageCards = visible.filter((card) => card.stage === stage.id);
              return (
                <div key={stage.id} className="funnel-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveCard(event.dataTransfer.getData('text/plain'), stage.id)}>
                  <div className="funnel-column-head"><span style={{ background: stage.color }} /><div><strong>{stage.title}</strong><small>{stageCards.length} contato(s)</small></div></div>
                  <div className="funnel-column-body">
                    {stageCards.map((card) => (
                      <article draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} key={card.id} className="prospec-card funnel-card">
                        <div className="funnel-card-head"><div className="prospec-avatar">{card.name.split(' ').map((part) => part[0]).slice(0,2).join('')}</div><span><strong>{card.name}</strong><small>{card.company}</small></span></div>
                        <div className="funnel-card-tags"><span>{card.tag}</span><span>{card.chip}</span></div>
                        <p>Responsável: <strong>{card.owner}</strong></p>
                        <div className="funnel-card-footer"><small>Última interação hoje</small><button>⋮</button></div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="funnel-insights">
          <article className="prospec-card"><h3>Conversão por etapa</h3><div className="funnel-bars">{[78,65,51,42,31,18,11].map((value, index) => <div key={value}><span>{stages[index].title}</span><b><i style={{ width: `${value}%` }} /></b><strong>{value}%</strong></div>)}</div></article>
          <article className="prospec-card"><h3>Atividades recentes</h3>{cards.slice(0,5).map((card) => <div className="history-item" key={card.id}><span>◉</span><div><strong>{card.name}</strong><small>Movido no funil · {card.stage}</small></div><b>agora</b></div>)}</article>
        </section>
      </section>
    </main>
  );
}
