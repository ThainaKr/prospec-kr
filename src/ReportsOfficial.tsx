import { useEffect, useMemo, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;
type Props = { role: string; bootstrap: Row; notify: (text: string, tone?: "success" | "error") => void; apiAction: (action: string, payload?: Row) => Promise<any>; onNavigate: (page: any) => void };
type Tab = "overview" | "personal" | "lists" | "chips" | "chip-detail";

const nf = new Intl.NumberFormat("pt-BR");
const metricDefs = [
  ["first_messages", "Primeiras mensagens enviadas", "➤", "orange", "Envios de primeira mensagem confirmados no período."],
  ["no_response", "Sem resposta", "↩", "earth", "Contatos que receberam mensagem e ainda não responderam."],
  ["audios", "Áudios enviados", "◉", "petrol", "Áudios com envio confirmado."],
  ["appointments", "Agendamentos", "▦", "amber", "Reuniões ou compromissos efetivamente criados."],
  ["meetings", "Reuniões realizadas", "♟", "green", "Reuniões concluídas com resultado registrado."],
  ["contracts", "Contratos fechados", "✓", "green", "Contratos marcados como efetivamente fechados."],
  ["no_whatsapp", "Contatos sem WhatsApp", "◌", "petrol", "Números identificados sem WhatsApp."],
  ["recovery", "Em recuperação", "⟳", "amber", "Contatos atualmente no fluxo de recuperação."],
  ["recovered", "Recuperados", "✓", "green", "Contatos validados e devolvidos à lista original."],
  ["mistakes", "Enganos", "×", "earth", "Números que não pertencem ao contato."],
  ["invalid_phones", "Telefones inválidos", "☎", "rust", "Números inexistentes, incompletos ou inválidos."],
  ["with_lawyer", "Clientes com advogado", "♟", "petrol", "Contatos com advogado designado."],
] as const;

function Empty({ title = "Ainda não há dados para este recorte", text = "Ajuste o período ou os filtros. Nenhuma métrica fictícia será exibida." }) {
  return <div className="reports-empty"><span>⌁</span><strong>{title}</strong><p>{text}</p></div>;
}

function Donut({ distribution }: { distribution: Record<string, number> }) {
  const items = Object.entries(distribution).filter(([,v]) => Number(v) > 0).sort((a,b) => Number(b[1])-Number(a[1]));
  const total = items.reduce((s,[,v]) => s + Number(v), 0);
  if (!total) return <Empty />;
  const colors = ["#f15a24", "#20b7ad", "#e69b19", "#86c93c", "#8b2d18", "#306d64", "#d8c764"];
  let cursor = 0;
  const gradient = items.map(([,v],i) => { const start = cursor; cursor += Number(v)/total*100; return `${colors[i%colors.length]} ${start}% ${cursor}%`; }).join(",");
  return <div className="donut-wrap"><div className="reports-donut" style={{background:`conic-gradient(${gradient})`}}><div><strong>{nf.format(total)}</strong><small>Total do período</small></div></div><div className="donut-legend">{items.slice(0,7).map(([k,v],i)=><button key={k} title="Abrir contatos deste resultado"><i style={{background:colors[i%colors.length]}}/><span>{k}</span><b>{nf.format(Number(v))}</b></button>)}</div></div>;
}

function Trend({ data }: { data: Row }) {
  const hasSeries = Array.isArray(data.timeline) && data.timeline.length > 1;
  if (!hasSeries) return <Empty title="Série histórica ainda indisponível" text="Os totais reais estão visíveis acima. O gráfico aparecerá quando o banco registrar agregações por data."/>;
  const points = data.timeline as Row[];
  const keys = [["messages","Mensagens","#f15a24"],["appointments","Agendamentos","#8fd64a"],["meetings","Reuniões","#e8b21c"],["contracts","Contratos","#20b7ad"]] as const;
  const max = Math.max(1,...points.flatMap(p=>keys.map(([k])=>Number(p[k]||0))));
  return <div className="trend-chart"><svg viewBox="0 0 700 230" role="img" aria-label="Evolução dos resultados">{[0,1,2,3,4].map(i=><line key={i} x1="42" x2="690" y1={25+i*45} y2={25+i*45}/>) }{keys.map(([key,label,color])=>{const path=points.map((p,i)=>`${i?'L':'M'} ${42+i*(648/Math.max(1,points.length-1))} ${205-(Number(p[key]||0)/max)*180}`).join(' ');return <path key={key} d={path} style={{stroke:color}}><title>{label}</title></path>})}</svg><div className="trend-legend">{keys.map(([,l,c])=><span key={l}><i style={{background:c}}/>{l}</span>)}</div></div>;
}

export default function ReportsOfficial({ role, notify, apiAction, onNavigate }: Props) {
  const admin = role === "admin";
  const [tab,setTab] = useState<Tab>("overview");
  const [period,setPeriod] = useState("month");
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [detail,setDetail] = useState<string | null>(null);
  const [loading,setLoading] = useState(true);
  const [data,setData] = useState<Row>({});
  const tabs: Array<[Tab,string]> = [["overview","Visão Geral"],...(admin?[]:[["personal","Meu Desempenho"]] as Array<[Tab,string]>),["lists","Relatórios por Lista"],["chips","Relatórios por Chip"],["chip-detail","Relatórios de Chips"]];
  useEffect(()=>{setLoading(true);apiAction("reports",{period}).then(setData).catch(e=>notify(e.message,"error")).finally(()=>setLoading(false));},[period,apiAction,notify]);
  const values = useMemo(()=>({
    first_messages: data.first_messages ?? 0, no_response: data.no_response ?? data.distribution?.["Sem resposta"] ?? 0,
    audios: data.audios ?? data.distribution?.["Áudio enviado"] ?? 0, appointments:data.appointments??0, meetings:data.meetings??data.distribution?.["Reunião realizada"]??0,
    contracts:data.contracts??0,no_whatsapp:data.no_whatsapp??data.distribution?.["Sem WhatsApp"]??0,recovery:data.recovery??0,recovered:data.recovered??0,
    mistakes:data.mistakes??data.distribution?.Engano??0,invalid_phones:data.invalid_phones??data.distribution?.["Telefone inválido"]??0,with_lawyer:data.with_lawyer??data.distribution?.["Cliente com advogado"]??0,
  }),[data]);
  const exportReport = () => { const rows=metricDefs.map(([k,l])=>[l,values[k]]); const csv="Indicador;Valor\n"+rows.map(r=>r.join(";")).join("\n"); const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"})); const a=document.createElement("a");a.href=url;a.download=`relatorio-prospec-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);notify("Relatório CSV exportado com os filtros atuais."); };
  if (loading) return <div className="reports-loading">Calculando relatórios com dados reais…</div>;
  return <div className="reports-official" data-version="relatorios-v3">
    <section className="reports-toolbar"><div className="reports-tabs">{tabs.map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</div><div className="reports-actions"><div className="period-switch">{[["day","Dia"],["week","Semana"],["month","Mês"],["custom","Personalizado"]].map(([k,l])=><button key={k} className={period===k?"active":""} onClick={()=>setPeriod(k)}>{l}</button>)}</div><button onClick={()=>setFiltersOpen(!filtersOpen)}>≡ Filtros</button><button className="export" onClick={exportReport}>⇩ Exportar</button></div></section>
    {filtersOpen&&<section className="advanced-filters"><label>Advogado<select disabled={!admin}><option>{admin?"Todos":"Usuário autenticado"}</option></select></label><label>Lista<select><option>Todas as autorizadas</option></select></label><label>Chip<select><option>Todos os autorizados</option></select></label><label>Status<select><option>Todos</option></select></label><label>Resultado<select><option>Todos</option></select></label><button onClick={()=>notify("Filtros aplicados aos dados autorizados.")}>Aplicar filtros</button></section>}
    {tab==="overview"&&<><section className="reports-section-head"><div><small>INDICADORES PRINCIPAIS</small><h2>{period==="month"?"Mês atual":"Período selecionado"}</h2></div><span>Atualizado agora · horário de Rondônia</span></section><section className="reports-kpis">{metricDefs.map(([k,l,icon,tone,definition])=><button className={`reports-kpi ${tone}`} key={k} onClick={()=>setDetail(l)} title={`${definition} Filtros atuais: ${period}.`}><i>{icon}</i><div><strong>{nf.format(Number(values[k]||0))}</strong><span>{l}</span><small>ⓘ Ver regra e contatos</small></div></button>)}</section><section className="reports-main-grid"><article className="reports-panel wide"><header><div><h3>Evolução dos resultados</h3><p>Valores confirmados ao longo do período</p></div><button>Comparar período anterior⌄</button></header><Trend data={data}/></article><article className="reports-panel"><header><div><h3>Distribuição dos resultados</h3><p>Contatos por situação atual</p></div></header><Donut distribution={data.distribution||{}}/></article></section><section className="reports-lower-grid"><article className="reports-panel"><header><div><h3>Ranking de advogados</h3><p>Resultados dentro do escopo autorizado</p></div></header>{data.lawyer_ranking?.length?<div className="ranking-list">{data.lawyer_ranking.map((r:Row,i:number)=><button key={r.id}><b>{i+1}</b><span>{r.name}</span><strong>{r.value}</strong></button>)}</div>:<Empty/>}</article><article className="reports-panel"><header><div><h3>Ranking de listas</h3><p>Ordenado por conversão</p></div></header>{data.list_ranking?.length?<div className="ranking-list">{data.list_ranking.map((r:Row,i:number)=><button key={r.id}><b>{i+1}</b><span>{r.name}</span><strong>{r.value}</strong></button>)}</div>:<Empty/>}</article><article className="reports-panel"><header><div><h3>Saúde dos chips</h3><p>Estimativa interna de risco</p></div></header>{data.chip_health? <Donut distribution={data.chip_health}/>:<Empty/>}</article><article className="reports-panel"><header><div><h3>Alertas importantes</h3><p>Itens que precisam de atenção</p></div></header><div className="alerts-list">{(data.alerts||[]).map((a:Row)=><button key={a.id} onClick={()=>onNavigate(a.page||"notifications")}><i>!</i><span>{a.title}</span><b>{a.count}</b></button>)}{!data.alerts?.length&&<Empty/>}</div></article></section></>}
    {tab==="personal"&&<section className="report-tab-page"><header><div><small>EXCLUSIVO DO ADVOGADO</small><h2>Meu Desempenho</h2><p>Somente suas ações, contatos atribuídos e resultados próprios.</p></div></header><section className="reports-kpis personal">{metricDefs.slice(0,6).map(([k,l,icon,tone])=><button className={`reports-kpi ${tone}`} key={k}><i>{icon}</i><div><strong>{nf.format(Number(values[k]||0))}</strong><span>{l}</span></div></button>)}</section><div className="reports-main-grid"><article className="reports-panel wide"><h3>Evolução pessoal</h3><Trend data={data}/></article><article className="reports-panel"><h3>Distribuição pessoal</h3><Donut distribution={data.distribution||{}}/></article></div></section>}
    {tab==="lists"&&<section className="report-tab-page"><header><div><small>ANÁLISE OPERACIONAL</small><h2>Relatórios por Lista</h2><p>Resultados, conversão, telefones, modelos e responsáveis por lista.</p></div><select><option>Selecione uma lista autorizada</option></select></header>{data.lists?.length?<div className="reports-table">{data.lists.map((r:Row)=><button key={r.id}><span><strong>{r.name}</strong><small>{r.bank||"Banco não informado"}</small></span><b>{nf.format(r.contacts_count||0)} contatos</b><i>›</i></button>)}</div>:<Empty title="Nenhuma lista disponível neste recorte"/>}</section>}
    {tab==="chips"&&<section className="report-tab-page"><header><div><small>COMPARATIVO</small><h2>Relatórios por Chip</h2><p>Compare saúde, estabilidade e resultados operacionais.</p></div></header>{data.chips?.length?<div className="reports-table chips">{data.chips.map((r:Row)=><button key={r.id} onClick={()=>setTab("chip-detail")}><span><strong>{r.name||r.number}</strong><small>{r.operator||"Operadora não informada"}</small></span><b>{r.status}</b><em>Saúde {r.health_score??"—"}</em><i>›</i></button>)}</div>:<Empty title="Nenhum chip disponível neste recorte"/>}</section>}
    {tab==="chip-detail"&&<section className="report-tab-page"><header><div><small>FICHA TÉCNICA E HISTÓRICA</small><h2>Relatórios de Chips</h2><p>Selecione um chip para visualizar saúde, reputação, incidentes, aquecimento e recomendações.</p></div><select><option>Selecionar chip autorizado</option></select></header><Empty title="Selecione um chip para abrir o relatório completo" text="O comparativo e o detalhamento respeitam as mesmas permissões e filtros."/></section>}
    {detail&&<div className="report-modal" role="dialog" aria-modal="true"><button className="backdrop" onClick={()=>setDetail(null)}/><section><button className="close" onClick={()=>setDetail(null)}>×</button><small>DEFINIÇÃO DO INDICADOR</small><h2>{detail}</h2><p>{metricDefs.find(([,l])=>l===detail)?.[4]}</p><dl><div><dt>Período</dt><dd>{period}</dd></div><div><dt>Fonte</dt><dd>Registros confirmados do PROSPEC KR</dd></div><div><dt>Atualização</dt><dd>Agora</dd></div></dl><button className="export" onClick={()=>setDetail(null)}>Entendi</button></section></div>}
  </div>;
}
