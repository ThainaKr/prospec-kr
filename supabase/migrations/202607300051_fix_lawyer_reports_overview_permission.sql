create or replace function private.accept_invited_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  invite public.user_invitations%rowtype;
  is_admin boolean;
begin
  select * into invite
  from public.user_invitations
  where lower(email) = lower(new.email)
    and active = true
    and accepted_at is null
  for update;

  if not found then
    raise exception 'Este e-mail não possui convite ativo para o PROSPEC KR.';
  end if;

  is_admin := invite.role = 'admin';

  insert into public.profiles
    (id, full_name, honorific, role, active, email, status, invited_at, first_access_at, last_access_at)
  values
    (new.id, invite.full_name, invite.honorific, invite.role, true, new.email, 'active', invite.created_at, now(), now())
  on conflict (id) do update set
    full_name = excluded.full_name,
    honorific = excluded.honorific,
    role = excluded.role,
    active = true,
    email = excluded.email,
    status = 'active',
    first_access_at = coalesce(public.profiles.first_access_at, now()),
    last_access_at = now();

  insert into public.user_permissions (
    user_id,
    can_send, can_view_search, can_view_models, can_view_notifications,
    can_view_reports, can_view_lists, can_manage_shared_appointments,
    can_view_home, can_view_agenda, can_view_contacts, can_view_recovery,
    can_view_reports_overview, can_view_reports_my_performance,
    can_manage_chips_users, can_view_settings, can_view_message_templates,
    can_view_profile, can_manage_recovery, can_manage_lists,
    can_manage_contacts, can_manage_templates, can_manage_reports,
    can_manage_users, can_manage_chips, updated_at
  ) values (
    new.id,
    true, true, true, true,
    true, true, true,
    true, true, true, true,
    true, true,
    is_admin, is_admin, true,
    true, is_admin, is_admin,
    is_admin, true, is_admin,
    is_admin, is_admin, now()
  )
  on conflict (user_id) do update set
    can_send = excluded.can_send,
    can_view_search = excluded.can_view_search,
    can_view_models = excluded.can_view_models,
    can_view_notifications = excluded.can_view_notifications,
    can_view_reports = excluded.can_view_reports,
    can_view_lists = excluded.can_view_lists,
    can_manage_shared_appointments = excluded.can_manage_shared_appointments,
    can_view_home = excluded.can_view_home,
    can_view_agenda = excluded.can_view_agenda,
    can_view_contacts = excluded.can_view_contacts,
    can_view_recovery = excluded.can_view_recovery,
    can_view_reports_overview = excluded.can_view_reports_overview,
    can_view_reports_my_performance = excluded.can_view_reports_my_performance,
    can_manage_chips_users = excluded.can_manage_chips_users,
    can_view_settings = excluded.can_view_settings,
    can_view_message_templates = excluded.can_view_message_templates,
    can_view_profile = excluded.can_view_profile,
    can_manage_recovery = excluded.can_manage_recovery,
    can_manage_lists = excluded.can_manage_lists,
    can_manage_contacts = excluded.can_manage_contacts,
    can_manage_templates = excluded.can_manage_templates,
    can_manage_reports = excluded.can_manage_reports,
    can_manage_users = excluded.can_manage_users,
    can_manage_chips = excluded.can_manage_chips,
    updated_at = now();

  update public.user_invitations
  set accepted_by = new.id, accepted_at = now(), active = false
  where id = invite.id;

  return new;
end;
$function$;
