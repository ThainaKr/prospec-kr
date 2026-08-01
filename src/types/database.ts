export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "member" | "lawyer";
export type UserStatus = "pending" | "active" | "blocked";
export type QueueStatus = "waiting" | "in_progress" | "returned_to_end" | "completed" | "recovery";
export type RecoveryStatus = "waiting" | "searching" | "new_number" | "impossible" | "recovered";
export type ChipStatus = "active" | "paused" | "restricted" | "blocked";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  status: UserStatus;
  active: boolean;
  honorific: string | null;
  job_title: string | null;
  home_page: string;
  organization_id: string | null;
  last_access_at: string | null;
}

export interface WhatsAppChannelRow {
  id: string;
  organization_id: string;
  chip_id: string | null;
  name: string;
  phone_number: string;
  phone_number_id: string | null;
  provider: "whatsapp_web" | "evolution" | "meta_cloud" | "bsp";
  owner_id: string | null;
  connection_mode: "qr" | "pairing_code" | "official_api";
  session_state: "new" | "awaiting_pairing" | "connected" | "disconnected" | "logged_out" | "error";
  status: "setup_required" | "connecting" | "connected" | "paused" | "error";
  quality_rating: string | null;
  last_webhook_at: string | null;
  last_error: string | null;
}

export interface ConversationRow {
  id: string;
  organization_id: string;
  channel_id: string;
  contact_id: string | null;
  remote_wa_id: string;
  display_name: string | null;
  status: "open" | "pending" | "resolved" | "archived";
  assigned_to: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  provider_message_id: string | null;
  direction: "inbound" | "outbound";
  message_type: string;
  body: string | null;
  media_url: string | null;
  media_duration_seconds: number | null;
  status: "queued" | "sent" | "delivered" | "read" | "failed" | "received";
  error_message: string | null;
  created_at: string;
}

export interface ContactListRow {
  id: string;
  name: string;
  bank: string | null;
  origin_bank: string | null;
  active: boolean;
  paused: boolean;
  last_activity_at: string | null;
}

export interface ContactRow {
  id: string;
  full_name: string;
  first_name: string | null;
  company: string | null;
  list_id: string | null;
  current_result: string | null;
  closing_chance: number;
  pending: boolean;
  queue_status: QueueStatus;
  recovered: boolean;
  recovery_status: RecoveryStatus | null;
  last_activity_at: string;
}

export interface RecoveryRow {
  id: string;
  contact_id: string;
  original_list_id: string;
  status: RecoveryStatus;
  attempts: number;
  recovered_phone: string | null;
  updated_at: string;
}

export interface AppointmentRow {
  id: string;
  contact_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  owner_id: string;
  support_lawyer_id: string | null;
}

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  category: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  read_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  scheduled_for: string | null;
  action_url: string | null;
  source_module: string | null;
  entity_type: string | null;
  entity_id: string | null;
}

export interface ChipRow {
  id: string;
  name: string;
  number: string;
  operator: string | null;
  status: ChipStatus;
  health_score: number;
  auto_suspended: boolean;
  last_activity_at: string | null;
}

export interface MessageTemplateRow {
  id: string;
  name: string;
  body: string;
  category: string | null;
  position: number | null;
  active: boolean;
  usage_count: number;
  library_scope: string;
}
