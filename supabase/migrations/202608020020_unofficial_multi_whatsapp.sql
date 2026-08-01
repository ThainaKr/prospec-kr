alter table public.whatsapp_channels
  alter column phone_number_id drop not null,
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists connection_mode text not null default 'qr'
    check (connection_mode in ('qr','pairing_code','official_api')),
  add column if not exists session_state text not null default 'new'
    check (session_state in ('new','awaiting_pairing','connected','disconnected','logged_out','error')),
  add column if not exists bridge_instance_id text,
  add column if not exists last_connected_at timestamptz,
  add column if not exists disconnected_at timestamptz;

alter table public.whatsapp_channels drop constraint if exists whatsapp_channels_provider_check;
alter table public.whatsapp_channels add constraint whatsapp_channels_provider_check
  check (provider in ('whatsapp_web','evolution','meta_cloud','bsp'));
alter table public.whatsapp_channels alter column provider set default 'whatsapp_web';

create unique index if not exists whatsapp_channels_bridge_instance_unique
  on public.whatsapp_channels(bridge_instance_id) where bridge_instance_id is not null;

comment on table public.whatsapp_channels is
  'Canais multi-WhatsApp: contas comuns/Business conectadas por sessão web e canais oficiais opcionais.';
