import express from "express";
import QRCode from "qrcode";
import pino from "pino";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const port = Number(process.env.PORT || 3000);
const apiKey = process.env.CONNECTOR_API_KEY || "";
const webhookUrl = process.env.SUPABASE_WEBHOOK_URL || "";
const webhookKey = process.env.SUPABASE_WEBHOOK_KEY || "";
const sessionsRoot = path.resolve(process.env.SESSIONS_DIR || "./sessions");
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const instances = new Map();

if (!apiKey || apiKey.length < 24) throw new Error("CONNECTOR_API_KEY deve ter pelo menos 24 caracteres.");
if (!webhookUrl || !webhookKey) throw new Error("SUPABASE_WEBHOOK_URL e SUPABASE_WEBHOOK_KEY são obrigatórios.");
await mkdir(sessionsRoot, { recursive: true });

function safeInstanceId(value) {
  const id = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("Identificador de instância inválido.");
  return id;
}

function publicState(instance) {
  return {
    instanceId: instance.id,
    state: instance.state,
    phone: instance.phone,
    qrAvailable: Boolean(instance.qr),
    lastError: instance.lastError,
    updatedAt: instance.updatedAt,
  };
}

async function notify(payload) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-key": webhookKey },
    body: JSON.stringify({ action: "bridge_webhook", ...payload }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Webhook respondeu ${response.status}`);
}

function messageContent(message) {
  const content = message.message || {};
  if (content.conversation) return { type: "text", text: content.conversation };
  if (content.extendedTextMessage?.text) return { type: "text", text: content.extendedTextMessage.text };
  if (content.imageMessage) return { type: "image", text: content.imageMessage.caption || null };
  if (content.videoMessage) return { type: "video", text: content.videoMessage.caption || null };
  if (content.audioMessage) return { type: "audio", text: null };
  if (content.documentMessage) return { type: "document", text: content.documentMessage.fileName || null };
  if (content.stickerMessage) return { type: "sticker", text: null };
  return { type: "unsupported", text: null };
}

async function startInstance(rawId) {
  const id = safeInstanceId(rawId);
  const existing = instances.get(id);
  if (existing?.socket && existing.state !== "logged_out") return publicState(existing);

  const instance = existing || { id, state: "new", qr: null, phone: null, lastError: null, updatedAt: new Date().toISOString(), socket: null };
  instances.set(id, instance);
  const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionsRoot, id));
  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    auth: state,
    version,
    browser: Browsers.windows("PROSPEC KR"),
    logger: logger.child({ instanceId: id }),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });
  instance.socket = socket;
  instance.state = "connecting";
  instance.updatedAt = new Date().toISOString();

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      instance.qr = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
      instance.state = "awaiting_pairing";
    }
    if (connection === "open") {
      instance.qr = null;
      instance.state = "connected";
      instance.phone = jidNormalizedUser(socket.user?.id || "").split("@")[0] || null;
      instance.lastError = null;
      await notify({ event: "connection", instanceId: id, state: "connected" }).catch((error) => logger.error({ error, instanceId: id }, "Falha no webhook de conexão"));
    }
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      instance.socket = null;
      instance.qr = null;
      instance.state = loggedOut ? "logged_out" : "disconnected";
      instance.lastError = lastDisconnect?.error?.message || "Conexão encerrada.";
      await notify({ event: "connection", instanceId: id, state: instance.state, error: instance.lastError }).catch((error) => logger.error({ error, instanceId: id }, "Falha no webhook de desconexão"));
      if (!loggedOut) setTimeout(() => startInstance(id).catch((error) => logger.error({ error, instanceId: id }, "Falha ao reconectar")), 5000);
    }
    instance.updatedAt = new Date().toISOString();
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      if (!message.key.remoteJid || message.key.fromMe || message.key.remoteJid.endsWith("@g.us") || message.key.remoteJid === "status@broadcast") continue;
      const content = messageContent(message);
      await notify({
        event: "message",
        instanceId: id,
        messageId: message.key.id,
        from: jidNormalizedUser(message.key.remoteJid).split("@")[0],
        pushName: message.pushName || null,
        timestamp: new Date(Number(message.messageTimestamp || Date.now() / 1000) * 1000).toISOString(),
        ...content,
      }).catch((error) => logger.error({ error, instanceId: id }, "Falha ao registrar mensagem recebida"));
    }
  });
  return publicState(instance);
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ status: "ok", instances: instances.size, uptime: Math.floor(process.uptime()) }));
app.use((req, res, next) => {
  if (req.get("x-api-key") !== apiKey) return res.status(401).json({ error: "Não autorizado." });
  next();
});
app.post("/instances/:id/start", async (req, res) => {
  try { res.json(await startInstance(req.params.id)); } catch (error) { logger.error(error); res.status(400).json({ error: error.message }); }
});
app.get("/instances/:id", (req, res) => {
  try { const instance = instances.get(safeInstanceId(req.params.id)); res.status(instance ? 200 : 404).json(instance ? publicState(instance) : { error: "Instância não encontrada." }); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.get("/instances/:id/qr", (req, res) => {
  try { const instance = instances.get(safeInstanceId(req.params.id)); res.status(instance ? 200 : 404).json(instance ? { state: instance.state, qr: instance.qr } : { error: "Instância não encontrada." }); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.post("/instances/:id/messages/text", async (req, res) => {
  try {
    const instance = instances.get(safeInstanceId(req.params.id));
    if (!instance?.socket || instance.state !== "connected") return res.status(409).json({ error: "WhatsApp desconectado." });
    const to = String(req.body?.to || "").replace(/\D/g, "");
    const text = String(req.body?.text || "").trim();
    if (!to || !text || text.length > 4096) return res.status(400).json({ error: "Destinatário ou texto inválido." });
    const result = await instance.socket.sendMessage(`${to}@s.whatsapp.net`, { text });
    res.json({ messageId: result.key.id });
  } catch (error) { logger.error(error); res.status(500).json({ error: error.message }); }
});

for (const id of String(process.env.AUTO_START_INSTANCES || "").split(",").map((item) => item.trim()).filter(Boolean)) {
  startInstance(id).catch((error) => logger.error({ error, instanceId: id }, "Falha na inicialização automática"));
}

app.listen(port, "127.0.0.1", () => logger.info({ port, sessionsRoot }, "PROSPEC KR Connector ativo"));
