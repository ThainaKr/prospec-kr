const reportMetrics = [
  ["Primeiras mensagens", "1.284", "+12,4%"],
  ["Taxa de resposta", "38,7%", "+4,8%"],
  ["Reuniões", "146", "+9,1%"],
  ["Contratos", "34", "+6,3%"],
  ["Em recuperação", "51", "-8,0%"],
  ["Chips saudáveis", "7 de 9", "+1"],
];

const lawyers = [
  ["Ana Paula", "42", "18", "7", "16,7%"],
  ["Mariana Lopes", "37", "15", "6", "16,2%"],
  ["Rafael Costa", "31", "11", "5", "16,1%"],
  ["Bruno Silva", "28", "10", "4", "14,3%"],
];

export function ProspecReportsPreview() {
  return (
    <main className="prospec-app report-shell">
      <aside className="attendance-sidebar">
        <div className="prospec-brand attendance-brand">PROSPEC <strong>KR</strong></div>
        {['Início','Atendimento','Funil','Agenda','Listas e Contatos','Modelos','Relatórios','Chips e Usuários'].map((item) => (
          <button key={item} className={`attendance-nav-item ${item === 'Relatórios' ? 'is-active' : ''}`}>
            ◈ <span><strong>{item}</strong><small>Visão operacional</small></span>
          </button>
        ))}
      </aside>

      <section className="report-main">
        <header className="report-header">
          <div><p className="eyebrow">RELATÓRIOS</p><h1>Visão Geral da Operação</h1><span>Acompanhe conversão, desempenho, recuperação e saúde dos chips.</span></div>
          <div className="report-filters"><button className="is-active">Dia</button><button>Semana</button><button>Mês</button><button>Período personalizado</button></div>
        </header>

        <section className="report-metric-grid">
          {reportMetrics.map(([label, value, delta]) => (
            <article className="report-metric-card prospec-card" key={label}>
              <span>{label}</span><strong>{value}</strong><small>{delta}</small><div className="report-sparkline">▁▂▂▃▄▅▆▅▇</div>
            </article>
          ))}
        </section>

        <section className="report-two-column">
          <article className="prospec-card report-panel">
            <div className="section-heading-row"><h2>Evolução da operação</h2><small>Últimos 30 dias</small></div>
            <div className="report-chart">
              <div style={{height:'48%'}} /><div style={{height:'63%'}} /><div style={{height:'58%'}} /><div style={{height:'75%'}} /><div style={{height:'69%'}} /><div style={{height:'84%'}} /><div style={{height:'92%'}} />
            </div>
            <div className="chart-legend"><span>Primeiras mensagens</span><span>Respostas</span><span>Reuniões</span><span>Contratos</span></div>
          </article>

          <article className="prospec-card report-panel">
            <div className="section-heading-row"><h2>Distribuição de resultados</h2><small>Hoje</small></div>
            <div className="donut-wrap"><div className="report-donut"><strong>1.284</strong><span>contatos</span></div></div>
            <ul className="result-list">
              <li><span>Sem resposta</span><b>42%</b></li><li><span>Áudio enviado</span><b>23%</b></li><li><span>Agendamento</span><b>11%</b></li><li><span>Reunião realizada</span><b>8%</b></li><li><span>Contrato fechado</span><b>3%</b></li>
            </ul>
          </article>
        </section>

        <section className="prospec-card report-panel">
          <div className="section-heading-row"><h2>Ranking dos advogados</h2><small>Conversão por período</small></div>
          <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Advogado</th><th>Agendamentos</th><th>Reuniões</th><th>Contratos</th><th>Conversão</th></tr></thead><tbody>{lawyers.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>
        </section>

        <section className="report-two-column">
          <article className="prospec-card report-panel"><div className="section-heading-row"><h2>Desempenho por lista</h2><small>Melhores resultados</small></div><div className="ranking-bars"><p><span>Bradesco Premium</span><b>74%</b></p><p><span>Santander PJ</span><b>66%</b></p><p><span>Itaú Empresas</span><b>58%</b></p><p><span>INSS</span><b>41%</b></p></div></article>
          <article className="prospec-card report-panel"><div className="section-heading-row"><h2>Saúde dos chips</h2><small>Distribuição atual</small></div><div className="health-summary"><div><strong>7</strong><span>Saudáveis</span></div><div><strong>1</strong><span>Atenção</span></div><div><strong>1</strong><span>Aquecimento</span></div><div><strong>0</strong><span>Bloqueados</span></div></div></article>
        </section>
      </section>
    </main>
  );
}
