"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from "react";
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
  ["funnel", "Funil", "▽"],
  ["notifications", "Notificações", "●"],
  ["agenda", "Agenda", "▦"],
  ["lists", "Listas", "☷"],
  ["reports", "Relatórios", "▥"],
  ["chips-users", "Chips e Usuários", "◉"],
];

const LAWYER_NAV: Array<[PageKey, string, string]> = [
  ["home", "Início", "⌂"],
  ["funnel", "Funil", "▽"],
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
  role,
  notify,
}: {
  bootstrap: AnyRecord;
  role: string;
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const lists = bootstrap.lists || [];
  const [listId, setListId] = useState(bootstrap.work_state?.selected_list_id || "");
  const [messageType, setMessageType] = useState(
    role === "admin" ? (bootstrap.work_state?.message_type || "") : "follow_up",
  );
  const [queue, setQueue] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateCount, setTemplateCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [chipCount, setChipCount] = useState(0);
  const [results, setResults] = useState<Record<string, string>>({});
  const [inProgress, setInProgress] = useState<Record<string, boolean>>({});

  const loadQueue = useCallback(async () => {
    if (!listId || !messageType) {
      setQueue([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api("home", { listId, messageType });
      setQueue(data.queue || []);
      setQueueCount(data.queue_count || 0);
      setTemplateCount(data.template_count || 0);
      setChipCount(data.chip_count || 0);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
    } finally {
      setLoading(false);
    }
  }, [listId, messageType, notify]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const persistSelection = async (nextListId: string, nextMessageType: string) => {
    try {
      await api("save_work_state", { listId: nextListId, messageType: nextMessageType });
    } catch {
      // Mantém a tela utilizável; a próxima escolha tentará salvar novamente.
    }
  };

  const chooseList = (nextListId: string) => {
    setListId(nextListId);
    persistSelection(nextListId, messageType);
  };

  const chooseMessageType = (nextMessageType: string) => {
    setMessageType(nextMessageType);
    persistSelection(listId, nextMessageType);
  };

  const openWhatsApp = async (contact: AnyRecord) => {
    const phone = contact.phones?.[0];
    if (!phone) {
      notify("Este contato não possui telefone válido.", "error");
      return;
    }
    if (!contact.chip?.id || contact.chip.status !== "active") {
      notify("Nenhum chip ativo está disponível para este contato.", "error");
      return;
    }
    const text = contact.template?.body
      ? substituteTemplate(contact.template.body, contact)
      : "";
    const href = buildWhatsAppOpeningUrl(
      contact.chip,
      phone.phone_normalized || phone.phone_original,
      text,
    );
    if (!href) {
      notify(`Revise o método de abertura cadastrado para o chip +${contact.chip.number}.`, "error");
      return;
    }
    try {
      await api("mark_in_progress", {
        contactId: contact.id,
        phoneId: phone.id,
        templateId: contact.template?.id,
        chipId: contact.chip?.id,
      });
      setInProgress((current) => ({ ...current, [contact.id]: true }));
      window.location.href = href;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível marcar em andamento.", "error");
    }
  };

  const saveResult = async (contact: AnyRecord) => {
    const result = results[contact.id];
    if (!result) {
      notify("Escolha o resultado antes de salvar.", "error");
      return;
    }
    try {
      await api("record_result", {
        contactId: contact.id,
        phoneId: contact.phones?.[0]?.id,
        result,
      });
      notify(
        result === "Sem WhatsApp" || result === "Telefone inválido"
          ? "Contato enviado para Recuperação."
          : "Resultado registrado.",
      );
      setQueue((current) => current.filter((item) => item.id !== contact.id));
      window.setTimeout(loadQueue, 250);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar.", "error");
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">FILA DE PROSPECÇÃO</p>
          <h2>Escolha uma lista para começar</h2>
          <p>Primeiro selecione a lista. Depois defina a abordagem da fila.</p>
        </div>
        <span className="hero-count">{bootstrap.counters?.contacts || 0}</span>
      </section>

      <section className="selector-card">
        <label>
          <span>1. Planilha / lista</span>
          <select value={listId} onChange={(event) => chooseList(event.target.value)}>
            <option value="">Selecione a lista</option>
            {lists.map((list: AnyRecord) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.contacts_count})
              </option>
            ))}
          </select>
        </label>
        <div className="approach-picker">
          <span>2. Tipo de mensagem</span>
          <div>
            <button
              className={messageType === "first_message" ? "active" : ""}
              onClick={() => chooseMessageType("first_message")}
              disabled={!listId || role !== "admin"}
            >
              1ª mensagem
            </button>
            <button
              className={messageType === "follow_up" ? "active" : ""}
              onClick={() => chooseMessageType("follow_up")}
              disabled={!listId}
            >
              Follow-up
            </button>
          </div>
        </div>
        {messageType && listId ? (
          <p className="helper-text">
            {queueCount} contato(s) nesta fila · {templateCount} modelo(s) · {chipCount} chip(s) ativo(s).
            {!templateCount ? " O WhatsApp abrirá sem texto." : ""}
          </p>
        ) : null}
      </section>

      {!listId || !messageType ? (
        <EmptyState
          icon="↗"
          title="A fila aparece depois das duas escolhas"
          text="Selecione a lista e o tipo de mensagem para carregar os próximos cinco contatos."
        />
      ) : loading ? (
        <LoadingBlock label="Preparando os próximos contatos..." />
      ) : queue.length === 0 ? (
        <EmptyState
          icon="✓"
          title="Nenhum contato disponível nesta fila"
          text="Os contatos concluídos ou em Recuperação não aparecem aqui."
        />
      ) : (
        <section className="queue-grid">
          {queue.map((contact, index) => (
            <article className="contact-card" key={contact.id}>
              <div className="contact-card-head">
                <span className="queue-number">{index + 1}</span>
                <div>
                  <h3>{titleCaseFirst(contact.full_name)}</h3>
                  <p>{titleCaseFirst(contact.company) || "Empresa não informada"}</p>
                </div>
                <span className={`status-pill ${inProgress[contact.id] || contact.queue_status === "in_progress" ? "active" : "waiting"}`}>
                  {inProgress[contact.id] || contact.queue_status === "in_progress" ? "Em andamento" : "Na fila"}
                </span>
              </div>
              <div className="contact-meta">
                <span>{maskCpf(contact.cpf)}</span>
                <span>{contact.phones?.length || 0} telefone(s)</span>
                {contact.template ? <span>{contact.template.name}</span> : null}
                {contact.chip ? <span>Chip: {contact.chip.name} · +{contact.chip.number}</span> : <span>Sem chip ativo</span>}
              </div>
              {contact.template?.body ? (
                <div className="message-preview">
                  {substituteTemplate(contact.template.body, contact)}
                </div>
              ) : null}
              <div className="contact-actions">
                <button className="whatsapp-button" onClick={() => openWhatsApp(contact)}>
                  WhatsApp
                </button>
                <select
                  value={results[contact.id] || ""}
                  onChange={(event) =>
                    setResults((current) => ({
                      ...current,
                      [contact.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Resultado</option>
                  {RESULT_OPTIONS.map((result) => (
                    <option key={result}>{result}</option>
                  ))}
                </select>
                <button className="outline-button compact" onClick={() => saveResult(contact)}>
                  Salvar
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
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

const FUNNEL_STAGES = [
  { key: "new", label: "Novo contato", matches: ["sem resultado", "novo"] },
  { key: "initial", label: "Contato inicial", matches: ["primeira mensagem", "áudio enviado", "sem resposta"] },
  { key: "interest", label: "Interesse demonstrado", matches: ["interesse", "retornar depois"] },
  { key: "meeting", label: "Reunião agendada", matches: ["agendamento", "reunião agendada", "reunião realizada"] },
  { key: "proposal", label: "Proposta enviada", matches: ["proposta", "contrato enviado"] },
  { key: "closed", label: "Contrato fechado", matches: ["contrato fechado", "cliente"] },
];

function funnelStageFor(result?: string) {
  const normalized = String(result || "Sem resultado").trim().toLocaleLowerCase("pt-BR");
  return FUNNEL_STAGES.find((stage) =>
    stage.matches.some((match) => normalized.includes(match)),
  )?.key || "new";
}

function FunnelView({ notify }: { notify: (text: string, tone?: "success" | "error") => void }) {
  const [contacts, setContacts] = useState<AnyRecord[]>([]);
  const [reports, setReports] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([api("contacts", { page: 0, search: "" }), api("reports")])
      .then(([contactData, reportData]) => {
        setContacts(contactData?.contacts || []);
        setReports(reportData || {});
      })
      .catch((error) => notify(error instanceof Error ? error.message : "Não foi possível carregar o funil.", "error"))
      .finally(() => setLoading(false));
  }, [notify]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return contacts;
    return contacts.filter((contact) =>
      [contact.full_name, contact.company, contact.current_result].some((value) =>
        String(value || "").toLocaleLowerCase("pt-BR").includes(term),
      ),
    );
  }, [contacts, search]);
  const stages = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    contacts: visible.filter((contact) => funnelStageFor(contact.current_result) === stage.key),
  }));
  const total = Number(reports?.total ?? contacts.length);
  const closed = stages.find((stage) => stage.key === "closed")?.contacts.length || 0;
  const conversion = total ? (closed / total) * 100 : 0;

  if (loading) return <LoadingBlock label="Montando o funil..." />;
  return (
    <div className="page-stack funnel-page">
      <section className="funnel-heading-card">
        <div><p className="eyebrow">GESTÃO DO FUNIL</p><h2>Funis de Atendimento</h2><p>Acompanhe o avanço real dos contatos em cada etapa.</p></div>
        <div className="funnel-heading-actions"><select defaultValue="principal" aria-label="Selecionar funil"><option value="principal">Funil principal</option></select><button className="primary-button small">+ Novo funil</button></div>
      </section>
      <section className="funnel-summary-grid">
        {[["Total de contatos", total], ["Em andamento", Math.max(0, total - closed)], ["Convertidos", closed], ["Taxa de conversão", `${conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`], ["Reuniões", reports?.appointments ?? 0]].map(([label, value]) => (
          <article className="funnel-summary-card" key={String(label)}><span>{label}</span><strong>{value}</strong><small>Dados atuais do sistema</small></article>
        ))}
      </section>
      <section className="funnel-toolbar-card"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contatos, empresas ou etapas..." aria-label="Buscar no funil"/><span>{visible.length} contato(s) exibido(s)</span></section>
      <section className="funnel-board" aria-label="Etapas do funil">
        {stages.map((stage, index) => (
          <article className={`funnel-column stage-${stage.key}`} key={stage.key}>
            <header><div><b>{index + 1}. {stage.label}</b><small>{stage.contacts.length} contato(s)</small></div><span>{stage.contacts.length}</span></header>
            <div className="funnel-column-body">
              {stage.contacts.slice(0, 20).map((contact) => (
                <button className="funnel-contact-card" key={contact.id}><span className="avatar">{firstWord(contact.full_name).slice(0, 1)}</span><span><strong>{contact.full_name}</strong><small>{contact.company || "Empresa não informada"}</small><em>{contact.current_result || "Novo"}</em></span><b>›</b></button>
              ))}
              {!stage.contacts.length ? <div className="funnel-empty-column">Nenhum contato nesta etapa</div> : null}
            </div>
          </article>
        ))}
      </section>
      <section className="funnel-analysis-grid">
        <article className="chart-card"><p className="eyebrow">PERFORMANCE DO FUNIL</p><h2>Contatos por etapa</h2><div className="funnel-bars">{stages.map((stage) => <div key={stage.key}><span>{stage.label}</span><b><i style={{ width: `${total ? Math.max(3, (stage.contacts.length / total) * 100) : 0}%` }}/></b><strong>{stage.contacts.length}</strong></div>)}</div></article>
        <article className="chart-card funnel-activity-card"><p className="eyebrow">ATIVIDADES RECENTES</p><h2>Últimas movimentações</h2>{contacts.slice(0, 5).map((contact) => <div className="funnel-activity" key={contact.id}><span>◉</span><div><strong>{contact.full_name}</strong><small>{contact.current_result || "Novo contato"}</small></div><time>{formatDate(contact.last_activity_at, false)}</time></div>)}{!contacts.length ? <p className="quiet-row">Nenhuma movimentação registrada.</p> : null}</article>
      </section>
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
    funnel: ["Funil", "Acompanhe contatos, avanço e conversão por etapa."],
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

  return (
    <div className="app-shell">
      <Header
        title={titles[activePage][0]}
        subtitle={titles[activePage][1]}
        onMenu={() => setMenuOpen(true)}
        badge={bootstrap.counters?.notifications}
      />

      <aside className={`side-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
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
      </aside>
      {menuOpen ? <button className="drawer-backdrop" onClick={() => setMenuOpen(false)} /> : null}

      <main className="app-content">
        {activePage === "home" ? <HomeView bootstrap={bootstrap} role={role} notify={notify} /> : null}
        {activePage === "funnel" ? <FunnelView notify={notify} /> : null}
        {activePage === "notifications" ? <NotificationsView notify={notify} /> : null}
        {activePage === "agenda" ? <AgendaView notify={notify} /> : null}
        {activePage === "lists" ? (
          <ListsView
            bootstrap={bootstrap}
            notify={notify}
            refreshBootstrap={refreshBootstrap}
          />
        ) : null}
        {activePage === "templates" ? <TemplatesView role={role} notify={notify} /> : null}
        {activePage === "reports" ? <ReportsView notify={notify} /> : null}
        {activePage === "chips-users" && role === "admin" ? (
          <ChipsUsersView notify={notify} />
        ) : null}
        {activePage === "settings" && role === "admin" ? <SettingsView /> : null}
        {activePage === "profile" ? (
          <ProfileView profile={bootstrap.profile} />
        ) : null}
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map(([key, label, icon]) => (
          <button key={key} className={activePage === key ? "active" : ""} onClick={() => go(key)}>
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>

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
