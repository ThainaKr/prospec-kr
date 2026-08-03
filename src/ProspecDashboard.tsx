"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from "react";
import AgendaOfficial from "./AgendaOfficial";
import ListsContactsOfficial from "./ListsContactsOfficial";
import TemplatesOfficial from "./TemplatesOfficial";
import ReportsOfficial from "./ReportsOfficial";
import ChipsUsersOfficial from "./ChipsUsersOfficial";
import NotificationsOfficial from "./NotificationsOfficial";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import { buildWhatsAppOpeningUrl, openingMethodLabel } from "./whatsappOpening";

type PageKey =
  | "home"
  | "funnel"
  | "notifications"
  | "agenda"
  | "lists"
  | "templates"
  | "reports"
  | "chips-users"
  | "settings"
  | "profile";

type AnyRecord = Record<string, any>;

const PAGE_PATHS: Record<PageKey, string> = {
  home: "inicio",
  funnel: "funil",
  notifications: "notificacoes",
  agenda: "agenda",
  lists: "listas-contatos",
  templates: "modelos-mensagens",
  reports: "relatorios",
  "chips-users": "chips-usuarios",
  settings: "configuracoes",
  profile: "meu-perfil",
};

function pageFromLocation(): PageKey {
  const segment = window.location.hash.replace(/^#\/?/, "").split("/")[0];
  const match = (Object.entries(PAGE_PATHS) as Array<[PageKey, string]>).find(
    ([, path]) => path === segment,
  );
  return match?.[0] || "home";
}

const ADMIN_NAV: Array<[PageKey, string, string]> = [
  ["home", "Início", "⌂"],
  ["funnel", "Funis", "▽"],
  ["notifications", "Notificações", "●"],
  ["agenda", "Agenda", "▦"],
  ["lists", "Listas", "☷"],
  ["reports", "Relatórios", "▥"],
  ["chips-users", "Chips e Usuários", "◉"],
];

const LAWYER_NAV: Array<[PageKey, string, string]> = [
  ["home", "Início", "⌂"],
  ["funnel", "Funis", "▽"],
  ["notifications", "Notificações", "●"],
  ["agenda", "Agenda", "▦"],
  ["lists", "Listas", "☷"],
  ["reports", "Relatórios", "▥"],
  ["profile", "Mais", "•••"],
];

const TEMPLATE_CATEGORIES = [
  ["first_message", "1ª Mensagem"],
  ["audio", "Áudios"],
  ["post_audio", "Pós-áudio"],
  ["scheduling", "Agendamento"],
  ["meeting_reminder", "Lembrete de reunião"],
  ["post_meeting", "Pós-reunião"],
  ["contract_sending", "Envio de contrato"],
  ["follow_up", "Follow-up"],
  ["post_meeting_follow_up", "Follow-up pós reunião"],
  ["return", "Retorno"],
  ["closing", "Encerramento"],
];

const RESULT_OPTIONS = [
  "Sem resposta",
  "Áudio enviado",
  "Agendamento",
  "Reunião realizada",
  "Contrato fechado",
  "Sem WhatsApp",
  "Telefone inválido",
  "Engano",
  "Cliente com advogado",
  "Retornar depois",
];

async function api(action: string, payload: AnyRecord = {}) {
  const { data, error } = await supabase.functions.invoke("prospec-api", {
    body: { action, payload },
  });
  if (error) {
    let message = error.message || "Não foi possível concluir.";
    const context = (error as AnyRecord).context;
    if (context instanceof Response) {
      try {
        const body = await context.json();
        message = body.error || message;
      } catch {
        // Mantém a mensagem original quando a resposta não for JSON.
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data?.data;
}

function formatDate(value?: string, withTime = true) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "America/Porto_Velho",
  }).format(new Date(value));
}

function firstWord(value?: string) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function titleCaseFirst(value?: string) {
  const clean = String(value || "").trim().toLocaleLowerCase("pt-BR");
  return clean ? clean.charAt(0).toLocaleUpperCase("pt-BR") + clean.slice(1) : "";
}

function maskCpf(value?: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return value || "CPF não informado";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

function normalizePhone(value?: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function substituteTemplate(body: string, contact: AnyRecord) {
  return body
    .replaceAll("{NOME}", contact.first_name || firstWord(contact.full_name))
    .replaceAll("{nome}", contact.first_name || firstWord(contact.full_name))
    .replaceAll(
      "{EMPRESA}",
      contact.company_first_name || firstWord(contact.company),
    )
    .replaceAll(
      "{empresa}",
      contact.company_first_name || firstWord(contact.company),
    );
}

function Toast({
  message,
  tone = "success",
  onClose,
}: {
  message: string;
  tone?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return (
    <button className={`toast ${tone}`} onClick={onClose}>
      {message}
    </button>
  );
}

function LoadingBlock({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({
  icon = "◇",
  title,
  text,
}: {
  icon?: string;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function Header({
  title,
  subtitle,
  onMenu,
  badge,
}: {
  title: string;
  subtitle: string;
  onMenu: () => void;
  badge?: number;
}) {
  return (
    <header className="app-header">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Abrir menu">
        ☰
      </button>
      <div className="header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-logo" aria-label="PROSPEC KR">
        <span>KR</span>
        {badge ? <b>{badge > 99 ? "99+" : badge}</b> : null}
      </div>
    </header>
  );
}

function HomeView({
  bootstrap,
  onNavigate,
}: {
  bootstrap: AnyRecord;
  onNavigate: (page: PageKey) => void;
}) {
  const [selectedConversation, setSelectedConversation] = useState(0);
  const [composerTab, setComposerTab] = useState<"message" | "audio">("audio");
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [contactCardOpen, setContactCardOpen] = useState(true);
  const profileName = bootstrap.profile?.full_name || "Thainá Krause";
  const conversations = [
    { name: "Carlos Eduardo Silva", company: "Bradesco Premium", time: "09:42", state: "Primeira mensagem enviada", tone: "green", unread: 2, initials: "CE" },
    { name: "Juliana Martins", company: "Itaú Empresas", time: "09:41", state: "Aguardando resposta", tone: "orange", unread: 1, initials: "JM" },
    { name: "Roberto Almeida", company: "Santander PJ", time: "09:40", state: "Aguardando resposta", tone: "orange", unread: 0, initials: "RA" },
    { name: "Fernanda Costa", company: "Bradesco Premium", time: "09:36", state: "Áudio enviado", tone: "petrol", unread: 0, initials: "FC" },
    { name: "Ricardo Oliveira", company: "Itaú Empresas", time: "09:30", state: "Follow-up", tone: "red", unread: 0, initials: "RO" },
    { name: "Amanda Souza", company: "Santander PJ", time: "09:25", state: "Primeira mensagem enviada", tone: "green", unread: 1, initials: "AS" },
  ];
  const current = conversations[selectedConversation];
  const audioModels = [
    ["01 - Saudação e apresentação", "00:28"],
    ["02 - Apresentação do serviço", "00:31"],
    ["03 - Quebra de objeção", "00:25"],
    ["04 - Agendamento de reunião", "00:28"],
    ["05 - Follow-up", "00:26"],
  ];
  const kpis = [
    ["Primeiras mensagens", "18 / 40", "45%", "orange"],
    ["Com resposta", "12 / 18", "66,7%", "green"],
    ["Sem resposta", "6 / 18", "33,3%", "amber"],
    ["Áudios enviados", "9", "Hoje", "petrol"],
    ["Agendamentos", "4", "Hoje", "yellow"],
    ["Reuniões realizadas", "2", "Hoje", "rust"],
    ["Contratos", "1", "Hoje", "success"],
  ];

  return (
    <div className="operations-home">
      <aside className={`operations-sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="operations-brand"><i>PROSPEC</i><b>KR</b><button onClick={() => setMobileMenu(false)}>×</button></div>
        <nav>
          <button className="active"><span>⌂</span><b>Atendimento<small>Converse e avance</small></b></button>
          <button onClick={() => onNavigate("home")}><span>⌂</span><b>Início<small>Visão geral</small></b></button>
          <button onClick={() => onNavigate("funnel")}><span>▽</span><b>Funis<small>Etapas e conversões</small></b></button>
          <button onClick={() => onNavigate("lists")}><span>♙</span><b>Listas e Contatos<small>Suas listas e leads</small></b></button>
          <button onClick={() => onNavigate("templates")}><span>▤</span><b>Modelos<small>Mensagens e áudios</small></b></button>
          <button onClick={() => onNavigate("agenda")}><span>▦</span><b>Agenda<small>Compromissos</small></b></button>
          <button onClick={() => onNavigate("reports")}><span>▥</span><b>Relatórios<small>Desempenho</small></b></button>
          <button onClick={() => onNavigate("chips-users")}><span>◉</span><b>Chips<small>Gerencie seus chips</small></b></button>
          <button onClick={() => onNavigate("settings")}><span>⚙</span><b>Configurações<small>Preferências</small></b></button>
          <button><span>?</span><b>Ajuda<small>Central de suporte</small></b></button>
        </nav>
        <section className="chip-health-card">
          <h3>SAÚDE DO CHIP ATUAL</h3>
          <div className="health-gauge"><strong>82%</strong><small>Saudável</small></div>
          <label>Mensagens hoje <b>32 / 80</b><i><em style={{ width: "40%" }} /></i></label>
          <label>1ª mensagens <b>18 / 40</b><i><em style={{ width: "45%" }} /></i></label>
          <label>Follow-up <b>8 / 20</b><i><em style={{ width: "40%" }} /></i></label>
          <label>Tempo ativo <b>5h 24min</b><i><em style={{ width: "68%" }} /></i></label>
          <button onClick={() => onNavigate("chips-users")}>Ver detalhes do chip</button>
        </section>
      </aside>
      {mobileMenu ? <button className="operations-backdrop" onClick={() => setMobileMenu(false)} /> : null}

      <section className="operations-main">
        <header className="operations-topbar">
          <button className="operations-menu-button" onClick={() => setMobileMenu(true)}>☰</button>
          <div className="mobile-operations-brand"><i>PROSPEC</i><b>KR</b></div>
          <div className="active-chip"><small>Chip ativo</small><button><i /> <b>Chip 02</b><span>+55 47 9 8405-980</span>⌄</button></div>
          <button className="switch-chip">⇄ <span>Trocar chip</span></button>
          <div className="topbar-spacer" />
          <button className="topbar-icon">⌕</button><button className="topbar-icon notification-dot">♧</button>
          <button className="profile-button"><span className="avatar small-avatar">TK</span><b>{profileName}<small>Administradora</small></b>⌄</button>
        </header>

        <div className="operations-workspace">
          <section className="conversation-column">
            <header><p>ATENDIMENTO</p><h2>CONVERSAS DO DIA</h2><button>≡</button></header>
            <div className="conversation-filters"><input type="date" defaultValue="2025-05-15"/><input placeholder="⌕  Buscar contato..."/><div><button className="active">Todas <b>32</b></button><button>Com resposta <b>12</b></button><button>Sem resposta <b>20</b></button></div><div className="secondary-conversation-filters"><button>Áudio enviado</button><button>Primeira mensagem</button><button>Agendamento</button></div></div>
            <div className="conversation-list">
              {conversations.map((item, index) => <button key={item.name} className={selectedConversation === index ? "selected" : ""} onClick={() => setSelectedConversation(index)}><span className={`avatar tone-${item.tone}`}>{item.initials}</span><span><strong>{item.name}</strong><small>{item.company}</small><em className={`tone-${item.tone}`}>◆ {item.state}</em></span><time>{item.time}</time>{item.unread ? <b>{item.unread}</b> : <i>✓</i>}</button>)}
            </div>
            <button className="full-history">Ver histórico completo</button>
          </section>

          <section className="professional-chat">
            <header className="chat-contact-header"><span className="avatar tone-orange">{current.initials}</span><div><h2>{current.name}</h2><p>+55 11 98765-4321 <b>{current.company}</b><em>Primeira mensagem</em></p></div><div><button>☆</button><button>⌕</button><button>⋮</button></div></header>
            <div className="chat-messages"><span className="day-marker">Hoje</span><div className="incoming-message"><b className="avatar tiny-avatar">CE</b><p>Bom dia! Recebi sua mensagem, pode me explicar melhor?<small>09:41</small></p></div><div className="outgoing-message"><p>Bom dia, Carlos! Claro, posso sim te explicar.<small>09:41 ✓✓</small></p></div><div className="outgoing-message audio-bubble"><button>▶</button><div><i className="waveform"/><small>00:27</small></div><time>09:42 ✓✓</time></div><div className="incoming-message"><b className="avatar tiny-avatar">CE</b><p>Entendi, faz sentido. Vamos agendar uma reunião?<small>09:43</small></p></div><div className="outgoing-message"><p>Perfeito! Vou verificar alguns horários e te envio.<small>09:43 ✓✓</small></p></div></div>
            <section className="chat-composer">
              <div className="composer-tabs"><button className={composerTab === "message" ? "active" : ""} onClick={() => setComposerTab("message")}>Mensagem</button><button className={composerTab === "audio" ? "active" : ""} onClick={() => setComposerTab("audio")}>Áudio</button></div>
              {composerTab === "audio" ? <div className="audio-library"><div className="audio-models"><input placeholder="⌕  Buscar modelo de áudio..."/><div className="audio-categories"><button>Todos</button><button className="active">Primeira mensagem</button><button>Apresentação</button><button>Objeções</button><button>Agendamento</button><button>Follow-up</button><button>Encerramento</button></div>{audioModels.map(([name,duration]) => <button className="audio-model" key={name}><span>▶</span><b>{name}</b><small>{duration}</small><i className="mini-wave"/>☆ ⋮</button>)}</div><div className="record-audio"><span className="record-microphone"/><strong>Gravar áudio</strong><small>ou selecione um arquivo<br/>Formatos: MP3, M4A, OGG</small><button>Selecionar arquivo</button></div></div> : <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Digite sua mensagem..."/>}
              <div className="composer-actions"><button>☺</button><button>⌕</button><button onClick={() => setMessage((value) => `${value}{NOME}`)}>{'{NOME}'}</button><button onClick={() => setMessage((value) => `${value}{EMPRESA}`)}>{'{EMPRESA}'}</button><span/><button className="send-message">Enviar ▾</button><button className="send-icon">➤</button></div>
            </section>
          </section>

          <aside className="client-panel">
            <section className={`contact-card-panel ${contactCardOpen ? "expanded" : "collapsed"}`}><header>CARTÃO DO CONTATO <button aria-label={contactCardOpen ? "Fechar cartão do contato" : "Abrir cartão do contato"} aria-expanded={contactCardOpen} onClick={() => setContactCardOpen((open) => !open)}>{contactCardOpen ? "⌃" : "⌄"}</button></header>{contactCardOpen ? <div className="contact-card-content"><div className="contact-portrait"><span className="avatar large-avatar tone-orange">{current.initials}</span><span className="whatsapp-badge">◉</span><h2>{current.name}</h2><p>+55 11 98765-4321</p></div><dl><div><dt>▤ Empresa</dt><dd>Silva Transportes Ltda</dd></div><div><dt>♙ Cargo</dt><dd>Diretor Financeiro</dd></div><div><dt>⌂ Origem</dt><dd>Bradesco Premium · 20/05/2024</dd></div><div><dt>◇ Status atual</dt><dd><em>Aguardando resposta</em></dd></div><div><dt>▦ Próximo contato</dt><dd>21/05/2025 · 14:00</dd></div></dl><button className="view-contact">Ver cartão completo →</button></div> : null}</section>
            <section className="interaction-history"><header>HISTÓRICO DE INTERAÇÕES <button>Ver todos</button></header>{[["♩","Áudio enviado (00:27)","09:42"],["▤","Mensagem enviada","09:41"],["▣","Contato aberto","09:41"]].map(([icon,label,time]) => <div key={label}><span>{icon}</span><p><small>15/05/2025 · {time}</small>{label}</p><b>✓</b></div>)}</section>
            <section className="quick-actions"><header>AÇÕES RÁPIDAS</header><div><button>▦ Agendar reunião</button><button>♧ Adicionar lembrete</button><button>⇄ Transferir contato</button><button>◉ Abrir WhatsApp</button><button>♙ Ver no CRM</button><button>◷ Histórico completo</button></div></section>
          </aside>
        </div>

        <footer className="operations-kpis">{kpis.map(([label,value,detail,tone], index) => <article className={`kpi-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small><svg className="kpi-sparkline" viewBox="0 0 150 30" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={`spark-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".34"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d="M0 25 C8 25 8 18 16 20 S27 26 34 19 S45 12 52 21 S64 27 72 17 S83 10 91 20 S102 26 111 16 S124 10 132 19 S143 23 150 14 L150 30 L0 30Z" fill={`url(#spark-${index})`} stroke="none"/><path d="M0 25 C8 25 8 18 16 20 S27 26 34 19 S45 12 52 21 S64 27 72 17 S83 10 91 20 S102 26 111 16 S124 10 132 19 S143 23 150 14"/></svg></article>)}<button onClick={() => onNavigate("reports")}>▥ Ver relatórios completos</button></footer>
      </section>
    </div>
  );
}

function ListsView({
  bootstrap,
  notify,
  refreshBootstrap,
}: {
  bootstrap: AnyRecord;
  notify: (text: string, tone?: "success" | "error") => void;
  refreshBootstrap: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"lists" | "contacts" | "recovery">("lists");
  const [listId, setListId] = useState("");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<AnyRecord[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [recovery, setRecovery] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({});
  const [importPreview, setImportPreview] = useState<AnyRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const textFrom = (row: AnyRecord, names: string[]) => {
    const normalized = Object.entries(row).reduce<AnyRecord>((acc, [key, value]) => {
      acc[key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()] = value;
      return acc;
    }, {});
    for (const name of names) {
      const value = normalized[name];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return "";
  };

  const prepareSpreadsheet = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const lists = workbook.SheetNames.map((sheetName) => {
        const rows = XLSX.utils.sheet_to_json<AnyRecord>(workbook.Sheets[sheetName], {
          defval: "",
          raw: false,
        });
        const contacts = rows
          .map((row, rowIndex) => {
            const fullName = textFrom(row, ["nome", "nome completo", "cliente"]);
            const cpf = textFrom(row, ["cpf", "documento"]).replace(/\D/g, "");
            const company = textFrom(row, [
              "empresa",
              "banco",
              "instituicao",
              "instituicao financeira",
            ]);
            const result = textFrom(row, ["resultado", "status", "tag", "situacao"]);
            const phones = [
              textFrom(row, ["telefone", "telefone 1", "celular", "whatsapp"]),
              textFrom(row, ["telefone 2", "celular 2", "whatsapp 2"]),
              textFrom(row, ["telefone 3", "celular 3", "whatsapp 3"]),
            ].filter(Boolean);
            if (!fullName && !cpf && !phones.length) return null;
            return {
              fullName: fullName || `Contato ${rowIndex + 2}`,
              cpf,
              company,
              phones,
              result,
              sourceRow: rowIndex + 2,
              sourcePayload: row,
              recovery:
                /sem\s*whats|sem\s*wpp|no\s*whatsapp/i.test(result) ||
                /sem\s*whats|sem\s*wpp/i.test(sheetName),
            };
          })
          .filter(Boolean)
          .filter((contact: any) => {
            if (contact.recovery) return true;
            const result = String(contact.result || "").trim();
            return !result || /retorn|sem resposta|vácuo|vacuo|mandei 1.*msg/i.test(result);
          });
        return { name: sheetName.trim(), contacts };
      }).filter((list) => list.contacts.length);
      const total = lists.reduce((sum, list) => sum + list.contacts.length, 0);
      const recovery = lists.reduce(
        (sum, list) => sum + list.contacts.filter((contact: any) => contact.recovery).length,
        0,
      );
      if (!total) throw new Error("Nenhum contato reconhecido na planilha.");
      setImportPreview({ fileName: file.name, lists, total, recovery });
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Não foi possível ler a planilha.",
        "error",
      );
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const result = await api("import_spreadsheet", { lists: importPreview.lists });
      notify(
        `Importação concluída: ${result.created} novo(s), ${result.updated} atualizado(s) e ${result.recovery} em Recuperação.`,
      );
      setImportPreview(null);
      await refreshBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha na importação.", "error");
    } finally {
      setImporting(false);
    }
  };

  const exportSpreadsheet = async () => {
    setExporting(true);
    try {
      const data = await api("export_spreadsheet");
      const workbook = XLSX.utils.book_new();
      for (const list of data.lists || []) {
        const sheet = XLSX.utils.json_to_sheet(list.rows || []);
        XLSX.utils.book_append_sheet(
          workbook,
          sheet,
          String(list.name || "Lista").replace(/[\\/?*[\]:]/g, " ").slice(0, 31),
        );
      }
      XLSX.writeFile(
        workbook,
        `PROSPEC_KR_atualizado_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      notify("Planilha atualizada exportada.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha na exportação.", "error");
    } finally {
      setExporting(false);
    }
  };

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("contacts", { listId, search });
      setContacts(data.contacts || []);
      setContactCount(data.count || 0);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
    } finally {
      setLoading(false);
    }
  }, [listId, search, notify]);

  const loadRecovery = useCallback(async () => {
    setLoading(true);
    try {
      setRecovery((await api("recovery")) || []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (tab === "contacts") loadContacts();
    if (tab === "recovery") loadRecovery();
  }, [tab, loadContacts, loadRecovery]);

  const openTelegram = async (item: AnyRecord) => {
    const cpf = item.contacts?.cpf || "";
    const command = cpf ? `/cpf ${cpf}` : item.telegram_query || "";
    if (command && navigator.clipboard) {
      await navigator.clipboard.writeText(command);
      notify("Comando do CPF copiado. Cole no bot do Telegram.");
    }
    window.open(
      "https://web.telegram.org/k/#@NeoSystemBuscas_bot",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const completeRecovery = async (item: AnyRecord) => {
    const phone = phoneInputs[item.id];
    if (!phone) {
      notify("Digite o novo telefone encontrado.", "error");
      return;
    }
    try {
      await api("recover_contact", { recoveryId: item.id, phone });
      notify("Telefone validado. Contato devolvido ao fim da fila.");
      setRecovery((current) => current.filter((row) => row.id !== item.id));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar.", "error");
    }
  };

  return (
    <div className="page-stack">
      <div className="segmented-tabs three">
        <button className={tab === "lists" ? "active" : ""} onClick={() => setTab("lists")}>
          Listas
        </button>
        <button
          className={tab === "contacts" ? "active" : ""}
          onClick={() => setTab("contacts")}
        >
          Contatos
        </button>
        <button
          className={tab === "recovery" ? "active" : ""}
          onClick={() => setTab("recovery")}
        >
          Recuperação
          {bootstrap.counters?.recovery ? (
            <b>{bootstrap.counters.recovery}</b>
          ) : null}
        </button>
      </div>

      {tab === "lists" ? (
        <>
        <section className="spreadsheet-actions">
          <div>
            <p className="eyebrow">PLANILHA DA OPERAÇÃO</p>
            <h2>Importar ou exportar listas</h2>
            <p>Cada aba vira uma lista. Antes de gravar, você confere o resumo.</p>
          </div>
          <div className="spreadsheet-buttons">
            <label className="primary-button small file-button">
              Importar planilha
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => prepareSpreadsheet(event.target.files?.[0])}
              />
            </label>
            <button
              className="outline-button compact"
              onClick={exportSpreadsheet}
              disabled={exporting}
            >
              {exporting ? "Exportando..." : "Exportar planilha atualizada"}
            </button>
          </div>
        </section>
        {importPreview ? (
          <section className="import-preview">
            <div>
              <p className="eyebrow">CONFERÊNCIA ANTES DE IMPORTAR</p>
              <h2>{importPreview.fileName}</h2>
            </div>
            <div className="metric-row import-metrics">
              <div><strong>{importPreview.lists.length}</strong><span>listas</span></div>
              <div><strong>{importPreview.total}</strong><span>contatos</span></div>
              <div><strong>{importPreview.recovery}</strong><span>recuperação</span></div>
            </div>
            <div className="preview-list">
              {importPreview.lists.map((list: AnyRecord) => (
                <span key={list.name}>{list.name} · {list.contacts.length}</span>
              ))}
            </div>
            <div className="preview-actions">
              <button className="outline-button compact" onClick={() => setImportPreview(null)}>
                Cancelar
              </button>
              <button className="primary-button small" onClick={confirmImport} disabled={importing}>
                {importing ? "Importando..." : "Confirmar importação"}
              </button>
            </div>
          </section>
        ) : null}
        <section className="list-grid">
          {(bootstrap.lists || []).map((list: AnyRecord) => (
            <article className="list-card" key={list.id}>
              <div className="list-card-title">
                <div className="list-icon">▤</div>
                <div>
                  <h3>{list.name}</h3>
                  <p>{list.bank || list.origin_bank || "Lista importada"}</p>
                </div>
                <span className={`status-pill ${list.paused ? "paused" : "active"}`}>
                  {list.paused ? "Pausada" : "Ativa"}
                </span>
              </div>
              <div className="metric-row">
                <div>
                  <strong>{list.contacts_count}</strong>
                  <span>contatos</span>
                </div>
                <div>
                  <strong>{list.recovery_count}</strong>
                  <span>recuperação</span>
                </div>
              </div>
              <button
                className="outline-button full"
                onClick={() => {
                  setListId(list.id);
                  setTab("contacts");
                }}
              >
                Abrir contatos
              </button>
            </article>
          ))}
        </section>
        </>
      ) : null}

      {tab === "contacts" ? (
        <>
          <section className="toolbar-card">
            <select value={listId} onChange={(event) => setListId(event.target.value)}>
              <option value="">Todas as listas</option>
              {(bootstrap.lists || []).map((list: AnyRecord) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nome, CPF ou empresa"
              onKeyDown={(event) => event.key === "Enter" && loadContacts()}
            />
            <button className="outline-button compact" onClick={loadContacts}>
              Buscar
            </button>
          </section>
          <p className="section-count">{contactCount} contato(s) encontrados</p>
          {loading ? (
            <LoadingBlock />
          ) : (
            <section className="contact-list">
              {contacts.map((contact) => (
                <article className="contact-row" key={contact.id}>
                  <div className="avatar">{firstWord(contact.full_name).slice(0, 1)}</div>
                  <div className="contact-row-main">
                    <strong>{contact.full_name}</strong>
                    <span>{contact.company || "Empresa não informada"}</span>
                    <small>
                      {maskCpf(contact.cpf)} · {contact.phones?.length || 0} telefone(s)
                    </small>
                  </div>
                  <span className={`status-pill ${contact.queue_status}`}>
                    {contact.current_result || "Pendente"}
                  </span>
                </article>
              ))}
            </section>
          )}
        </>
      ) : null}

      {tab === "recovery" ? (
        loading ? (
          <LoadingBlock label="Carregando Recuperação..." />
        ) : recovery.length === 0 ? (
          <EmptyState
            icon="✓"
            title="Recuperação em dia"
            text="Nenhum contato aguarda um novo telefone."
          />
        ) : (
          <section className="recovery-grid">
            {recovery.map((item) => (
              <article className="recovery-card" key={item.id}>
                <div className="contact-card-head">
                  <div className="avatar orange">
                    {firstWord(item.contacts?.full_name).slice(0, 1)}
                  </div>
                  <div>
                    <h3>{item.contacts?.full_name}</h3>
                    <p>{item.contacts?.company || "Empresa não informada"}</p>
                  </div>
                  <span className="status-pill risk">Sem WhatsApp</span>
                </div>
                <div className="recovery-details">
                  <span>{maskCpf(item.contacts?.cpf)}</span>
                  <span>{item.contact_lists?.name || "Lista original"}</span>
                  <span>{item.attempts || 0} tentativa(s)</span>
                </div>
                <button className="telegram-button" onClick={() => openTelegram(item)}>
                  Copiar CPF e abrir Telegram
                </button>
                <div className="inline-form">
                  <input
                    value={phoneInputs[item.id] || ""}
                    onChange={(event) =>
                      setPhoneInputs((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Novo telefone com DDD"
                    inputMode="tel"
                  />
                  <button className="outline-button compact" onClick={() => completeRecovery(item)}>
                    Validar
                  </button>
                </div>
              </article>
            ))}
          </section>
        )
      ) : null}
    </div>
  );
}

function TemplatesView({
  role,
  notify,
}: {
  role: string;
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const allowedCategories = TEMPLATE_CATEGORIES.filter(([key]) => {
    if (role === "admin") return key !== "post_meeting_follow_up";
    return !["first_message", "follow_up", "return"].includes(key);
  });
  const [category, setCategory] = useState(allowedCategories[0][0]);
  const [templates, setTemplates] = useState<AnyRecord[]>([]);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates((await api("templates", { category })) || []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
    } finally {
      setLoading(false);
    }
  }, [category, notify]);

  useEffect(() => {
    setBody("");
    setName("");
    setEditingId("");
    load();
  }, [load]);

  const save = async () => {
    try {
      await api("save_template", { id: editingId || undefined, category, name, body });
      notify(editingId ? "Modelo atualizado." : "Modelo criado.");
      setBody("");
      setName("");
      setEditingId("");
      load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar.", "error");
    }
  };

  const remove = async (id: string) => {
    try {
      await api("delete_template", { id });
      notify("Modelo removido.");
      load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível remover.", "error");
    }
  };

  return (
    <div className="page-stack">
      <section className="category-strip">
        {allowedCategories.map(([key, label]) => (
          <button
            key={key}
            className={category === key ? "active" : ""}
            onClick={() => setCategory(key)}
          >
            {label}
          </button>
        ))}
      </section>

      <section className="editor-card">
        <div className="editor-head">
          <div>
            <p className="eyebrow">BIBLIOTECA DE MENSAGENS</p>
            <h2>{allowedCategories.find(([key]) => key === category)?.[1]}</h2>
          </div>
          <span>
            {templates.length}/{["first_message", "follow_up"].includes(category) ? 300 : 100}
          </span>
        </div>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do modelo (opcional)"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Digite o texto do modelo. Use {NOME} e {EMPRESA} para preencher automaticamente."
          rows={7}
        />
        <div className="variable-row">
          <button onClick={() => setBody((current) => `${current}{NOME}`)}>+ {"{NOME}"}</button>
          <button onClick={() => setBody((current) => `${current}{EMPRESA}`)}>
            + {"{EMPRESA}"}
          </button>
          <button className="primary-button small" onClick={save}>
            {editingId ? "Atualizar modelo" : "Salvar modelo"}
          </button>
        </div>
      </section>

      {loading ? (
        <LoadingBlock />
      ) : templates.length === 0 ? (
        <EmptyState
          icon="✎"
          title="Biblioteca vazia"
          text="Os modelos começam vazios, como aprovado. Crie o primeiro acima."
        />
      ) : (
        <section className="template-list">
          {templates.map((template) => (
            <article className="template-card" key={template.id}>
              <span className="template-number">
                {String(template.position).padStart(3, "0")}
              </span>
              <div>
                <strong>{template.name}</strong>
                <p>{template.body}</p>
                <small>Usado {template.usage_count || 0} vez(es)</small>
              </div>
              <div className="template-actions">
                <button
                  onClick={() => {
                    setEditingId(template.id);
                    setName(template.name);
                    setBody(template.body);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Editar
                </button>
                <button className="danger-text" onClick={() => remove(template.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function AgendaView({
  notify,
}: {
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const [view, setView] = useState("week");
  const [appointments, setAppointments] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    if (view === "today" || view === "day") {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    } else if (view === "week") {
      from.setDate(now.getDate() - now.getDay());
      from.setHours(0, 0, 0, 0);
      to.setDate(from.getDate() + 7);
    } else {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setMonth(from.getMonth() + 1);
      to.setDate(0);
      to.setHours(23, 59, 59, 999);
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }, [view]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAppointments((await api("appointments", range)) || []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
    } finally {
      setLoading(false);
    }
  }, [range, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      await api("save_appointment", {
        title,
        startsAt: new Date(startsAt).toISOString(),
      });
      notify("Reunião adicionada à agenda.");
      setTitle("");
      setStartsAt("");
      setShowForm(false);
      load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar.", "error");
    }
  };

  return (
    <div className="page-stack">
      <section className="calendar-toolbar">
        <div className="segmented-tabs four">
          {[
            ["today", "Hoje"],
            ["day", "Dia"],
            ["week", "Semana"],
            ["month", "Mês"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="primary-button small" onClick={() => setShowForm(!showForm)}>
          + Reunião
        </button>
      </section>

      {showForm ? (
        <section className="compact-form-card">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título da reunião"
          />
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <button className="outline-button compact" onClick={save}>
            Salvar na agenda
          </button>
        </section>
      ) : null}

      <section className="calendar-card">
        <div className="calendar-heading">
          <div>
            <p className="eyebrow">AGENDA COMPARTILHADA</p>
            <h2>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </h2>
          </div>
          <span>{appointments.length} compromisso(s)</span>
        </div>
        {loading ? (
          <LoadingBlock />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon="▦"
            title="Nenhuma reunião neste período"
            text="Use o botão + Reunião para criar o primeiro compromisso."
          />
        ) : (
          <div className="appointment-list">
            {appointments.map((appointment) => (
              <article className="appointment-card" key={appointment.id}>
                <div className="appointment-date">
                  <strong>
                    {new Date(appointment.starts_at)
                      .toLocaleDateString("pt-BR", { day: "2-digit" })}
                  </strong>
                  <span>
                    {new Date(appointment.starts_at)
                      .toLocaleDateString("pt-BR", { month: "short" })
                      .replace(".", "")}
                  </span>
                </div>
                <div>
                  <h3>{appointment.title}</h3>
                  <p>
                    {formatDate(appointment.starts_at)} ·{" "}
                    {appointment.owner?.full_name || "Responsável"}
                  </p>
                  {appointment.contacts?.full_name ? (
                    <small>Cliente: {appointment.contacts.full_name}</small>
                  ) : null}
                </div>
                <span className={`status-pill ${appointment.status}`}>
                  {appointment.status === "scheduled" ? "Agendada" : appointment.status}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NotificationsView({
  notify,
}: {
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const [items, setItems] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api("notifications")
      .then((data) => setItems(data || []))
      .catch((error) => notify(error.message, "error"))
      .finally(() => setLoading(false));
  }, [notify]);

  const categories = [
    ["Retornos Programados", "↩", "Contatos que precisam de nova abordagem"],
    ["Retornar após Áudio", "◖", "Áudios sem atualização há mais de 24 horas"],
    ["Agenda dos Advogados", "▦", "Reuniões, contratos e agenda compartilhada"],
    ["Sistema", "⚙", "Importações, sincronizações e atualizações"],
    ["Saúde dos Chips", "◉", "Limites, restrições e possíveis bloqueios"],
  ];

  return loading ? (
    <LoadingBlock />
  ) : (
    <div className="page-stack">
      {categories.map(([title, icon, text]) => {
        const matches = items.filter((item) =>
          String(item.category || "").toLowerCase().includes(title.toLowerCase().split(" ")[0]),
        );
        return (
          <section className="notification-section" key={title}>
            <div className="notification-title">
              <span>{icon}</span>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
              <b>{matches.length}</b>
            </div>
            {matches.length ? (
              matches.slice(0, 3).map((item) => (
                <article className="notification-row" key={item.id}>
                  <span className="notification-dot" />
                  <div>
                    <strong>{item.title || title}</strong>
                    <p>{item.body || item.message}</p>
                    <small>{formatDate(item.created_at)}</small>
                  </div>
                </article>
              ))
            ) : (
              <p className="quiet-row">Nada novo nesta categoria.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ReportsView({
  notify,
}: {
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [reportTab, setReportTab] = useState<"overview" | "performance">("overview");
  const [period, setPeriod] = useState("month");
  useEffect(() => {
    api("reports")
      .then(setData)
      .catch((error) => notify(error.message, "error"));
  }, [notify]);
  if (!data) return <LoadingBlock label="Calculando os relatórios..." />;
  const distribution = Object.entries(data.distribution || {}).sort(
    (a: any, b: any) => b[1] - a[1],
  );
  const max = Math.max(1, ...distribution.map(([, value]: any) => value));
  return (
    <div className="page-stack">
      <div className="segmented-tabs two">
        <button className={reportTab === "overview" ? "active" : ""} onClick={() => setReportTab("overview")}>Visão Geral</button>
        <button className={reportTab === "performance" ? "active" : ""} onClick={() => setReportTab("performance")}>Meu Desempenho</button>
      </div>
      <section className="report-periods" aria-label="Período do relatório">
        {[['day','Dia'],['week','Semana'],['month','Mês'],['custom','Período personalizado']].map(([key,label]) => (
          <button key={key} className={period === key ? "active" : ""} onClick={() => setPeriod(key)}>{label}</button>
        ))}
      </section>
      <section className="report-metrics">
        {[
          ["Primeiras mensagens enviadas", data.first_messages ?? 0, "orange"],
          ["Sem resposta", data.no_response ?? data.distribution?.["Sem resposta"] ?? 0, "red"],
          ["Áudios enviados", data.audios ?? data.distribution?.["Áudio enviado"] ?? 0, "blue"],
          ["Agendamentos", data.appointments ?? 0, "purple"],
          ["Reuniões realizadas", data.meetings ?? 0, "green"],
          ["Contratos fechados", data.contracts ?? 0, "gold"],
          ["Contatos sem WhatsApp", data.no_whatsapp ?? 0, "red"],
          ["Em recuperação", data.recovery ?? 0, "orange"],
          ["Recuperados", data.recovered ?? 0, "green"],
          ["Enganos", data.mistakes ?? 0, "red"],
          ["Telefones inválidos", data.invalid_phones ?? 0, "orange"],
          ["Clientes com advogado", data.with_lawyer ?? 0, "blue"],
        ].map(([label, value, tone]) => (
          <article className={`report-metric ${tone}`} key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="chart-card">
        <div className="chart-head">
          <div>
            <p className="eyebrow">DISTRIBUIÇÃO DE RESULTADOS</p>
            <h2>Situação atual dos contatos</h2>
          </div>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
            <option value="custom">Período personalizado</option>
          </select>
        </div>
        <div className="bar-list">
          {distribution.slice(0, 10).map(([label, value]: any) => (
            <div className="bar-row" key={label}>
              <span>{label}</span>
              <div>
                <i style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type FunnelStage = { id: string; name: string; color: string; icon: string; description: string; sla: string };
type FunnelDefinition = { id: string; name: string; description: string; color: string; icon: string; stages: FunnelStage[]; archived?: boolean };
const FUNNEL_TABS = ["Visão Geral", "Funis", "Etapas", "Automações", "Regras", "Gatilhos"] as const;
const stageId = () => `stage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const newFunnelStages = () => ["Etapa 1", "Etapa 2", "Etapa 3", "Etapa 4", "Etapa 5", "Etapa 6"];

function FunnelView({
  notify,
  onNavigate,
  bootstrap,
}: {
  notify: (text: string, tone?: "success" | "error") => void;
  onNavigate: (page: PageKey) => void;
  bootstrap: AnyRecord;
}) {
  const [tab, setTab] = useState<(typeof FUNNEL_TABS)[number]>("Visão Geral");
  const [funnels, setFunnels] = useState<FunnelDefinition[]>(() => {
    try { return JSON.parse(localStorage.getItem("prospec-custom-funnels") || "[]"); } catch { return []; }
  });
  const [selectedId, setSelectedId] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [draft, setDraft] = useState({ name: "", description: "", color: "#B53F0D", icon: "◈", stages: newFunnelStages() });
  const [search, setSearch] = useState("");
  const selected = funnels.find((item) => item.id === selectedId) || funnels.find((item) => !item.archived);
  useEffect(() => { localStorage.setItem("prospec-custom-funnels", JSON.stringify(funnels)); }, [funnels]);
  useEffect(() => { if (!selectedId && funnels[0]) setSelectedId(funnels[0].id); }, [funnels, selectedId]);
  const saveFunnel = () => {
    if (!draft.name.trim()) { notify("Informe o nome do funil.", "error"); return; }
    const funnel: FunnelDefinition = { id: `funnel-${Date.now()}`, name: draft.name.trim(), description: draft.description.trim(), color: draft.color, icon: draft.icon, stages: draft.stages.filter(Boolean).map((name, index) => ({ id: stageId(), name, color: index % 2 ? "#306D64" : draft.color, icon: "●", description: "", sla: "24h" })) };
    setFunnels((items) => [...items, funnel]); setSelectedId(funnel.id); setShowWizard(false); setWizardStep(1); setTab("Visão Geral");
    setDraft({ name: "", description: "", color: "#B53F0D", icon: "◈", stages: newFunnelStages() }); notify(`Funil criado com ${funnel.stages.length} blocos de etapas.`);
  };
  const duplicate = (funnel: FunnelDefinition) => setFunnels((items) => [...items, { ...funnel, id: `funnel-${Date.now()}`, name: `${funnel.name} — cópia`, stages: funnel.stages.map((stage) => ({ ...stage, id: stageId() })) }]);
  const updateSelected = (change: Partial<FunnelDefinition>) => selected && setFunnels((items) => items.map((item) => item.id === selected.id ? { ...item, ...change } : item));
  const addStage = () => selected && updateSelected({ stages: [...selected.stages, { id: stageId(), name: "Nova etapa", color: "#D77428", icon: "●", description: "", sla: "24h" }] });
  return (
    <div className="funnel-operations-shell">
      <aside className={`operations-sidebar funnel-sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="operations-brand"><i>PROSPEC</i><b>KR</b><button onClick={() => setMobileMenu(false)}>×</button></div>
        <nav>
          <button onClick={() => onNavigate("home")}><span>⌂</span><b>Atendimento<small>Converse e avance</small></b></button>
          <button onClick={() => onNavigate("home")}><span>⌂</span><b>Início<small>Visão geral</small></b></button>
          <button className="active"><span>▽</span><b>Funis<small>Etapas e conversões</small></b></button>
          <button onClick={() => onNavigate("lists")}><span>♙</span><b>Listas e Contatos<small>Suas listas e leads</small></b></button>
          <button onClick={() => onNavigate("agenda")}><span>▦</span><b>Agenda<small>Compromissos</small></b></button>
          <button onClick={() => onNavigate("templates")}><span>▤</span><b>Modelos<small>Mensagens e áudios</small></b></button>
          <button onClick={() => onNavigate("reports")}><span>▥</span><b>Relatórios<small>Desempenho</small></b></button>
          <button onClick={() => onNavigate("notifications")}><span>●</span><b>Notificações<small>Avisos da operação</small></b></button>
          <button onClick={() => onNavigate("settings")}><span>⚙</span><b>Configurações<small>Preferências</small></b></button>
          <button><span>?</span><b>Ajuda<small>Central de suporte</small></b></button>
        </nav>
      </aside>
      {mobileMenu ? <button className="operations-backdrop" onClick={() => setMobileMenu(false)} /> : null}
      <main className="funnel-operations-main">
        <header className="funnel-global-topbar">
          <button className="operations-menu-button" onClick={() => setMobileMenu(true)}>☰</button>
          <div className="mobile-operations-brand"><i>PROSPEC</i><b>KR</b></div>
          <label className="funnel-global-search"><span>⌕</span><input aria-label="Pesquisa global" placeholder="Buscar contatos, empresas, tags..."/><kbd>Ctrl + K</kbd></label>
          <span className="topbar-spacer" />
          <button className="funnel-create-shortcut" onClick={() => setShowWizard(true)}>＋</button>
          <button className="topbar-icon notification-dot">♧</button>
          <button className="topbar-icon">▣</button>
          <button className="topbar-icon">▦</button>
          <button className="topbar-icon">⚙</button>
          <button className="profile-button"><span className="avatar small-avatar">{(bootstrap.profile?.full_name || "Thainá Krause").split(" ").map((part: string) => part[0]).slice(0, 2).join("")}</span><b>{bootstrap.profile?.full_name || "Thainá Krause"}<small>{bootstrap.profile?.role === "admin" ? "Administradora" : "Advogado"}</small></b>⌄</button>
        </header>
        <div className="page-stack funnel-page dynamic-funnels">
      <section className="funnel-heading-card dynamic-funnel-heading">
        <div><p className="eyebrow">PROSPEC KR · PROCESSOS PERSONALIZÁVEIS</p><h2>FUNIS</h2><p>Gerencie todos os seus processos comerciais. Cada empresa cria seus próprios funis, etapas, regras e automações.</p></div>
        <div className="funnel-heading-actions"><button className="secondary-button small" onClick={() => setShowFilters(true)}>☷ Filtros</button><button className="secondary-button small">⇧ Importar</button><button className="primary-button small" onClick={() => setShowWizard(true)}>＋ Criar Funil</button><button className="icon-button">⋮</button></div>
      </section>
      <nav className="funnel-tabs">{FUNNEL_TABS.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
      {!selected ? <section className="funnel-zero-state"><div className="empty-funnel-visual"><i/><i/><i/></div><p className="eyebrow">COMECE DO SEU JEITO</p><h2>Nenhum funil cadastrado</h2><p>Crie seu primeiro processo com as etapas, responsáveis, automações, regras e permissões que o seu escritório realmente usa.</p><button className="primary-button" onClick={() => setShowWizard(true)}>＋ Criar meu primeiro funil</button><small>O PROSPEC KR não cria etapas fixas. Você terá liberdade total.</small></section> : <>
        <section className="funnel-selector"><div><span style={{ background: selected.color }}>{selected.icon}</span><select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{funnels.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>{selected.description || "Funil personalizado"}</small></div><div><button onClick={() => duplicate(selected)}>⧉ Duplicar</button><button onClick={() => updateSelected({ archived: true })}>▣ Arquivar</button><button onClick={() => { if (confirm("Excluir este funil?")) setFunnels((items) => items.filter((item) => item.id !== selected.id)); }}>⌫ Excluir</button></div></section>
        {tab === "Visão Geral" && <><section className="funnel-summary-grid">{[["Total de contatos", "0", "↗ Em tempo real"], ["Em andamento", "0", "0% do total"], ["Convertidos", "0", "Nenhuma conversão"], ["Taxa de conversão", "0%", "Meta personalizável"], ["Tempo médio", "—", "Aguardando dados"]].map(([label, value, detail], index) => <article className="funnel-summary-card" key={label}><span>{label}</span><strong>{value}</strong><svg viewBox="0 0 110 25"><path d={`M2 ${20-index} C 24 ${8+index}, 38 22, 55 13 S 82 ${5+index},108 8`} /></svg><small>{detail}</small></article>)}</section><section className="funnel-toolbar-card"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="⌕ Pesquisar contato, empresa, banco, tag..."/><button onClick={() => setShowFilters(true)}>⚙ Todos os filtros</button><span>0 contatos exibidos</span></section><div className="funnel-content-grid"><section className="funnel-board dynamic-board" aria-label="Etapas personalizadas do funil">{selected.stages.map((stage, index) => <article className="funnel-column" key={stage.id}><header style={{ borderTopColor: stage.color }}><div><b>{stage.icon} {stage.name}</b><small>R$ 0,00 acumulado</small></div><span>0</span><button>⋮</button></header><div className="funnel-column-body"><div className="funnel-empty-column">Arraste contatos para esta etapa</div><button className="add-funnel-card">＋ Adicionar contato</button></div></article>)}</section>{showActivity && <aside className="recent-activity"><header><div><p className="eyebrow">ATIVIDADES RECENTES</p><h3>Últimos movimentos</h3></div><button onClick={() => setShowActivity(false)}>×</button></header><div className="activity-empty">◎<strong>Nenhuma atividade ainda</strong><small>Movimentos, reuniões, contratos e importações aparecerão aqui.</small></div></aside>}</div><section className="funnel-analysis-grid"><article className="chart-card performance-chart"><header><div><p className="eyebrow">PERFORMANCE DO FUNIL</p><h2>Evolução no período</h2></div><select><option>Últimos 30 dias</option><option>Esta semana</option><option>Este mês</option></select></header><div className="empty-chart"><svg viewBox="0 0 600 150"><path d="M0 130 C100 110 130 125 210 88 S360 110 430 55 S520 70 600 20"/><path d="M0 145 H600"/><path d="M0 100 H600"/><path d="M0 55 H600"/></svg><span>Os dados aparecerão conforme o funil for utilizado.</span></div></article><article className="chart-card conversion-chart"><p className="eyebrow">CONVERSÃO POR ETAPA</p><h2>Distribuição</h2><div className="donut-placeholder"><strong>0</strong><small>contatos</small></div><div className="chart-type"><button className="active">Rosca</button><button>Barras</button><button>Pizza</button></div></article></section></>}
        {tab === "Funis" && <section className="funnel-management"><header><div><h2>Todos os funis</h2><p>Crie, edite, duplique ou arquive processos completos.</p></div><button className="primary-button small" onClick={() => setShowWizard(true)}>＋ Novo funil</button></header>{funnels.map((item) => <article key={item.id}><span style={{ background: item.color }}>{item.icon}</span><div><strong>{item.name}</strong><small>{item.stages.length} etapas · {item.archived ? "Arquivado" : "Ativo"}</small></div><button onClick={() => { setSelectedId(item.id); setTab("Visão Geral"); }}>Abrir</button><button onClick={() => duplicate(item)}>Duplicar</button><button>Editar</button></article>)}</section>}
        {tab === "Etapas" && <section className="stage-settings"><header><div><h2>Configuração das etapas</h2><p>Defina ordem, cor, SLA, permissões e obrigatoriedades.</p></div><button className="primary-button small" onClick={addStage}>＋ Nova etapa</button></header>{selected.stages.map((stage, index) => <article key={stage.id}><b className="drag-handle">⠿</b><input type="color" value={stage.color} onChange={(event) => updateSelected({ stages: selected.stages.map((item) => item.id === stage.id ? { ...item, color: event.target.value } : item) })}/><div><input value={stage.name} onChange={(event) => updateSelected({ stages: selected.stages.map((item) => item.id === stage.id ? { ...item, name: event.target.value } : item) })}/><small>Etapa {index + 1} · SLA <input value={stage.sla} onChange={(event) => updateSelected({ stages: selected.stages.map((item) => item.id === stage.id ? { ...item, sla: event.target.value } : item) })}/></small></div><button>Automações</button><button>Permissões</button><button onClick={() => updateSelected({ stages: selected.stages.filter((item) => item.id !== stage.id) })}>⌫</button></article>)}</section>}
        {["Automações", "Regras", "Gatilhos"].includes(tab) && <section className="automation-builder"><p className="eyebrow">CONSTRUTOR DINÂMICO</p><h2>{tab}</h2><p>{tab === "Automações" ? "Defina ações quando um contato entrar ou sair de uma etapa." : tab === "Regras" ? "Crie obrigatoriedades para proteger a qualidade do processo." : "Conecte eventos do WhatsApp, agenda, contratos, importações e recuperação."}</p><button className="primary-button small">＋ Criar {tab.slice(0, -1).toLowerCase()}</button><div className="automation-empty"><span>⚡</span><strong>Nenhuma configuração criada</strong><small>Todas as configurações serão específicas deste funil e poderão ser ativadas ou pausadas.</small></div></section>}
      </>}
      {showFilters && <div className="funnel-drawer-backdrop" onClick={() => setShowFilters(false)}><aside className="funnel-filter-drawer" onClick={(event) => event.stopPropagation()}><header><div><p className="eyebrow">FILTROS</p><h2>Refine o Kanban</h2></div><button onClick={() => setShowFilters(false)}>×</button></header>{["Responsável", "Advogado", "Chip", "Lista", "Banco", "Empresa", "Origem", "Tags", "Status", "Período", "Valor", "Etapa"].map((label) => <label key={label}>{label}<select><option>Todos</option></select></label>)}<footer><button className="secondary-button">Limpar</button><button className="primary-button" onClick={() => setShowFilters(false)}>Aplicar filtros</button></footer></aside></div>}
      {showWizard && <div className="funnel-modal-backdrop"><section className="funnel-wizard"><header><div><p className="eyebrow">NOVO FUNIL · PASSO {wizardStep} DE 4</p><h2>{wizardStep === 1 ? "Identidade do funil" : wizardStep === 2 ? "Crie suas etapas" : wizardStep === 3 ? "Regras e responsáveis" : "Revise e crie"}</h2></div><button onClick={() => setShowWizard(false)}>×</button></header><div className="wizard-progress"><i className={wizardStep >= 1 ? "active" : ""}/><i className={wizardStep >= 2 ? "active" : ""}/><i className={wizardStep >= 3 ? "active" : ""}/><i className={wizardStep >= 4 ? "active" : ""}/></div>{wizardStep === 1 && <div className="wizard-fields"><label>Nome do funil<input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Atendimento trabalhista"/></label><label>Descrição<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Explique o objetivo deste processo"/></label><div><label>Cor<input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}/></label><label>Ícone<select value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })}><option>◈</option><option>◆</option><option>⚖</option><option>◎</option><option>▣</option></select></label></div></div>}{wizardStep === 2 && <div className="wizard-stages"><p>Adicione quantas etapas desejar. Estes nomes são totalmente editáveis.</p>{draft.stages.map((name, index) => <div key={index}><b>⠿</b><input value={name} onChange={(event) => setDraft({ ...draft, stages: draft.stages.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })}/><button onClick={() => setDraft({ ...draft, stages: draft.stages.filter((_, itemIndex) => itemIndex !== index) })}>×</button></div>)}<button onClick={() => setDraft({ ...draft, stages: [...draft.stages, `Etapa ${draft.stages.length + 1}`] })}>＋ Adicionar etapa</button></div>}{wizardStep === 3 && <div className="wizard-options">{["Responsáveis", "Automações", "Regras obrigatórias", "Permissões por cargo"].map((item) => <button key={item}><span>○</span><b>{item}</b><small>Configurar depois</small>›</button>)}</div>}{wizardStep === 4 && <div className="wizard-review"><span style={{ background: draft.color }}>{draft.icon}</span><h3>{draft.name || "Funil sem nome"}</h3><p>{draft.description || "Sem descrição"}</p><strong>{draft.stages.filter(Boolean).length} etapas</strong><div>{draft.stages.filter(Boolean).map((name) => <small key={name}>{name}</small>)}</div></div>}<footer><button className="secondary-button" onClick={() => wizardStep === 1 ? setShowWizard(false) : setWizardStep((step) => step - 1)}>← {wizardStep === 1 ? "Cancelar" : "Voltar"}</button><button className="primary-button" onClick={() => wizardStep === 4 ? saveFunnel() : setWizardStep((step) => step + 1)}>{wizardStep === 4 ? "Criar funil" : "Continuar →"}</button></footer></section></div>}
        </div>
      </main>
      <nav className="funnel-mobile-nav" aria-label="Navegação principal">
        <button onClick={() => onNavigate("home")}><span>⌂</span><small>Início</small></button>
        <button className="active"><span>▽</span><small>Funis</small></button>
        <button onClick={() => onNavigate("notifications")}><span>●</span><small>Notificações</small></button>
        <button onClick={() => onNavigate("agenda")}><span>▦</span><small>Agenda</small></button>
        <button onClick={() => onNavigate("lists")}><span>☷</span><small>Listas</small></button>
        <button onClick={() => onNavigate("reports")}><span>▥</span><small>Relatórios</small></button>
      </nav>
    </div>
  );
}

function ChipsUsersView({
  notify,
}: {
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const [tab, setTab] = useState<"chips" | "users">("chips");
  const [chips, setChips] = useState<AnyRecord[]>([]);
  const [users, setUsers] = useState<AnyRecord>({ profiles: [], invitations: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnyRecord>({});

  const startChipForm = (chip?: AnyRecord) => {
    setForm(
      chip
        ? {
            ...chip,
            activatedAt: chip.activated_at,
            openingMethod: chip.opening_method || "app",
            appPackage: chip.app_package || "",
            appComponent: chip.app_component || "",
            appLabel: chip.app_label || "",
            browserName: chip.browser_name || "",
            browserPackage: chip.browser_package || "",
            webUrlTemplate:
              chip.web_url_template || "https://web.whatsapp.com/send?phone={PHONE}",
          }
        : {
            status: "active",
            openingMethod: "app",
            webUrlTemplate: "https://web.whatsapp.com/send?phone={PHONE}",
          },
    );
    setShowForm(true);
  };

  const load = useCallback(async () => {
    try {
      if (tab === "chips") setChips((await api("chips")) || []);
      else setUsers((await api("users")) || { profiles: [], invitations: [] });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
    }
  }, [tab, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      if (tab === "chips") await api("save_chip", form);
      else
        await api("invite_user", {
          fullName: form.fullName,
          email: form.email,
          role: form.role || "member",
          honorific: form.honorific || "Dr(a).",
          jobTitle: form.jobTitle,
        });
      notify(tab === "chips" ? (form.id ? "Chip atualizado." : "Chip cadastrado.") : "Convite criado para o e-mail.");
      setForm({});
      setShowForm(false);
      load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar.", "error");
    }
  };

  return (
    <div className="page-stack">
      <section className="chips-users-head">
        <div className="segmented-tabs two">
          <button className={tab === "chips" ? "active" : ""} onClick={() => setTab("chips")}>
            Chips
          </button>
          <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
            Usuários
          </button>
        </div>
        <button className="primary-button small" onClick={() => (showForm ? setShowForm(false) : startChipForm())}>
          + {tab === "chips" ? "Cadastrar chip" : "Convidar usuário"}
        </button>
      </section>

      {showForm ? (
        <section className="compact-form-card grid-form">
          {tab === "chips" ? (
            <>
              <input
                placeholder="Nome do chip"
                value={form.name || ""}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <input
                placeholder="Número com DDD"
                inputMode="tel"
                value={form.number || ""}
                onChange={(event) => setForm({ ...form, number: event.target.value })}
              />
              <input
                placeholder="Operadora"
                value={form.operator || ""}
                onChange={(event) => setForm({ ...form, operator: event.target.value })}
              />
              <select
                value={form.status || "active"}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option value="active">Ativo</option>
                <option value="paused">Pausado</option>
                <option value="restricted">Restrito</option>
                <option value="blocked">Bloqueado</option>
              </select>
              <select
                value={form.openingMethod || form.opening_method || "app"}
                onChange={(event) => setForm({ ...form, openingMethod: event.target.value })}
              >
                <option value="app">Aplicativo</option>
                <option value="web">WhatsApp Web</option>
              </select>
              {(form.openingMethod || form.opening_method || "app") === "app" ? (
                <>
                  <input
                    placeholder="Identificação do aplicativo"
                    value={form.appLabel || form.app_label || ""}
                    onChange={(event) => setForm({ ...form, appLabel: event.target.value })}
                  />
                  <input
                    placeholder="Package (ex.: com.whatsapp)"
                    value={form.appPackage || form.app_package || ""}
                    onChange={(event) => setForm({ ...form, appPackage: event.target.value })}
                  />
                  <input
                    placeholder="Component (opcional)"
                    value={form.appComponent || form.app_component || ""}
                    onChange={(event) => setForm({ ...form, appComponent: event.target.value })}
                  />
                </>
              ) : (
                <>
                  <select
                    value={form.browserName || form.browser_name || ""}
                    onChange={(event) => setForm({ ...form, browserName: event.target.value })}
                  >
                    <option value="">Selecione o navegador</option>
                    <option value="Firefox">Firefox</option>
                    <option value="Kiwi">Kiwi Browser</option>
                    <option value="Brave">Brave</option>
                    <option value="Chrome">Chrome</option>
                    <option value="Edge">Edge</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <input
                    placeholder="Package do navegador (opcional)"
                    value={form.browserPackage || form.browser_package || ""}
                    onChange={(event) => setForm({ ...form, browserPackage: event.target.value })}
                  />
                  <input
                    placeholder="Link padrão com {PHONE}"
                    value={form.webUrlTemplate || form.web_url_template || ""}
                    onChange={(event) => setForm({ ...form, webUrlTemplate: event.target.value })}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <input
                placeholder="Nome completo"
                value={form.fullName || ""}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
              <input
                placeholder="E-mail"
                type="email"
                value={form.email || ""}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <select
                value={form.role || "member"}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="member">Membro da equipe</option>
                <option value="admin">Administrador</option>
              </select>
              <input
                placeholder="Cargo (ex.: Advogado, Assistente, Comercial)"
                value={form.jobTitle || ""}
                onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
              />
            </>
          )}
          <button className="outline-button compact" onClick={save}>
            Salvar
          </button>
        </section>
      ) : null}

      {tab === "chips" ? (
        chips.length ? (
          <section className="chip-grid">
            {chips.map((chip) => (
              <article className="chip-card" key={chip.id}>
                <div className={`health-ring score-${Math.ceil((chip.health_score || 0) / 20)}`}>
                  <strong>{chip.health_score || 0}%</strong>
                  <span>saúde</span>
                </div>
                <div>
                  <h3>{chip.name}</h3>
                  <p>+{chip.number}</p>
                  <small>{chip.operator || "Operadora não informada"}</small>
                  <small>{openingMethodLabel(chip)}</small>
                </div>
                <span className={`status-pill ${chip.status}`}>{chip.status}</span>
                <button className="outline-button compact" onClick={() => startChipForm(chip)}>
                  Editar
                </button>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            icon="◉"
            title="Nenhum chip cadastrado"
            text="Cadastre o primeiro chip para acompanhar saúde, limites e histórico."
          />
        )
      ) : (
        <section className="user-list">
          {(users.profiles || []).map((user: AnyRecord) => (
            <article className="user-row" key={user.id}>
              <div className="avatar">{firstWord(user.full_name).slice(0, 1)}</div>
              <div>
                <strong>{user.full_name}</strong>
                <span>{user.email}</span>
                <small>{user.job_title || (user.role === "admin" ? "Administradora" : "Cargo não informado")}</small>
              </div>
              <span className={`status-pill ${user.status}`}>
                {user.role === "admin" ? "Administrador" : "Membro"}
              </span>
            </article>
          ))}
          {(users.invitations || []).map((invite: AnyRecord) => (
            <article className="user-row" key={invite.id}>
              <div className="avatar pending">✉</div>
              <div>
                <strong>{invite.full_name}</strong>
                <span>{invite.email}</span>
                <small>{invite.job_title || "Cargo não informado"}</small>
              </div>
              <span className="status-pill pending">Convite pendente</span>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function ProfileView({ profile }: { profile: AnyRecord }) {
  return (
    <div className="page-stack">
      <section className="profile-card">
        <div className="profile-avatar">{firstWord(profile.full_name).slice(0, 1)}</div>
        <div>
          <p className="eyebrow">MEU PERFIL</p>
          <h2>{profile.full_name}</h2>
          <p>Sessão administrativa direta</p>
          <span className="status-pill active">
            {profile.role === "admin" ? "Administradora" : "Advogado"}
          </span>
        </div>
      </section>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="page-stack">
      <section className="settings-card">
        <p className="eyebrow">CONFIGURAÇÕES</p>
        <h2>Preferências do PROSPEC KR</h2>
        <p>As regras operacionais aprovadas estão ativas. WhatsApp permanece preparado, mas desconectado.</p>
        <div className="settings-list">
          <span><strong>Tema</strong><small>Escuro · paleta final aprovada</small></span>
          <span><strong>Fuso horário</strong><small>America/Porto_Velho</small></span>
          <span><strong>Acesso atual</strong><small>Sessão administrativa direta</small></span>
        </div>
      </section>
    </div>
  );
}

export default function ProspecDashboard() {
  const [page, setPage] = useState<PageKey>(pageFromLocation);
  const [bootstrap, setBootstrap] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(
    null,
  );
  const [fatal, setFatal] = useState("");

  const notify = useCallback((text: string, tone: "success" | "error" = "success") => {
    setToast({ text, tone });
  }, []);

  const refreshBootstrap = useCallback(async () => {
    const data = await api("bootstrap");
    setBootstrap(data);
  }, []);

  useEffect(() => {
    refreshBootstrap()
      .catch((error) => setFatal(error.message))
      .finally(() => setLoading(false));
  }, [refreshBootstrap]);

  useEffect(() => {
    const syncRoute = () => setPage(pageFromLocation());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  if (loading) {
    return (
      <main className="splash-screen">
        <div className="brand-mark">KR</div>
        <h1>PROSPEC KR</h1>
        <LoadingBlock label="Abrindo sua operação..." />
      </main>
    );
  }

  if (fatal || !bootstrap) {
    return (
      <main className="login-page">
        <section className="login-card error-card">
          <div className="brand-mark">KR</div>
          <h1>Não foi possível abrir o PROSPEC KR</h1>
          <p>{fatal || "A sessão administrativa direta não respondeu."}</p>
          <button
            className="outline-button full link-button"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  const role = bootstrap.profile?.role || "lawyer";
  const nav = role === "admin" ? ADMIN_NAV : LAWYER_NAV;
  const activePage = page === "chips-users" && role !== "admin" ? "home" : page;
  const titles: Record<PageKey, [string, string]> = {
    home: [
      "Início",
      `Olá, ${firstWord(
        bootstrap.profile?.full_name || "Thainá",
      )}.`,
    ],
    funnel: ["Funis", "Acompanhe contatos, avanço e conversão por etapa."],
    notifications: ["Notificações", "Acompanhe tudo que precisa da sua atenção."],
    agenda: ["Agenda", "Reuniões e compromissos da equipe."],
    lists: ["Listas e Contatos", "Gerencie a operação e a Recuperação."],
    templates: ["Modelos de Mensagens", "Crie suas bibliotecas de abordagem."],
    reports: ["Relatórios", "Resultados, evolução e desempenho."],
    "chips-users": ["Chips e Usuários", "Saúde dos chips, convites e permissões."],
    settings: ["Configurações", "Preferências e regras do sistema."],
    profile: ["Meu Perfil", "Seus dados e acesso ao sistema."],
  };

  const go = (target: PageKey) => {
    setPage(target);
    window.history.pushState(null, "", `#/${PAGE_PATHS[target]}`);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const operationsMode = activePage === "home" || activePage === "funnel" || activePage === "agenda" || activePage === "lists" || activePage === "templates";

  return (
    <div className={`app-shell ${operationsMode ? "operations-mode" : ""}`}>
      {!operationsMode ? <Header
        title={titles[activePage][0]}
        subtitle={titles[activePage][1]}
        onMenu={() => setMenuOpen(true)}
        badge={bootstrap.counters?.notifications}
      /> : null}

      {!operationsMode ? <aside className={`side-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="drawer-head">
          <div className="brand-mark small-mark">KR</div>
          <div>
            <strong>PROSPEC KR</strong>
            <span>{bootstrap.profile?.full_name}</span>
          </div>
          <button className="icon-button" onClick={() => setMenuOpen(false)}>
            ×
          </button>
        </div>
        <nav>
          {[
            ...nav.filter(([key]) => key !== "profile"),
            ["templates", "Modelos de Mensagens", "✎"] as [PageKey, string, string],
            ...(role === "admin" ? [["settings", "Configurações", "⚙"] as [PageKey, string, string]] : []),
            ["profile", "Meu Perfil", "○"] as [PageKey, string, string],
          ]
            .filter(
              ([key], index, rows) =>
                rows.findIndex(([candidate]) => candidate === key) === index &&
                (role === "admin" || key !== "chips-users"),
            )
            .map(([key, label, icon]) => (
              <button key={key} className={activePage === key ? "active" : ""} onClick={() => go(key)}>
                <span>{icon}</span>
                {label}
              </button>
            ))}
        </nav>
      </aside> : null}
      {!operationsMode && menuOpen ? <button className="drawer-backdrop" onClick={() => setMenuOpen(false)} /> : null}

      <main className="app-content">
        {activePage === "home" ? <HomeView bootstrap={bootstrap} onNavigate={go} /> : null}
        {activePage === "funnel" ? <FunnelView notify={notify} onNavigate={go} bootstrap={bootstrap} /> : null}
        {activePage === "notifications" ? <NotificationsOfficial role={role} bootstrap={bootstrap} notify={notify} apiAction={api} onNavigate={go} /> : null}
        {activePage === "agenda" ? <AgendaOfficial notify={notify} onNavigate={go} bootstrap={bootstrap} /> : null}
        {activePage === "lists" ? <ListsContactsOfficial bootstrap={bootstrap} notify={notify} onNavigate={go} apiAction={api} refreshBootstrap={refreshBootstrap} /> : null}
        {activePage === "templates" ? <TemplatesOfficial role={role} bootstrap={bootstrap} notify={notify} apiAction={api} onNavigate={go} /> : null}
        {activePage === "reports" ? <ReportsOfficial role={role} bootstrap={bootstrap} notify={notify} apiAction={api} onNavigate={go} /> : null}
        {activePage === "chips-users" && role === "admin" ? (
          <ChipsUsersOfficial bootstrap={bootstrap} notify={notify} apiAction={api} />
        ) : null}
        {activePage === "settings" && role === "admin" ? <SettingsView /> : null}
        {activePage === "profile" ? (
          <ProfileView profile={bootstrap.profile} />
        ) : null}
      </main>

      {!operationsMode ? <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map(([key, label, icon]) => (
          <button key={key} className={activePage === key ? "active" : ""} onClick={() => go(key)}>
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav> : null}

      {toast ? (
        <Toast
          message={toast.text}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
