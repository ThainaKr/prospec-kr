export type WhatsAppOpeningMethod = "app" | "web";

export type WhatsAppOpeningConfig = {
  opening_method?: WhatsAppOpeningMethod;
  app_package?: string | null;
  app_component?: string | null;
  app_label?: string | null;
  browser_name?: string | null;
  browser_package?: string | null;
  web_url_template?: string | null;
};

const DEFAULT_WEB_TEMPLATE = "https://web.whatsapp.com/send?phone={PHONE}";

const BROWSER_PACKAGES: Record<string, string> = {
  firefox: "org.mozilla.firefox",
  kiwi: "com.kiwibrowser.browser",
  brave: "com.brave.browser",
  chrome: "com.android.chrome",
  edge: "com.microsoft.emmx",
};

const cleanPhone = (value: string) => value.replace(/\D/g, "");

const intentPart = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/=/g, "\\=");

const toIntentUrl = (url: string, packageName?: string | null, component?: string | null) => {
  const parsed = new URL(url);
  const target = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  const parts = [`intent://${target}#Intent`, `scheme=${parsed.protocol.replace(":", "")}`];
  if (packageName) parts.push(`package=${intentPart(packageName)}`);
  if (component) parts.push(`component=${intentPart(component)}`);
  parts.push("action=android.intent.action.VIEW", "end");
  return parts.join(";");
};

export function resolveBrowserPackage(config: WhatsAppOpeningConfig) {
  if (config.browser_package?.trim()) return config.browser_package.trim();
  return BROWSER_PACKAGES[String(config.browser_name || "").trim().toLowerCase()] || null;
}

export function buildWhatsAppOpeningUrl(
  config: WhatsAppOpeningConfig,
  contactPhone: string,
  message = "",
) {
  const phone = cleanPhone(contactPhone);
  if (!phone) return null;

  if ((config.opening_method || "app") === "web") {
    const template = config.web_url_template?.trim() || DEFAULT_WEB_TEMPLATE;
    if (!template.includes("{PHONE}")) return null;
    const url = template
      .replaceAll("{PHONE}", phone)
      .replaceAll("{MESSAGE}", encodeURIComponent(message));
    return toIntentUrl(url, resolveBrowserPackage(config));
  }

  const query = new URLSearchParams({ phone });
  if (message) query.set("text", message);
  const url = `https://api.whatsapp.com/send?${query.toString()}`;
  return toIntentUrl(url, config.app_package, config.app_component);
}

export function openingMethodLabel(config: WhatsAppOpeningConfig) {
  if ((config.opening_method || "app") === "web") {
    return `WhatsApp Web${config.browser_name ? ` · ${config.browser_name}` : ""}`;
  }
  return config.app_label || "Aplicativo";
}
