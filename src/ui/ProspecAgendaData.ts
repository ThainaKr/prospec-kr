export type ProspecAgendaRecord = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  status?: string | null;
  meeting_link?: string | null;
  notes?: string | null;
  contact_id?: string | null;
  owner_id?: string | null;
  support_lawyer_id?: string | null;
  contacts?: { full_name?: string | null; company?: string | null } | null;
  owner?: { full_name?: string | null } | null;
  support?: { full_name?: string | null } | null;
};

export type ProspecAgendaItem = {
  id: string;
  time: string;
  client: string;
  company: string;
  lawyer: string;
  supportLawyer: string;
  title: string;
  type: "Reunião" | "Retorno" | "Contrato" | "Compromisso";
  tone: "orange" | "blue" | "green" | "purple";
  status: string;
  startsAt: string;
  endsAt?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  contactId?: string | null;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Porto_Velho",
  }).format(new Date(value));
}

function inferType(title: string): Pick<ProspecAgendaItem, "type" | "tone"> {
  const normalized = title.toLocaleLowerCase("pt-BR");
  if (normalized.includes("contrato")) return { type: "Contrato", tone: "green" };
  if (normalized.includes("retorno") || normalized.includes("follow")) {
    return { type: "Retorno", tone: "blue" };
  }
  if (normalized.includes("reuni")) return { type: "Reunião", tone: "orange" };
  return { type: "Compromisso", tone: "purple" };
}

export function mapAgendaRecord(record: ProspecAgendaRecord): ProspecAgendaItem {
  const inferred = inferType(record.title || "Compromisso");
  return {
    id: record.id,
    time: formatTime(record.starts_at),
    client: record.contacts?.full_name || "Cliente não vinculado",
    company: record.contacts?.company || "Empresa não informada",
    lawyer: record.owner?.full_name || "Responsável não informado",
    supportLawyer: record.support?.full_name || "Sem advogado de apoio",
    title: record.title || inferred.type,
    type: inferred.type,
    tone: inferred.tone,
    status: record.status || "scheduled",
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    meetingLink: record.meeting_link,
    notes: record.notes,
    contactId: record.contact_id,
  };
}

export function agendaRangeForView(view: "day" | "week" | "month", now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (view === "day") end.setDate(end.getDate() + 1);
  if (view === "week") end.setDate(end.getDate() + 7);
  if (view === "month") end.setMonth(end.getMonth() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}
