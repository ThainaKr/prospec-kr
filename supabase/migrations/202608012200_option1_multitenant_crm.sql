create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists organization_id uuid references public.organizations(id);
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists home_page text not null default '/inicio';

create table if not exists public.whatsapp_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chip_id uuid references public.chips(id) on delete set null,
  name text not null,
  phone_number text not null,
  phone_number_id text not null unique,
  business_account_id text,
  provider text not null default 'meta_cloud' check (provider in ('meta_cloud','bsp')),
  status text not null default 'setup_required' check (status in ('setup_required','connecting','connected','paused','error')),
  quality_rating text,
  last_webhook_at timestamptz,
  last_error text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.whatsapp_channels(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  remote_wa_id text not null,
  display_name text,
  status text not null default 'open' check (status in ('open','pending','resolved','archived')),
  assigned_to uuid references public.profiles(id) on delete set null,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id, remote_wa_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  provider_message_id text unique,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text' check (message_type in ('text','audio','image','document','video','sticker','location','contacts','system','unsupported')),
  body text,
  media_id text,
  media_url text,
  media_mime_type text,
  media_duration_seconds integer,
  status text not null default 'queued' check (status in ('queued','sent','delivered','read','failed','received')),
  error_code text,
  error_message text,
  sent_by uuid references public.profiles(id) on delete set null,
  template_id uuid references public.message_templates(id) on delete set null,
  provider_timestamp timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_org_last_message_idx on public.conversations(organization_id,last_message_at desc);
create index if not exists conversations_assigned_status_idx on public.conversations(assigned_to,status);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);
create index if not exists whatsapp_channels_org_status_idx on public.whatsapp_channels(organization_id,status);

alter table public.organizations enable row level security;
alter table public.whatsapp_channels enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create or replace function public.current_organization_id()
returns uuid language sql stable security invoker set search_path = '' as $$
  select organization_id from public.profiles where id = (select auth.uid()) and active = true and status = 'active'
$$;

create or replace function public.is_current_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and active = true and status = 'active' and role = 'admin')
$$;

drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations for select to authenticated
using (id = (select public.current_organization_id()));

drop policy if exists channels_member_select on public.whatsapp_channels;
create policy channels_member_select on public.whatsapp_channels for select to authenticated
using (organization_id = (select public.current_organization_id()));
drop policy if exists channels_admin_write on public.whatsapp_channels;
create policy channels_admin_write on public.whatsapp_channels for all to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.is_current_admin()))
with check (organization_id = (select public.current_organization_id()) and (select public.is_current_admin()));

drop policy if exists conversations_member_access on public.conversations;
create policy conversations_member_access on public.conversations for select to authenticated
using (organization_id = (select public.current_organization_id()) and ((select public.is_current_admin()) or assigned_to = (select auth.uid())));
drop policy if exists conversations_member_update on public.conversations;
create policy conversations_member_update on public.conversations for update to authenticated
using (organization_id = (select public.current_organization_id()) and ((select public.is_current_admin()) or assigned_to = (select auth.uid())))
with check (organization_id = (select public.current_organization_id()));

drop policy if exists messages_member_access on public.messages;
create policy messages_member_access on public.messages for select to authenticated
using (organization_id = (select public.current_organization_id()) and exists (
  select 1 from public.conversations c where c.id = conversation_id and ((select public.is_current_admin()) or c.assigned_to = (select auth.uid()))
));

revoke all on function public.current_organization_id() from public;
revoke all on function public.is_current_admin() from public;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_current_admin() to authenticated;
grant select on public.organizations, public.whatsapp_channels, public.conversations, public.messages to authenticated;
grant insert, update, delete on public.whatsapp_channels to authenticated;
grant update on public.conversations to authenticated;

insert into public.organizations(name,slug)
values ('PROSPEC KR','prospec-kr') on conflict (slug) do nothing;

update public.profiles p set organization_id = o.id
from public.organizations o where o.slug = 'prospec-kr' and p.organization_id is null;

comment on table public.whatsapp_channels is 'Canais oficiais da WhatsApp Business Platform; tokens ficam somente em secrets da Edge Function.';
