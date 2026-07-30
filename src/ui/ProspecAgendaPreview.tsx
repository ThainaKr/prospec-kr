import { useMemo, useState } from "react";
import {
  ProspecAvatar,
  ProspecBadge,
  ProspecButton,
  ProspecCard,
  ProspecPage,
  ProspecSection,
  ProspecTabs,
} from "./ProspecUI";

type AgendaItem = {
  time: string;
  client: string;
  lawyer: string;
  type: "Reunião" | "Retorno" | "Contrato";
  tone: "orange" | "blue" | "green";
};

const agenda: AgendaItem[] = [
  { time: "09:00", client: "Carla Menezes", lawyer: "Ana Paula", type: "Reunião", tone: "orange" },
  { time: "11:30", client: "Marcos Lima", lawyer: "Rafael Souza", type: "Retorno", tone: "blue" },
  { time: "15:00", client: "Juliana Prado", lawyer: "Ana Paula", type: "Contrato", tone: "green" },
];

export function ProspecAgendaPreview() {
  const [view, setView] = useState("day");
  const [selected, setSelected] = useState(0);
  const current = useMemo(() => agenda[selected], [selected]);

  return (
    <ProspecPage>
      <ProspecSection
        title="Agenda"
        subtitle="Compromissos, retornos e reuniões do dia"
        action={<ProspecBadge tone="orange">Prévia funcional</ProspecBadge>}
      >
        <ProspecTabs
          value={view}
          onChange={setView}
          items={[
            { value: "day", label: "Dia" },
            { value: "week", label: "Semana" },
            { value: "month", label: "Mês" },
          ]}
        />
      </ProspecSection>

      <ProspecSection title="Hoje, 30 de julho" subtitle="3 compromissos confirmados">
        <div className="prospec-list-stack">
          {agenda.map((item, index) => (
            <button key={`${item.time}-${item.client}`} onClick={() => setSelected(index)}>
              <ProspecCard className={`prospec-list-row${selected === index ? " is-selected" : ""}`} interactive>
                <ProspecAvatar tone={item.tone}>{item.time}</ProspecAvatar>
                <div className="prospec-list-row__content">
                  <strong>{item.client}</strong>
                  <span>{item.type} com {item.lawyer}</span>
                </div>
                <ProspecBadge tone={item.tone}>{item.type}</ProspecBadge>
              </ProspecCard>
            </button>
          ))}
        </div>
      </ProspecSection>

      <ProspecSection title="Detalhes do compromisso">
        <ProspecCard>
          <div className="prospec-detail-grid">
            <div>
              <span className="prospec-detail-label">Cliente</span>
              <strong>{current.client}</strong>
            </div>
            <div>
              <span className="prospec-detail-label">Horário</span>
              <strong>{current.time}</strong>
            </div>
            <div>
              <span className="prospec-detail-label">Responsável</span>
              <strong>{current.lawyer}</strong>
            </div>
            <div>
              <span className="prospec-detail-label">Tipo</span>
              <ProspecBadge tone={current.tone}>{current.type}</ProspecBadge>
            </div>
          </div>
          <div className="prospec-action-row">
            <ProspecButton>Abrir contato</ProspecButton>
            <ProspecButton variant="outline">Editar agenda</ProspecButton>
          </div>
        </ProspecCard>
      </ProspecSection>
    </ProspecPage>
  );
}
