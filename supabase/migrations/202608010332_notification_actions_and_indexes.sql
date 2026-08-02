create index if not exists notifications_recipient_open_idx on public.notifications (recipient_id, created_at desc) where archived_at is null;
create index if not exists notifications_category_open_idx on public.notifications (category, created_at desc) where archived_at is null;

create or replace function public.notification_action(p_notification_id uuid, p_action text)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.notifications;
begin
  if v_user is null then
    raise exception 'Sessão não encontrada.';
  end if;

  select * into v_row
  from public.notifications
  where id = p_notification_id
    and recipient_id = v_user
  for update;

  if not found then
    raise exception 'Notificação não encontrada.';
  end if;

  case p_action
    when 'read' then
      update public.notifications set read_at = coalesce(read_at, now()) where id = p_notification_id returning * into v_row;
    when 'unread' then
      update public.notifications set read_at = null where id = p_notification_id returning * into v_row;
    when 'complete' then
      update public.notifications set completed_at = coalesce(completed_at, now()), completed_by = v_user, read_at = coalesce(read_at, now()) where id = p_notification_id returning * into v_row;
    when 'archive' then
      update public.notifications set archived_at = coalesce(archived_at, now()), read_at = coalesce(read_at, now()) where id = p_notification_id returning * into v_row;
    else
      raise exception 'Ação inválida.';
  end case;

  return v_row;
end;
$$;

revoke all on function public.notification_action(uuid,text) from public;
revoke all on function public.notification_action(uuid,text) from anon;
grant execute on function public.notification_action(uuid,text) to authenticated;
comment on function public.notification_action(uuid,text) is 'Permite ao destinatário marcar, concluir ou arquivar a própria notificação.';
