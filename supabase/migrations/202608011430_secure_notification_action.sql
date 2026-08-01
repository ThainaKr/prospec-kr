create or replace function public.notification_action(p_notification_id uuid, p_action text)
returns public.notifications
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Sessão não encontrada.';
  end if;

  if p_action not in ('read','unread','complete','archive') then
    raise exception 'Ação de notificação inválida.';
  end if;

  update public.notifications
  set
    read_at = case
      when p_action = 'read' then coalesce(read_at, now())
      when p_action = 'unread' then null
      else read_at
    end,
    completed_at = case
      when p_action = 'complete' then coalesce(completed_at, now())
      else completed_at
    end,
    archived_at = case
      when p_action = 'archive' then coalesce(archived_at, now())
      else archived_at
    end
  where id = p_notification_id
    and recipient_id = auth.uid()
  returning * into v_result;

  if v_result.id is null then
    raise exception 'Notificação não encontrada ou sem permissão.';
  end if;

  return v_result;
end;
$$;

revoke all on function public.notification_action(uuid, text) from public;
grant execute on function public.notification_action(uuid, text) to authenticated;

comment on function public.notification_action(uuid, text) is 'Permite ao destinatário autenticado marcar sua própria notificação como lida, não lida, concluída ou arquivada.';
