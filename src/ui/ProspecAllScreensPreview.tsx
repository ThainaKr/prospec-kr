import { useMemo, useState } from "react";

/* eslint-disable @typescript-eslint/no-unused-vars */

type ScreenKey =
  | "admin-home"
  | "lawyer-home"
  | "lists"
  | "recovery"
  | "templates"
  | "agenda"
  | "notifications"
  | "admin-reports"
  | "lawyer-reports"
  | "chips-users"
  | "profile"
  | "settings";

const cards = {
  "admin-home": [
    ["Contatos ativos", "2.548", "+18,6%"],
    ["Reuniões hoje", "24", "+4"],
    ["Contratos", "152", "+13,4%"],
    ["Chips saudáveis", "7 de 9", "+1"],
  ],
  "lawyer-home": [
    ["Meus contatos", "328", "+12"],
    ["Retornos hoje", "18", "+3"],
    ["Reuniões", "7", "+2"],
    ["Conversão", "16,4%", "+2,1%"],
  ],
} as const;

const templates = [
  "Áudios",
  "Pós-áudio",
  "Agendamento",
  "Lembrete de reunião",
  "Pós-reunião",
  "Envio de contrato",
  "Follow-up",
  "Retorno",
  "Encerramento",
];

const contacts = [
  ["Mariana Lopes", "Santander", "Aguardando resposta"],
  ["Carlos Henrique", "Bradesco", "Áudio enviado"],
  ["Juliana Costa", "Itaú", "Reunião agendada"],
  ["Ricardo Oliveira", "Santander", "Em recuperação"],
];

function MetricGrid({ items }: { items: readonly (readonly [string, string, string])[] }) {
  return (
    <section className="all-screens-metrics">
      {items.map(([label, value, delta]) => (
        <article className="prospec-card premium-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{delta}</small>
          <div className="mini-glow-chart">▁▂▃▅▄▆▇</div>
        </article>
      ))}
    </section>
  );
}

function Sidebar({ active, onChange }: { active: ScreenKey; onChange: (key: ScreenKey) => void }) {
  const items: Array<[ScreenKey, string]> = [
    ["admin-home", "Início ADM"],
    ["lawyer-home", "Início Advogado"],
    ["lists", "Listas e Contatos"],
    ["recovery", "Recuperação"],
    ["templates", "Modelos"],
    ["agenda", "Agenda"],
    ["notifications", "Notificações"],
    ["admin-reports", "Relatórios ADM"],
    ["lawyer-reports", "Relatórios Advogado"],
    ["chips-users", "Chips e Usuários"],
    ["profile", "Perfil"],
    ["settings", "Configurações"],
  ];
  return (
    <aside className="attendance-sidebar all-screens-sidebar">
      <div className="prospec-brand attendance-brand">PROSPEC <strong>KR</strong></div>
      {items.map(([key, label]) => (
        <button key={key} className={`attendance-nav-item ${active === key ? "is-active" : ""}`} onClick={() => onChange(key)}>
          ◈ <span><strong>{label}</strong><small>Tela oficial</small></span>
        </button>
      ))}
    </aside>
  );
}

function AdminHome() {
  return <><MetricGrid items={cards["admin-home"]} /><section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>Resumo da operação</h2><div className="large-glow-chart">▁▂▃▄▃▅▆▇▆</div></article><article className="prospec-card premium-card panel"><h2>Atividades recentes</h2>{contacts.map((row) => <p key={row[0]}><strong>{row[0]}</strong><span>{row[2]}</span></p>)}</article></section></>;
}

function LawyerHome() {
  return <><MetricGrid items={cards["lawyer-home"]} /><section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>Minha agenda</h2>{["09:00 · Carlos Henrique", "11:30 · Juliana Costa", "15:00 · Mariana Lopes"].map((item) => <p key={item}>{item}</p>)}</article><article className="prospec-card premium-card panel"><h2>Meu desempenho</h2><div className="donut-3d"><strong>16,4%</strong><span>conversão</span></div></article></section></>;
}

function ListsAndContacts() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel"><div className="section-heading-row"><h2>Listas</h2><button className="prospec-button-primary">Importar planilha</button></div>{["Bradesco Premium", "Santander PJ", "Itaú Empresas"].map((item, i) => <div className="list-row" key={item}><strong>{item}</strong><span>{[742, 568, 356][i]} contatos</span><button>Configurar</button></div>)}</article><article className="prospec-card premium-card panel"><div className="section-heading-row"><h2>Contatos</h2><input className="attendance-search" placeholder="Buscar contato..." /></div>{contacts.map((row) => <div className="contact-line" key={row[0]}><span className="prospec-avatar">{row[0].split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{row[0]}</strong><small>{row[1]}</small></div><em>{row[2]}</em></div>)}</article></section>;
}

function Recovery() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>Fila de recuperação</h2>{contacts.slice(1).map((row, i) => <div className="recovery-card" key={row[0]}><strong>{row[0]}</strong><span>Todos os números esgotados</span><small>Origem: {row[1]}</small><button className="prospec-button-outline">Abrir no Telegram</button></div>)}</article><article className="prospec-card premium-card panel"><h2>Histórico de recuperação</h2><div className="large-glow-chart">▁▁▂▃▄▅▆▅▇</div><p>Recuperados: 51</p><p>Em validação: 18</p><p>Retornaram à fila: 39</p></article></section>;
}

function Templates() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>Biblioteca de modelos</h2>{templates.map((item, i) => <div className="list-row" key={item}><strong>{item}</strong><span>{i < 2 ? 100 : 0} modelos</span><button>Novo modelo</button></div>)}</article><article className="prospec-card premium-card panel"><h2>Editor</h2><input className="attendance-search" placeholder="Nome do modelo" /><textarea className="model-editor" defaultValue="Olá, {NOME}. Tenho uma informação sobre {EMPRESA}." /><div className="token-row"><button>{"{NOME}"}</button><button>{"{EMPRESA}"}</button></div><button className="prospec-button-primary">Salvar modelo</button></article></section>;
}

function Agenda() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel calendar-panel"><h2>Agenda mensal</h2><div className="calendar-grid">{Array.from({ length: 35 }, (_, i) => <span className={i === 15 || i === 21 ? "has-event" : ""} key={i}>{(i % 31) + 1}</span>)}</div></article><article className="prospec-card premium-card panel"><h2>Próximas reuniões</h2>{["09:00 · Carlos Henrique", "11:30 · Juliana Costa", "15:00 · Mariana Lopes", "17:20 · Ricardo Oliveira"].map((item) => <p key={item}>{item}</p>)}</article></section>;
}

function Notifications() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>Retornos programados</h2>{contacts.map((row) => <div className="notification-row" key={row[0]}><div><strong>{row[0]}</strong><small>{row[1]} · Hoje 14:00</small></div><button>Abrir</button></div>)}</article><article className="prospec-card premium-card panel"><h2>Saúde dos chips</h2>{["Chip 02 · Atenção", "Chip 05 · Saudável", "Chip 08 · Aquecimento"].map((item) => <p key={item}>{item}</p>)}</article></section>;
}

function Reports({ lawyer = false }: { lawyer?: boolean }) {
  return <><MetricGrid items={lawyer ? cards["lawyer-home"] : cards["admin-home"]} /><section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>{lawyer ? "Meu desempenho" : "Visão geral da operação"}</h2><div className="large-glow-chart">▁▂▃▄▅▄▆▇▆</div></article><article className="prospec-card premium-card panel"><h2>{lawyer ? "Minha conversão" : "Distribuição de resultados"}</h2><div className="donut-3d"><strong>{lawyer ? "16,4%" : "13,4%"}</strong><span>taxa geral</span></div></article></section></>;
}

function ChipsUsers() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>Chips</h2>{["Chip 02 · Saudável · 82%", "Chip 05 · Atenção · 68%", "Chip 08 · Aquecimento · 41%"].map((item) => <div className="list-row" key={item}><strong>{item}</strong><button>Detalhes</button></div>)}</article><article className="prospec-card premium-card panel"><h2>Usuários</h2>{["Thainá Krause · Administradora", "Ana Paula · Advogada", "Mariana Lopes · Advogada"].map((item) => <div className="list-row" key={item}><strong>{item}</strong><button>Editar</button></div>)}<button className="prospec-button-primary">Convidar por e-mail</button></article></section>;
}

function Profile() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel profile-panel"><div className="contact-photo">TK</div><h2>Thainá Krause</h2><p>Administradora</p><button className="prospec-button-outline">Editar perfil</button></article><article className="prospec-card premium-card panel"><h2>Preferências</h2><div className="list-row"><strong>Notificações</strong><button>Ativadas</button></div><div className="list-row"><strong>Fuso horário</strong><span>America/Porto_Velho</span></div><div className="list-row"><strong>Tema</strong><span>Escuro premium</span></div></article></section>;
}

function Settings() {
  return <section className="all-screens-grid"><article className="prospec-card premium-card panel"><h2>Configurações gerais</h2>{["Permissões", "Integrações", "Políticas de distribuição", "Pausas inteligentes", "Backup e auditoria"].map((item) => <div className="list-row" key={item}><strong>{item}</strong><button>Configurar</button></div>)}</article><article className="prospec-card premium-card panel"><h2>Regras visuais</h2><p>Paleta oficial ativa</p><p>Brilho premium ativo</p><p>Modo responsivo ativo</p><p>Contraste reforçado ativo</p></article></section>;
}

export function ProspecAllScreensPreview() {
  const [active, setActive] = useState<ScreenKey>("admin-home");
  const title = useMemo(() => ({
    "admin-home": "Início da Administradora",
    "lawyer-home": "Início do Advogado",
    lists: "Listas e Contatos",
    recovery: "Recuperação de Contatos",
    templates: "Modelos de Mensagens",
    agenda: "Agenda",
    notifications: "Notificações",
    "admin-reports": "Relatórios da Administradora",
    "lawyer-reports": "Relatórios do Advogado",
    "chips-users": "Chips e Usuários",
    profile: "Perfil",
    settings: "Configurações",
  } satisfies Record<ScreenKey, string>)[active], [active]);

  return (
    <main className="prospec-app all-screens-shell">
      <Sidebar active={active} onChange={setActive} />
      <section className="all-screens-main">
        <header className="all-screens-header">
          <div><p className="eyebrow">PROSPEC KR</p><h1>{title}</h1><span>Conjunto visual completo das telas aprovadas.</span></div>
          <div className="all-screens-actions"><button className="prospec-button-ghost">Prévia</button><button className="prospec-button-primary">Tela concluída</button></div>
        </header>
        <div className="all-screens-content">
          {active === "admin-home" && <AdminHome />}
          {active === "lawyer-home" && <LawyerHome />}
          {active === "lists" && <ListsAndContacts />}
          {active === "recovery" && <Recovery />}
          {active === "templates" && <Templates />}
          {active === "agenda" && <Agenda />}
          {active === "notifications" && <Notifications />}
          {active === "admin-reports" && <Reports />}
          {active === "lawyer-reports" && <Reports lawyer />}
          {active === "chips-users" && <ChipsUsers />}
          {active === "profile" && <Profile />}
          {active === "settings" && <Settings />}
        </div>
      </section>
    </main>
  );
}
