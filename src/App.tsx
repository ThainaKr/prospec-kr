import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import ProspecDashboard from "./ProspecDashboard";
import { productionUrl, supabase } from "./supabase";
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

function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const redirectTo = window.location.hostname === "localhost"
      ? window.location.origin
      : productionUrl;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });
    if (authError) {
      const message = authError.message.toLowerCase();
      setError(
        message.includes("convite") ||
        message.includes("database error") ||
        message.includes("not authorized") ||
        message.includes("signups not allowed")
          ? "Este e-mail não possui convite ativo para o PROSPEC KR."
          : "Não foi possível enviar o acesso. Confira o e-mail e tente novamente.",
      );
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">KR</div>
        <p className="eyebrow">ACESSO PROTEGIDO</p>
        <h1>PROSPEC KR</h1>
        {sent ? (
          <>
            <div className="success-icon">✓</div>
            <h2>Confira seu e-mail</h2>
            <p className="login-copy">
              Enviamos um link de entrada para <strong>{email}</strong>. Ele é
              de uso único e não exige senha.
            </p>
            <button className="outline-button full" onClick={() => setSent(false)}>
              Usar outro e-mail
            </button>
          </>
        ) : (
          <form onSubmit={sendLink}>
            <p className="login-copy">
              Entre com o e-mail previamente convidado pela Administradora.
            </p>
            <label className="login-label">
              <span>E-mail de acesso</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                required
              />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="primary-button login-button" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de acesso"}
            </button>
          </form>
        )}
        <p className="login-footnote">
          Seus dados ficam no banco protegido e só aparecem depois da autenticação.
        </p>
      </section>
    </main>
  );
}

function Splash() {
  return (
    <main className="splash-screen">
      <div className="brand-mark">KR</div>
      <h1>PROSPEC KR</h1>
      <div className="loading-block"><span className="spinner" />Validando seu acesso...</div>
    </main>
  );
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function acceptOnlyActiveInvitedUser(next: Session | null) {
    if (!next) return null;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("active,status")
      .eq("id", next.user.id)
      .maybeSingle();
    if (error || !profile || !profile.active || profile.status !== "active") {
      await supabase.auth.signOut({ scope: "local" });
      return null;
    }
    return next;
  }

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (active) setSession(await acceptOnlyActiveInvitedUser(data.session));

          url.searchParams.delete("code");
          url.searchParams.delete("state");
          window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (active) setSession(await acceptOnlyActiveInvitedUser(data.session));
      } catch (reason) {
        console.error("Falha ao concluir autenticação:", reason);
        if (active) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    initializeAuth();
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        void acceptOnlyActiveInvitedUser(next).then((validated) => {
          if (active) setSession(validated);
          if (active) setLoading(false);
        });
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <Splash />;
  if (!session) return <Login />;

  const route = normalizeRoute(window.location.pathname);

  if (route === "/" || route === "/app") return <ProspecRealHome />;
  if (route === "/painel-antigo") return <ProspecDashboard session={session} />;

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
