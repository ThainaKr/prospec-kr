const chips = [
  { name: 'Chip 01', number: '+55 47 98840-5980', mode: 'Saudável', reputation: 92, health: 88, response: '64%', meetings: 18, contracts: 7, restrictions: 0 },
  { name: 'Chip 02', number: '+55 47 98801-9154', mode: 'Aquecimento', reputation: 71, health: 76, response: '51%', meetings: 9, contracts: 3, restrictions: 1 },
  { name: 'Chip 03', number: '+55 81 99962-7648', mode: 'Atenção', reputation: 58, health: 62, response: '39%', meetings: 6, contracts: 1, restrictions: 2 },
];

const metrics = [
  ['Reputação média', '74'],
  ['Taxa de resposta', '51%'],
  ['Dias sem bloqueio', '28'],
  ['Chips em aquecimento', '1'],
];

export function ProspecChipIntelligencePreview() {
  return (
    <main className="prospec-app chip-intelligence-page">
      <header className="prospec-topbar">
        <div className="prospec-brand">PROSPEC <strong>KR</strong></div>
        <div className="prospec-page-heading"><h1>Inteligência de Chips</h1><p>Saúde, reputação, aquecimento e distribuição operacional.</p></div>
        <button className="prospec-button-outline">Configurar limites</button>
      </header>

      <section className="prospec-screen chip-intelligence-content">
        <div className="prospec-grid prospec-grid--metrics">
          {metrics.map(([label, value]) => <article className="prospec-card prospec-metric" key={label}><span className="prospec-metric__label">{label}</span><strong className="prospec-metric__value">{value}</strong><small className="prospec-metric__meta">Atualizado automaticamente</small></article>)}
        </div>

        <section className="chip-lab-grid">
          {chips.map((chip) => (
            <article className="prospec-card chip-lab-card" key={chip.name}>
              <div className="section-heading-row"><div><h2>{chip.name}</h2><small>{chip.number}</small></div><span className={`prospec-status ${chip.mode === 'Saudável' ? 'prospec-status--success' : chip.mode === 'Aquecimento' ? 'prospec-status--info' : 'prospec-status--warning'}`}>{chip.mode}</span></div>
              <div className="chip-score-row"><div className="chip-score-ring"><strong>{chip.reputation}</strong><span>reputação</span></div><div><p>Saúde atual <strong>{chip.health}%</strong></p><div className="chip-health-progress"><span style={{ width: `${chip.health}%` }} /></div><p>Taxa de resposta <strong>{chip.response}</strong></p></div></div>
              <div className="chip-stat-grid"><span><small>Reuniões</small><strong>{chip.meetings}</strong></span><span><small>Contratos</small><strong>{chip.contracts}</strong></span><span><small>Restrições</small><strong>{chip.restrictions}</strong></span><span><small>Dias de uso</small><strong>34</strong></span></div>
              <div className="chip-mini-chart" aria-label="Evolução da reputação"><span style={{height:'36%'}}/><span style={{height:'44%'}}/><span style={{height:'52%'}}/><span style={{height:'64%'}}/><span style={{height:'72%'}}/><span style={{height:`${chip.reputation}%`}}/></div>
              <div className="chip-card-actions"><button className="prospec-button-primary">Ver histórico</button><button className="prospec-button-ghost">Ajustar carga</button></div>
            </article>
          ))}
        </section>

        <section className="prospec-card chip-comparison-panel">
          <div className="section-heading-row"><div><h2>Comparativo entre chips</h2><small>Distribuição baseada em desempenho</small></div><button className="prospec-button-outline">Ver laboratório completo</button></div>
          <div className="chip-comparison-table">
            <div className="chip-comparison-header"><span>Chip</span><span>Resposta</span><span>Conversão</span><span>Risco</span><span>Peso</span></div>
            {chips.map((chip, index) => <div className="chip-comparison-row" key={chip.name}><strong>{chip.name}</strong><span>{chip.response}</span><span>{[29,18,11][index]}%</span><span>{chip.mode}</span><span>{[42,34,24][index]}%</span></div>)}
          </div>
        </section>

        <section className="prospec-card learning-panel">
          <div><p className="eyebrow">SISTEMA DE APRENDIZADO</p><h2>Recomendação automática</h2><p>Reduzir a carga do Chip 03 em 20% e ampliar o intervalo médio entre atendimentos. O Chip 01 pode receber maior participação na próxima distribuição.</p></div>
          <button className="prospec-button-primary">Aplicar recomendação</button>
        </section>
      </section>
    </main>
  );
}
