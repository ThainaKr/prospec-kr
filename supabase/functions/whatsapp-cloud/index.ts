import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "content-type": "application/json" };
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") ?? "";
const verifyToken = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") ?? "";
const appSecret = Deno.env.get("META_WHATSAPP_APP_SECRET") ?? "";
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function validSignature(raw: string, signature: string | null) {
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = "sha256=" + [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index++) diff |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return diff === 0;
}

async function authenticatedUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

async function sendText(req: Request) {
  const user = await authenticatedUser(req);
  if (!user) return response({ ok: false, error: "Sessão inválida." }, 401);
  const { conversationId, body } = await req.json();
  if (!conversationId || typeof body !== "string" || !body.trim()) return response({ ok: false, error: "Mensagem inválida." }, 400);

  const { data: profile } = await admin.from("profiles").select("organization_id,active,status").eq("id", user.id).single();
  const { data: conversation } = await admin.from("conversations").select("*,whatsapp_channels(*)").eq("id", conversationId).single();
  if (!profile?.active || profile.status !== "active" || !conversation || conversation.organization_id !== profile.organization_id) return response({ ok: false, error: "Acesso negado." }, 403);
  const channel = conversation.whatsapp_channels;
  if (channel.status !== "connected" || !metaToken) return response({ ok: false, error: "Canal ainda não conectado à Meta." }, 409);

  const metaResponse = await fetch(`https://graph.facebook.com/v23.0/${channel.phone_number_id}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${metaToken}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: conversation.remote_wa_id, type: "text", text: { preview_url: false, body: body.trim() } }),
  });
  const meta = await metaResponse.json();
  if (!metaResponse.ok) {
    await admin.from("whatsapp_channels").update({ status: "error", last_error: meta?.error?.message ?? "Falha na Meta" }).eq("id", channel.id);
    return response({ ok: false, error: meta?.error?.message ?? "A Meta recusou o envio." }, 502);
  }
  const { data: message, error } = await admin.from("messages").insert({
    organization_id: conversation.organization_id, conversation_id: conversation.id, provider_message_id: meta.messages?.[0]?.id,
    direction: "outbound", message_type: "text", body: body.trim(), status: "sent", sent_by: user.id,
  }).select().single();
  if (error) return response({ ok: false, error: error.message }, 500);
  await admin.from("conversations").update({ last_message_at: new Date().toISOString(), last_message_preview: body.trim(), updated_at: new Date().toISOString() }).eq("id", conversation.id);
  return response({ ok: true, message });
}

async function receiveWebhook(req: Request) {
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) return response({ ok: false }, 401);
  const payload = JSON.parse(raw);
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    const value = change.value ?? {};
    const phoneNumberId = value.metadata?.phone_number_id;
    const { data: channel } = await admin.from("whatsapp_channels").select("*").eq("phone_number_id", phoneNumberId).maybeSingle();
    if (!channel) continue;
    await admin.from("whatsapp_channels").update({ last_webhook_at: new Date().toISOString(), status: "connected", last_error: null }).eq("id", channel.id);
    for (const incoming of value.messages ?? []) {
      const waId = incoming.from;
      const displayName = value.contacts?.find((item: { wa_id: string }) => item.wa_id === waId)?.profile?.name ?? waId;
      const { data: conversation } = await admin.from("conversations").upsert({
        organization_id: channel.organization_id, channel_id: channel.id, remote_wa_id: waId, display_name: displayName,
        status: "open", unread_count: 1, last_message_at: new Date(Number(incoming.timestamp) * 1000).toISOString(),
        last_message_preview: incoming.text?.body ?? `[${incoming.type}]`, updated_at: new Date().toISOString(),
      }, { onConflict: "channel_id,remote_wa_id" }).select().single();
      if (!conversation) continue;
      await admin.from("messages").upsert({
        organization_id: channel.organization_id, conversation_id: conversation.id, provider_message_id: incoming.id,
        direction: "inbound", message_type: incoming.type ?? "unsupported", body: incoming.text?.body ?? incoming.button?.text ?? null,
        media_id: incoming.audio?.id ?? incoming.image?.id ?? incoming.document?.id ?? incoming.video?.id ?? null,
        status: "received", provider_timestamp: new Date(Number(incoming.timestamp) * 1000).toISOString(),
      }, { onConflict: "provider_message_id" });
    }
    for (const status of value.statuses ?? []) await admin.from("messages").update({ status: status.status, updated_at: new Date().toISOString() }).eq("provider_message_id", status.id);
  }
  return response({ ok: true });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const valid = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verifyToken;
    return valid ? new Response(url.searchParams.get("hub.challenge") ?? "") : new Response("Forbidden", { status: 403 });
  }
  if (req.method === "POST" && req.headers.get("x-hub-signature-256")) return receiveWebhook(req);
  if (req.method === "POST") return sendText(req);
  return new Response("Method not allowed", { status: 405 });
});
