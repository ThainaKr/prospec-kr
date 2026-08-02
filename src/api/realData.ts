import { supabase } from "../supabase";
import type {
  AppointmentRow,
  ChipRow,
  ContactListRow,
  ContactRow,
  MessageTemplateRow,
  NotificationRow,
  ProfileRow,
  RecoveryRow,
} from "../types/database";

export interface ContactPhoneRow {
  id: string;
  contact_id: string;
  phone: string;
  normalized_phone: string | null;
  whatsapp_status: string | null;
  active: boolean;
  is_primary: boolean;
}

export interface ContactEventRow {
  id: string;
  contact_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
}

export interface ChipDailyStatRow {
  id: string;
  chip_id: string;
  stat_date: string;
  messages_sent: number;
  replies_received: number;
  audios_sent: number;
  schedules_created: number;
  meetings_completed: number;
  contracts_closed: number;
  usage_minutes: number;
}

export interface RealDataSnapshot {
  profiles: ProfileRow[];
  lists: ContactListRow[];
  contacts: ContactRow[];
  recoveries: RecoveryRow[];
  appointments: AppointmentRow[];
  notifications: NotificationRow[];
  chips: ChipRow[];
  templates: MessageTemplateRow[];
}

export interface CrmDataSnapshot {
  contactPhones: ContactPhoneRow[];
  contactEvents: ContactEventRow[];
  chipDailyStats: ChipDailyStatRow[];
}

export type FullRealDataSnapshot = RealDataSnapshot & CrmDataSnapshot;

async function selectOrThrow<T>(table: string, columns: string, options?: { limit?: number; order?: { column: string; ascending?: boolean } }) {
  let query = supabase.from(table).select(columns);
  if (options?.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
  if (options?.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function loadRealDataSnapshot(): Promise<FullRealDataSnapshot> {
  const [profiles, lists, contacts, contactPhones, contactEvents, recoveries, appointments, notifications, chips, chipDailyStats, templates] = await Promise.all([
    selectOrThrow<ProfileRow>("profiles", "id,full_name,email,role,status,active,honorific,job_title,home_page,organization_id,last_access_at", { order: { column: "full_name", ascending: true } }),
    selectOrThrow<ContactListRow>("contact_lists", "id,name,bank,origin_bank,active,paused,last_activity_at", { order: { column: "updated_at" } }),
    selectOrThrow<ContactRow>("contacts", "id,full_name,first_name,company,list_id,current_result,closing_chance,pending,queue_status,recovered,recovery_status,last_activity_at", { order: { column: "last_activity_at" }, limit: 200 }),
    selectOrThrow<ContactPhoneRow>("contact_phones", "id,contact_id,phone,normalized_phone,whatsapp_status,active,is_primary", { order: { column: "created_at", ascending: true }, limit: 500 }),
    selectOrThrow<ContactEventRow>("contact_events", "id,contact_id,event_type,event_data,created_at,created_by", { order: { column: "created_at" }, limit: 300 }),
    selectOrThrow<RecoveryRow>("contact_recovery", "id,contact_id,original_list_id,status,attempts,recovered_phone,updated_at", { order: { column: "updated_at" }, limit: 100 }),
    selectOrThrow<AppointmentRow>("appointments", "id,contact_id,title,starts_at,ends_at,status,owner_id,support_lawyer_id", { order: { column: "starts_at", ascending: true }, limit: 100 }),
    selectOrThrow<NotificationRow>("notifications", "id,title,body,kind,category,priority,created_at,read_at,completed_at,archived_at,scheduled_for,action_url,source_module,entity_type,entity_id", { order: { column: "created_at" }, limit: 200 }),
    selectOrThrow<ChipRow>("chips", "id,name,number,operator,status,health_score,auto_suspended,last_activity_at", { order: { column: "name", ascending: true } }),
    selectOrThrow<ChipDailyStatRow>("chip_daily_stats", "id,chip_id,stat_date,messages_sent,replies_received,audios_sent,schedules_created,meetings_completed,contracts_closed,usage_minutes", { order: { column: "stat_date" }, limit: 100 }),
    selectOrThrow<MessageTemplateRow>("message_templates", "id,name,body,category,position,active,usage_count,library_scope", { order: { column: "position", ascending: true }, limit: 200 }),
  ]);

  return { profiles, lists, contacts, contactPhones, contactEvents, recoveries, appointments, notifications, chips, chipDailyStats, templates };
}
