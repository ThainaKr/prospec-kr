import type { ReactNode } from "react";
import ProspecDashboard from "./ProspecDashboard";
import { ProspecAgendaLive } from "./ui/ProspecAgendaLive";
import { ProspecAgendaPreview } from "./ui/ProspecAgendaPreview";
import { ProspecThemePreview } from "./ui/ProspecThemePreview";
import { ProspecAttendancePreview } from "./ui/ProspecAttendancePreview";
import { ProspecFunnelPreview } from "./ui/ProspecFunnelPreview";
import { ProspecChipIntelligencePreview } from "./ui/ProspecChipIntelligencePreview";
import { ProspecReportsPreview } from "./ui/ProspecReportsPreview";
import { ProspecNotificationsPreview } from "./ui/ProspecNotificationsPreview";
import { ProspecAllScreensPreview } from "./ui/ProspecAllScreensPreview";
import { ProspecRealDataPreview } from "./ui/ProspecRealDataPreview";
import { ProspecRealHome } from "./ui/ProspecRealHome";
import { ProspecListsContactsReal } from "./ui/ProspecListsContactsReal";
import { ProspecAgendaNotificationsReal } from "./ui/ProspecAgendaNotificationsReal";
import { ProspecReportsReal } from "./ui/ProspecReportsReal";
import { ProspecChipsUsersReal } from "./ui/ProspecChipsUsersReal";

const APP_BASE_PATH = "/prospec-kr";

function normalizeRoute(pathname: string) {
  const withoutBase = pathname.startsWith(APP_BASE_PATH)
    ? pathname.slice(APP_BASE_PATH.length)
    : pathname;
  return withoutBase.replace(/\/+$/, "") || "/";
}

function appRootUrl() {
  return `${window.location.origin}${APP_BASE_PATH}/`;
}

function NotFound() {
  return (
    <main className="prospec-app real-data-state">
      <section className="prospec-card">
        <p className="eyebrow">PROSPEC KR</p>
        <h1>Página não encontrada</h1>
        <p>O endereço informado não pertence às rotas oficiais do sistema.</p>
        <button className="prospec-button-primary" onClick={() => { window.location.href = appRootUrl(); }}>
          Voltar ao sistema
        </button>
      </section>
    </main>
  );
}

const INTERNAL_PREVIEWS: Record<string, () => ReactNode> = {
  "/visual-preview": () => <ProspecThemePreview />,
  "/agenda-preview": () => <ProspecAgendaPreview />,
  "/atendimento-preview": () => <ProspecAttendancePreview />,
  "/funil-preview": () => <ProspecFunnelPreview />,
  "/chips-inteligencia-preview": () => <ProspecChipIntelligencePreview />,
  "/relatorios-preview": () => <ProspecReportsPreview />,
  "/notificacoes-preview": () => <ProspecNotificationsPreview />,
  "/todas-as-telas-preview": () => <ProspecAllScreensPreview />,
};

export default function App() {
  const route = normalizeRoute(window.location.pathname);

  if (route === "/" || route === "/app" || route === "/painel-antigo") {
    return <ProspecDashboard />;
  }

  if (route === "/inicio" || route === "/inicio-real") return <ProspecRealHome />;
  if (route === "/funis") return <ProspecFunnelPreview />;
  if (route === "/listas-contatos" || route === "/listas-contatos-real") return <ProspecListsContactsReal />;
  if (route === "/agenda" || route === "/agenda-live") return <ProspecAgendaLive />;
  if (route === "/agenda-notificacoes" || route === "/agenda-notificacoes-real") return <ProspecAgendaNotificationsReal />;
  if (route === "/relatorios" || route === "/relatorios-real") return <ProspecReportsReal />;
  if (route === "/chips-usuarios" || route === "/chips-usuarios-real") return <ProspecChipsUsersReal />;
  if (route === "/dados-reais") return <ProspecRealDataPreview />;

  const preview = INTERNAL_PREVIEWS[route];
  if (preview) return preview();

  return <NotFound />;
}
