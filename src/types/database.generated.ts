// Tipos gerados a partir do Supabase em 29/07/2026.
// Fonte oficial: projeto PROSPEC KR (rqrzsfgzdjyinewkrqxf).
// Este arquivo será atualizado pelo fluxo de geração de tipos antes de cada release.

export type AppRole = "admin" | "lawyer";
export type UserStatus = "pending" | "active" | "blocked";
export type ChipStatus = "active" | "paused" | "restricted" | "blocked";
export type PhoneStatus =
  | "valid"
  | "duplicate"
  | "landline"
  | "invalid"
  | "no_whatsapp"
  | "unverified"
  | "wrong_person";
export type QueueStatus =
  | "waiting"
  | "in_progress"
  | "returned_to_end"
  | "completed"
  | "recovery";
export type RecoveryStatus =
  | "waiting"
  | "searching"
  | "new_number"
  | "impossible"
  | "recovered";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type AppointmentVisibility = "common" | "private";
export type ContractStatus = "draft" | "sent" | "signed" | "cancelled";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type SendConfirmation = "sent" | "not_sent" | "wrong_person" | "no_whatsapp";
export type TemplateCategory =
  | "first_message"
  | "audio"
  | "post_audio"
  | "scheduling"
  | "meeting_reminder"
  | "post_meeting"
  | "contract_sending"
  | "follow_up"
  | "post_meeting_follow_up"
  | "return"
  | "closing";

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  honorific: string | null;
  role: AppRole;
  status: UserStatus;
  active: boolean;
  invited_at: string | null;
  first_access_at: string | null;
  last_access_at: string | null;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactListRow {
  id: string;
  name: string;
  origin_bank: string | null;
  bank: string | null;
  spreadsheet_tab: string | null;
  spreadsheet_url: string | null;
  source_spreadsheet_id: string | null;
  source_sheet_id: number | null;
  active: boolean;
  paused: boolean;
  duplicated_from: string | null;
  model_first_message_cursor: number;
  model_follow_up_cursor: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRow {
  id: string;
  cpf: string | null;
  full_name: string;
  first_name: string | null;
  company: string | null;
  company_first_name: string | null;
  list_id: string | null;
  original_list_id: string | null;
  assigned_to: string | null;
  support_lawyer_id: string | null;
  current_result: string | null;
  closing_chance: 0 | 10 | 30 | 50 | 70 | 90 | 100;
  pending: boolean;
  queue_position: number | null;
  queue_status: QueueStatus;
  recovered: boolean;
  recovery_status: RecoveryStatus | null;
  admin_notes: string | null;
  last_contact_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChipRow {
  id: string;
  name: string;
  number: string;
  operator: string | null;
  status: ChipStatus;
  health_score: number;
  auto_suspended: boolean;
  opening_method: "app" | "web";
  app_package: string | null;
  app_component: string | null;
  app_label: string | null;
  browser_name: string | null;
  browser_package: string | null;
  web_url_template: string | null;
  activated_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWorkStateRow {
  user_id: string;
  selected_list_id: string | null;
  message_type: "first_message" | "follow_up" | null;
  updated_at: string;
}
