import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const bridgeUrl = (Deno.env.get("WHATSAPP_BRIDGE_URL") ?? "").replace(/\/$/, "");
const bridgeKey = Deno.env.get("WHATSAPP_BRIDGE_API_KEY") ?? "";
const webhookKey = Deno.env.get("WHATSAPP_BRIDGE_WEBHOOK_KEY") ?? "";
const headers = { "content-type": "application/json" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function userFor(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return (await admin.auth.getUser(token)).data.user ?? null;
}

async function bridge(path: string, init: RequestInit) {
  if (!bridgeUrl || !bridgeKey) throw new Error("Servidor de sessões ainda não configurado.");
  return fetch(`${bridgeUrl}${path}`, { ...init, headers: { ...headers, "x-api-key": bridgeKey, ...(init.headers ?? {}) } });
}

async function send(req: Request, input: Record<string, unknown>) {
  const user = await userFor(req);
  if (!user) return reply({ ok: false, error: "Sessão inválida." }, 401);
  const conversationId = String(input.conversationId ?? "");
  const body = String(input.body ?? "").trim();
  const { data: profile } = await admin.from("profiles").select("organization_id,active,status").eq("id", user.id).single();
  const { data: conversation } = await admin.from("conversations").select("*,whatsapp_channels(*)").eq("id", conversationId).single();
  if (!profile?.active || profile.status !== "active" || !conversation || conversation.organization_id !== profile.organization_id) return reply({ ok: false, error: "Acesso negado." }, 403);
  const channel = conversation.whatsapp_channels;
  if (channel.status !== "connected" || channel.session_state !== "connected") return reply({ ok: false, error: "Este WhatsApp está desconectado." }, 409);
  const sent = await bridge(`/instances/${encodeURIComponent(channel.bridge_instance_id)}/messages/text`, { method: "POST", body: JSON.stringify({ to: conversation.remote_wa_id, text: body }) });
  const result = await sent.json();
  if (!sent.ok) return reply({ ok: false, error: result.error ?? "O WhatsApp recusou o envio." }, 502);
  const { data: message, error } = await admin.from("messages").insert({ organization_id: conversation.organization_id, conversation_id: conversation.id, provider_message_id: result.messageId, direction: "outbound", message_type: "text", body, status: "sent", sent_by: user.id }).select().single();
  if (error) return reply({ ok: false, error: error.message }, 500);
  await admin.from("conversations").update({ last_message_at: new Date().toISOString(), last_message_preview: body }).eq("id", conversation.id);
  return reply({ ok: true, message });
}

async function manageInstance(req: Request, input: Record<string, unknown>) {
  const user = await userFor(req);
  if (!user) return reply({ ok: false, error: "Sessão inválida." }, 401);
  const channelId = String(input.channelId ?? "");
  const { data: profile } = await admin.from("profiles").select("organization_id,role,active,status").eq("id", user.id).single();
  if (!profile?.active || profile.status !== "active" || profile.role !== "admin") return reply({ ok: false, error: "Apenas a administradora pode conectar WhatsApps." }, 403);
  const { data: channel } = await admin.from("whatsapp_channels").select("*").eq("id", channelId).eq("organization_id", profile.organization_id).single();
  if (!channel) return reply({ ok: false, error: "Canal não encontrado." }, 404);
  const instanceId = channel.bridge_instance_id || `channel_${channel.id.replaceAll("-", "")}`;
  const action = String(input.action ?? "");
  const path = action === "start_instance"
    ? `/instances/${encodeURIComponent(instanceId)}/start`
    : action === "get_instance_qr"
      ? `/instances/${encodeURIComponent(instanceId)}/qr`
      : `/instances/${encodeURIComponent(instanceId)}`;
  const response = await bridge(path, { method: action === "start_instance" ? "POST" : "GET" });
  const result = await response.json();
  if (!response.ok) return reply({ ok: false, error: result.error ?? "Falha no servidor de sessões." }, 502);
  if (action === "start_instance") {
    await admin.from("whatsapp_channels").update({ bridge_instance_id: instanceId, provider: "whatsapp_web", connection_mode: "qr", session_state: result.state ?? "awaiting_pairing", status: result.state === "connected" ? "connected" : "connecting", last_error: null }).eq("id", channel.id);
  }
  return reply({ ok: true, instanceId, ...result });
}

async function webhook(req: Request, input: Record<string, unknown>) {
  if (!webhookKey || req.headers.get("x-webhook-key") !== webhookKey) return reply({ ok: false }, 401);
  const instanceId = String(input.instanceId ?? "");
  const { data: channel } = await admin.from("whatsapp_channels").select("*").eq("bridge_instance_id", instanceId).maybeSingle();
  if (!channel) return reply({ ok: true });
  if (input.event === "connection") {
    const connected = input.state === "connected";
    await admin.from("whatsapp_channels").update({ session_state: input.state, status: connected ? "connected" : "error", last_connected_at: connected ? new Date().toISOString() : channel.last_connected_at, disconnected_at: connected ? null : new Date().toISOString(), last_error: input.error ?? null }).eq("id", channel.id);
  }
  if (input.event === "message") {
    const remote = String(input.from ?? "");
    const created = typeof input.timestamp === "string" ? input.timestamp : new Date().toISOString();
    const { data: conversation } = await admin.from("conversations").upsert({ organization_id: channel.organization_id, channel_id: channel.id, remote_wa_id: remote, display_name: input.pushName ?? remote, status: "open", unread_count: 1, last_message_at: created, last_message_preview: input.text ?? `[${input.type ?? "mensagem"}]` }, { onConflict: "channel_id,remote_wa_id" }).select().single();
    if (conversation) await admin.from("messages").upsert({ organization_id: channel.organization_id, conversation_id: conversation.id, provider_message_id: input.messageId, direction: "inbound", message_type: input.type ?? "text", body: input.text ?? null, media_url: input.mediaUrl ?? null, status: "received", provider_timestamp: created }, { onConflict: "provider_message_id" });
  }
  return reply({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ ok: false }, 405);
  const input = await req.json();
  if (input.action === "bridge_webhook") return webhook(req, input);
  if (input.action === "send_text") return send(req, input);
  if (["start_instance", "get_instance", "get_instance_qr"].includes(String(input.action))) return manageInstance(req, input);
  return reply({ ok: false, error: "Ação desconhecida." }, 400);
});
