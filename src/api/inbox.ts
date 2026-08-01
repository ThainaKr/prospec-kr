import { supabase } from "../supabase";
import type { ConversationRow, MessageRow, WhatsAppChannelRow } from "../types/database";

export async function loadInbox() {
  const [channelsResult, conversationsResult] = await Promise.all([
    supabase.from("whatsapp_channels").select("id,organization_id,chip_id,name,phone_number,phone_number_id,provider,owner_id,connection_mode,session_state,status,quality_rating,last_webhook_at,last_error").eq("active", true).order("name"),
    supabase.from("conversations").select("id,organization_id,channel_id,contact_id,remote_wa_id,display_name,status,assigned_to,unread_count,last_message_at,last_message_preview").neq("status", "archived").order("last_message_at", { ascending: false }),
  ]);
  if (channelsResult.error) throw channelsResult.error;
  if (conversationsResult.error) throw conversationsResult.error;
  return {
    channels: (channelsResult.data ?? []) as WhatsAppChannelRow[],
    conversations: (conversationsResult.data ?? []) as ConversationRow[],
  };
}

export async function loadMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,provider_message_id,direction,message_type,body,media_url,media_duration_seconds,status,error_message,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function sendWhatsAppMessage(conversationId: string, body: string) {
  const { data, error } = await supabase.functions.invoke("whatsapp-gateway", {
    body: { action: "send_text", conversationId, body },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Não foi possível enviar a mensagem.");
  return data.message as MessageRow;
}
