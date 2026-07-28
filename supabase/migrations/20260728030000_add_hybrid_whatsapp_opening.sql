alter table public.chips
  add column if not exists opening_method text not null default 'app',
  add column if not exists app_package text,
  add column if not exists app_component text,
  add column if not exists app_label text,
  add column if not exists browser_name text,
  add column if not exists browser_package text,
  add column if not exists web_url_template text;

alter table public.chips
  drop constraint if exists chips_opening_method_check,
  add constraint chips_opening_method_check
    check (opening_method in ('app', 'web'));

comment on column public.chips.opening_method is
  'Método da Decisão 043: app ou web.';
comment on column public.chips.web_url_template is
  'Link do WhatsApp Web contendo o marcador {PHONE}.';
