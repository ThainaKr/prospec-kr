import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./prospecTheme.css";
import "./funnelTheme.css";
import "./chipIntelligence.css";
import "./notificationsTheme.css";
import "./premiumGlow.css";
import "./allScreens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
