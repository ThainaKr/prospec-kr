import { useState } from "react";
import {
  ProspecAvatar,
  ProspecBadge,
  ProspecButton,
  ProspecCard,
  ProspecMetric,
  ProspecPage,
  ProspecSection,
  ProspecTabs,
} from "./ProspecUI";

export function ProspecThemePreview() {
  const [tab, setTab] = useState("overview");

  return (
    <ProspecPage>
      <ProspecSection
        title="PROSPEC KR"
        subtitle="Prévia interna do tema visual oficial"
        action={<ProspecBadge tone="orange">Rascunho</ProspecBadge>}
      >
        <ProspecTabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: "Visão geral" },
            { value: "contacts", label: "Contatos", badge: 24 },
            { value: "chips", label: "Chips", badge: 3 },
          ]}
        />
      </ProspecSection>

      <section className="prospec-metric-grid">
        <ProspecMetric label="Contatos ativos" value="387" detail="Fila operacional" tone="orange" />
        <ProspecMetric label="Reuniões" value="18" detail="Nesta semana" tone="blue" />
        <ProspecMetric label="Contratos" value="7" detail="Fechados" tone="green" />
        <ProspecMetric label="Em recuperação" value="51" detail="Aguardando validação" tone="purple" />
      </section>

      <ProspecSection title="Atividade recente" subtitle="Padrão de cards, avatares e estados">
        <div className="prospec-list-stack">
          <ProspecCard className="prospec-list-row" interactive>
            <ProspecAvatar tone="purple">AM</ProspecAvatar>
            <div className="prospec-list-row__content">
              <strong>Alessandra Martins</strong>
              <span>Reunião agendada para amanhã às 14:30</span>
            </div>
            <ProspecBadge tone="green">Agendado</ProspecBadge>
          </ProspecCard>

          <ProspecCard className="prospec-list-row" interactive>
            <ProspecAvatar tone="blue">RS</ProspecAvatar>
            <div className="prospec-list-row__content">
              <strong>Rafael Souza</strong>
              <span>Áudio enviado há 24 horas sem atualização</span>
            </div>
            <ProspecBadge tone="gold">Atenção</ProspecBadge>
          </ProspecCard>

          <ProspecCard className="prospec-list-row" interactive>
            <ProspecAvatar tone="orange">KR</ProspecAvatar>
            <div className="prospec-list-row__content">
              <strong>Chip PROSPEC 01</strong>
              <span>Índice de saúde em nível de atenção</span>
            </div>
            <ProspecBadge tone="red">Risco</ProspecBadge>
          </ProspecCard>
        </div>
      </ProspecSection>

      <ProspecSection title="Ações" subtitle="Botões oficiais do sistema">
        <div className="prospec-action-row">
          <ProspecButton>Abrir contato</ProspecButton>
          <ProspecButton variant="outline">Ver detalhes</ProspecButton>
          <ProspecButton variant="ghost">Cancelar</ProspecButton>
        </div>
      </ProspecSection>
    </ProspecPage>
  );
}
