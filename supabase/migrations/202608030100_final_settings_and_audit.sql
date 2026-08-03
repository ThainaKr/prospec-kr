create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "admin_read_audit_logs" on public.audit_logs;
create policy "admin_read_audit_logs" on public.audit_logs
for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

insert into public.app_settings (key, value)
values
  ('company_profile', '{"company_name":"PROSPEC KR","date_format":"dd/MM/yyyy","time_format":"24h","timezone":"America/Porto_Velho","default_home_page":"atendimento","navigation_behavior":"expanded"}'::jsonb),
  ('whatsapp_architecture', '{"mode":"android_distributed_manual_confirmation","paid_vps_required":false,"official_api_required":false}'::jsonb),
  ('model_preferences', '{"sequential_distribution":true,"variables":["{NOME}","{EMPRESA}"]}'::jsonb),
  ('notification_preferences', '{}'::jsonb)
on conflict (key) do nothing;
