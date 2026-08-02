import { useCallback, useEffect, useMemo, useState } from "react";
import { callProspecApi } from "../api/prospecApi";
import {
  agendaRangeForView,
  mapAgendaRecord,
  type ProspecAgendaRecord,
} from "./ProspecAgendaData";
import {
  ProspecAvatar,
  ProspecBadge,
  ProspecButton,
  ProspecCard,
  ProspecPage,
  ProspecSection,
  ProspecTabs,
} from "./ProspecUI";

type ViewMode = "day" | "week" | "month";

function formatPeriodLabel(view: ViewMode, date: Date) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: view === "day" ? "full" : "long",
    timeZone: "America/Porto_Velho",
  });
  return formatter.format(date);
}

function statusLabel(status: string) {
  const normalized = status.toLocaleLowerCase("pt-BR");
  if (normalized === "completed") return "Concluído";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelado";
  if (normalized === "rescheduled") return "Reagendado";
  return "Agendado";
}

export function ProspecAgendaLive() {
  const [view, setView] = useState<ViewMode>("day");
  const [records, setRecords] = useState<ProspecAgendaRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const anchorDate = useMemo(() => new Date(), []);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const range = agendaRangeForView(view, anchorDate);
      const data = await callProspecApi<ProspecAgendaRecord[]>("appointments", range);
      setRecords(data || []);
      setSelectedId((current) => current || data?.[0]?.id || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }, [anchorDate, view]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const items = useMemo(() => records.map(mapAgendaRecord), [records]);
  const current = items.find((item) => item.id === selectedId) || items[0] || null;

  return (
    <ProspecPage>
      <ProspecSection
        title="Agenda"
        subtitle="Compromissos reais do PROSPEC KR"
        action={<ProspecBadge tone="green">Dados conectados</ProspecBadge>}
      >
        <ProspecTabs
          value={view}
          onChange={(value) => setView(value as ViewMode)}
          items={[
            { value: "day", label: "Dia" },
            { value: "week", label: "Semana" },
            { value: "month", label: "Mês" },
          ]}
        />
      </ProspecSection>

      <ProspecSection
        title={formatPeriodLabel(view, anchorDate)}
        subtitle={`${items.length} compromisso${items.length === 1 ? "" : "s"}`}
        action={<ProspecButton variant="outline" onClick={() => void loadAppointments()}>Atualizar</ProspecButton>}
      >
        {loading ? <div className="loading-block"><span className="spinner" />Carregando agenda...</div> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <ProspecCard><p className="prospec-empty-copy">Nenhum compromisso encontrado para este período.</p></ProspecCard>
        ) : null}
        {!loading && items.length > 0 ? (
          <div className="prospec-list-stack">
            {items.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)}>
                <ProspecCard className={`prospec-list-row${current?.id === item.id ? " is-selected" : ""}`} interactive>
                  <ProspecAvatar tone={item.tone}>{item.time}</ProspecAvatar>
                  <div className="prospec-list-row__content">
                    <strong>{item.client}</strong>
                    <span>{item.type} com {item.lawyer}</span>
                  </div>
                  <ProspecBadge tone={item.tone}>{statusLabel(item.status)}</ProspecBadge>
                </ProspecCard>
              </button>
            ))}
          </div>
        ) : null}
      </ProspecSection>

      {current ? (
        <ProspecSection title="Detalhes do compromisso">
          <ProspecCard>
            <div className="prospec-detail-grid">
              <div><span className="prospec-detail-label">Cliente</span><strong>{current.client}</strong></div>
              <div><span className="prospec-detail-label">Empresa</span><strong>{current.company || "Não informada"}</strong></div>
              <div><span className="prospec-detail-label">Horário</span><strong>{current.time}</strong></div>
              <div><span className="prospec-detail-label">Responsável</span><strong>{current.lawyer}</strong></div>
              <div><span className="prospec-detail-label">Advogado de apoio</span><strong>{current.supportLawyer || "Não informado"}</strong></div>
              <div><span className="prospec-detail-label">Tipo</span><ProspecBadge tone={current.tone}>{current.type}</ProspecBadge></div>
            </div>
            {current.notes ? <p className="prospec-detail-notes">{current.notes}</p> : null}
            <div className="prospec-action-row">
              {current.meetingLink ? (
                <a className="prospec-button primary" href={current.meetingLink} target="_blank" rel="noreferrer">Abrir reunião</a>
              ) : null}
              <ProspecButton variant="outline" disabled>Editar na próxima etapa</ProspecButton>
            </div>
          </ProspecCard>
        </ProspecSection>
      ) : null}
    </ProspecPage>
  );
}
