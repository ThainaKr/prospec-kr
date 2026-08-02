const notificationGroups = [
  {
    title: "Retornos programados",
    count: 6,
    items: [
      ["Carlos Eduardo Silva", "Hoje · 14:00", "Chip 02", "Retorno solicitado após análise"],
      ["Juliana Martins", "Hoje · 15:30", "Chip 04", "Enviar opções de reunião"],
    ],
  },
  {
    title: "Retornar após áudio",
    count: 4,
    items: [
      ["Roberto Almeida", "Há 26h", "Chip 01", "Áudio enviado sem atualização"],
      ["Fernanda Costa", "Há 31h", "Chip 03", "Aguardando resposta"],
    ],
  },
  {
    title: "Agenda dos advogados",
    count: 3,
    items: [
      ["Dr. Matheus Moreira", "Reunião concluída", "11:00", "Abrir agenda"],
      ["Dra. Camila Prado", "Contrato fechado", "12:20", "Abrir contrato"],
    ],
  },
  {
    title: "Saúde dos chips",
    count: 2,
    items: [
      ["Chip 05", "Atenção", "73% de risco", "Reduzir carga e aplicar pausa"],
      ["Chip 08", "Restrito", "Nova ocorrência", "Revisar histórico completo"],
    ],
  },
];

export function ProspecNotificationsPreview() {
  return (
    <main className="prospec-app notifications-preview-shell">
      <aside className="attendance-sidebar notifications-sidebar">
        <div className="prospec-brand attendance-brand">PROSPEC <strong>KR</strong></div>
        {['Atendimento','Início','Listas e Contatos','Modelos','Agendamentos','Relatórios','Chips','Configurações'].map((item) => (
          <button className="attendance-nav-item" key={item}>○ <span><strong>{item}</strong><small>Gerencie sua operação</small></span></button>
        ))}
      </aside>
      <section className="notifications-main">
        <header className="notifications-header">
          <div>
            <p className="eyebrow">NOTIFICAÇÕES</p>
            <h1>Acompanhe tudo que precisa da sua atenção.</h1>
          </div>
          <span className="notifications-total">15 pendentes</span>
        </header>

        <div className="notifications-grid">
          {notificationGroups.map((group) => (
            <section className="prospec-card notification-group" key={group.title}>
              <div className="section-heading-row">
                <div>
                  <h2>{group.title}</h2>
                  <small>{group.count} pendência(s)</small>
                </div>
                <button className="collapse-button">⌄</button>
              </div>
              <div className="notification-items">
                {group.items.map((item) => (
                  <article className="notification-item" key={item[0] + item[1]}>
                    <div className="prospec-avatar">{item[0].split(' ').map((part) => part[0]).slice(0,2).join('')}</div>
                    <div>
                      <strong>{item[0]}</strong>
                      <span>{item[1]} · {item[2]}</span>
                      <small>{item[3]}</small>
                    </div>
                    <button className="prospec-button-outline">Abrir</button>
                  </article>
                ))}
              </div>
              <button className="prospec-button-ghost full-width">Ver todos</button>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
