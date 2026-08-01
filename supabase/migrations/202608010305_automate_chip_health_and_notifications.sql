create unique index if not exists chip_daily_stats_chip_date_uidx on public.chip_daily_stats (chip_id, stat_date);
create unique index if not exists notifications_dedupe_uidx on public.notifications (recipient_id, kind, entity_type, entity_id, category) where completed_at is null and archived_at is null;

create or replace function public.refresh_prospec_automations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_today date := current_date;
  v_admin record;
  v_chip record;
  v_score int;
  v_status public.chip_status;
  v_recommendation text;
  v_created_notifications int := 0;
  v_created_incidents int := 0;
  v_updated_chips int := 0;
  v_upserted_stats int := 0;
  v_recovery_notifications int := 0;
  v_rows int := 0;
begin
  for v_chip in
    with chip_metrics as (
      select
        c.id as chip_id,
        count(*) filter (where ma.confirmation = 'sent' and ma.confirmed_at >= v_now - interval '1 hour')::int as messages_1h,
        count(*) filter (where ma.confirmation = 'sent' and ma.confirmed_at >= v_now - interval '6 hours')::int as messages_6h,
        count(*) filter (where ma.confirmation = 'sent' and ma.confirmed_at >= v_now - interval '24 hours')::int as messages_24h,
        count(*) filter (where ma.confirmation = 'sent' and ma.confirmed_at::date = v_today)::int as messages_today,
        count(*) filter (where ma.confirmed_at::date = v_today and ma.payload ? 'reply_received' and coalesce((ma.payload->>'reply_received')::boolean, false))::int as replies_today,
        coalesce(max(extract(epoch from (v_now - coalesce(c.last_activity_at, c.activated_at, c.created_at))) / 60)::int, 0) as minutes_since_activity
      from public.chips c
      left join public.message_attempts ma on ma.chip_id = c.id
      group by c.id
    ), meeting_metrics as (
      select ce.chip_id, count(*)::int as meetings_today
      from public.contact_events ce
      where ce.chip_id is not null
        and ce.occurred_at::date = v_today
        and lower(coalesce(ce.result, ce.event_type, '')) like '%reuni%'
      group by ce.chip_id
    ), contract_metrics as (
      select ce.chip_id, count(*)::int as contracts_today
      from public.contact_events ce
      where ce.chip_id is not null
        and ce.occurred_at::date = v_today
        and lower(coalesce(ce.result, ce.event_type, '')) like '%contrato%'
      group by ce.chip_id
    )
    select
      cm.*,
      coalesce(mm.meetings_today, 0) as meetings_today,
      coalesce(ct.contracts_today, 0) as contracts_today
    from chip_metrics cm
    left join meeting_metrics mm on mm.chip_id = cm.chip_id
    left join contract_metrics ct on ct.chip_id = cm.chip_id
  loop
    insert into public.chip_daily_stats (
      chip_id, stat_date, messages_sent, replies_received, meetings_completed, contracts_closed, usage_minutes, updated_at
    ) values (
      v_chip.chip_id, v_today, v_chip.messages_today, v_chip.replies_today, v_chip.meetings_today, v_chip.contracts_today,
      greatest(0, 24 * 60 - least(24 * 60, v_chip.minutes_since_activity)), v_now
    )
    on conflict (chip_id, stat_date) do update set
      messages_sent = excluded.messages_sent,
      replies_received = excluded.replies_received,
      meetings_completed = excluded.meetings_completed,
      contracts_closed = excluded.contracts_closed,
      usage_minutes = excluded.usage_minutes,
      updated_at = excluded.updated_at;
    v_upserted_stats := v_upserted_stats + 1;

    v_score := least(100,
      case when v_chip.messages_1h > 40 then 35 when v_chip.messages_1h > 25 then 24 when v_chip.messages_1h > 15 then 14 else 0 end
      + case when v_chip.messages_6h > 150 then 30 when v_chip.messages_6h > 100 then 20 when v_chip.messages_6h > 60 then 12 else 0 end
      + case when v_chip.messages_24h > 350 then 25 when v_chip.messages_24h > 250 then 18 when v_chip.messages_24h > 150 then 10 else 0 end
      + case when v_chip.replies_today = 0 and v_chip.messages_today >= 40 then 10 else 0 end
    );

    if v_score >= 96 then
      v_status := 'blocked';
      v_recommendation := 'Risco crítico. Interrompa os envios e revise o histórico do chip.';
    elsif v_score >= 81 then
      v_status := 'restricted';
      v_recommendation := 'Alto risco. Reduza o volume e distribua os próximos contatos para outros chips.';
    elsif v_score >= 61 then
      v_status := 'active';
      v_recommendation := 'Atenção. Diminua a velocidade de envio e acompanhe a taxa de resposta.';
    else
      v_status := 'active';
      v_recommendation := 'Saudável. Mantenha o uso distribuído.';
    end if;

    insert into public.chip_health_snapshots (
      chip_id, messages_1h, messages_6h, messages_24h, sending_speed, continuous_use_minutes,
      replies, meetings, contracts, load_balance_score, health_score, recommendation, created_at
    ) values (
      v_chip.chip_id, v_chip.messages_1h, v_chip.messages_6h, v_chip.messages_24h,
      case when v_chip.messages_1h > 0 then v_chip.messages_1h::numeric / 60 else 0 end,
      greatest(0, 24 * 60 - least(24 * 60, v_chip.minutes_since_activity)),
      v_chip.replies_today, v_chip.meetings_today, v_chip.contracts_today,
      greatest(0, 100 - v_score), v_score, v_recommendation, v_now
    );

    update public.chips
      set health_score = v_score,
          auto_suspended = (v_score >= 81),
          status = case
            when status in ('paused','blocked') then status
            else v_status
          end,
          updated_at = v_now
      where id = v_chip.chip_id;
    v_updated_chips := v_updated_chips + 1;

    if v_score >= 81 and not exists (
      select 1 from public.chip_incidents ci
      where ci.chip_id = v_chip.chip_id
        and ci.occurred_at >= v_now - interval '6 hours'
        and ci.incident_type = v_status
    ) then
      insert into public.chip_incidents (
        chip_id, incident_type, occurred_at, messages_sent, messages_24h,
        continuous_use_minutes, replies, meetings, reason, payload
      ) values (
        v_chip.chip_id, v_status, v_now, v_chip.messages_today, v_chip.messages_24h,
        greatest(0, 24 * 60 - least(24 * 60, v_chip.minutes_since_activity)),
        v_chip.replies_today, v_chip.meetings_today, v_recommendation,
        jsonb_build_object('health_score', v_score, 'messages_1h', v_chip.messages_1h, 'messages_6h', v_chip.messages_6h)
      );
      v_created_incidents := v_created_incidents + 1;
    end if;

    if v_score >= 61 then
      for v_admin in select id from public.profiles where role = 'admin' and active = true and status = 'active' loop
        insert into public.notifications (
          recipient_id, title, body, kind, priority, entity_type, entity_id,
          source_module, action_url, audience_role, category, created_at
        ) values (
          v_admin.id,
          case when v_score >= 96 then 'Chip em risco crítico' when v_score >= 81 then 'Chip em alto risco' else 'Chip requer atenção' end,
          v_recommendation,
          'chip_health',
          case when v_score >= 96 then 'urgent'::public.notification_priority when v_score >= 81 then 'high'::public.notification_priority else 'normal'::public.notification_priority end,
          'chip', v_chip.chip_id::text,
          'chips', '/chips-usuarios', 'admin', 'chip_health', v_now
        )
        on conflict do nothing;
        get diagnostics v_rows = row_count;
        v_created_notifications := v_created_notifications + v_rows;
      end loop;
    end if;
  end loop;

  for v_admin in select id from public.profiles where role = 'admin' and active = true and status = 'active' loop
    insert into public.notifications (
      recipient_id, title, body, kind, priority, entity_type, entity_id,
      source_module, action_url, audience_role, category, created_at
    )
    select
      v_admin.id,
      'Contatos aguardando recuperação',
      count(*)::text || ' contato(s) estão aguardando recuperação de número.',
      'recovery_pending', 'normal', 'recovery_queue', 'open',
      'recovery', '/listas-contatos', 'admin', 'recovery', v_now
    from public.contact_recovery cr
    where cr.status in ('waiting','searching','new_number')
    having count(*) > 0
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    v_created_notifications := v_created_notifications + v_rows;
    v_recovery_notifications := v_recovery_notifications + v_rows;

    insert into public.notifications (
      recipient_id, title, body, kind, priority, entity_type, entity_id,
      scheduled_for, source_module, action_url, audience_role, category, created_at
    )
    select
      v_admin.id,
      'Compromisso próximo',
      a.title || ' começa em breve.',
      'appointment_upcoming', 'normal', 'appointment', a.id::text,
      a.starts_at, 'agenda', '/agenda', 'admin', 'lawyer_agenda', v_now
    from public.appointments a
    where a.status = 'scheduled'
      and a.starts_at between v_now and v_now + interval '24 hours'
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    v_created_notifications := v_created_notifications + v_rows;
  end loop;

  insert into public.notifications (
    recipient_id, title, body, kind, priority, entity_type, entity_id,
    scheduled_for, source_module, action_url, audience_role, category, created_at
  )
  select distinct
    p.id,
    'Lembrete de reunião',
    a.title || ' começa em breve.',
    'appointment_upcoming', 'normal', 'appointment', a.id::text,
    a.starts_at, 'agenda', '/agenda', 'lawyer', 'meeting_reminder', v_now
  from public.appointments a
  join public.profiles p on p.id in (a.owner_id, a.support_lawyer_id)
  where a.status = 'scheduled'
    and a.starts_at between v_now and v_now + interval '24 hours'
    and p.active = true and p.status = 'active'
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  v_created_notifications := v_created_notifications + v_rows;

  insert into public.notifications (
    recipient_id, title, body, kind, priority, entity_type, entity_id,
    scheduled_for, source_module, action_url, audience_role, category, created_at
  )
  select
    f.owner_id,
    'Retorno programado',
    coalesce(c.full_name, 'Contato') || ' possui retorno programado.',
    'scheduled_return', 'normal', 'follow_up', f.id::text,
    f.scheduled_for, 'follow_up', '/notificacoes', 'lawyer', 'scheduled_returns', v_now
  from public.follow_ups f
  join public.contacts c on c.id = f.contact_id
  join public.profiles p on p.id = f.owner_id and p.active = true and p.status = 'active'
  where f.status = 'pending'
    and f.scheduled_for between v_now and v_now + interval '24 hours'
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  v_created_notifications := v_created_notifications + v_rows;

  return jsonb_build_object(
    'updated_chips', v_updated_chips,
    'upserted_daily_stats', v_upserted_stats,
    'created_incidents', v_created_incidents,
    'created_notifications', v_created_notifications,
    'recovery_notifications', v_recovery_notifications,
    'executed_at', v_now
  );
end;
$$;

revoke all on function public.refresh_prospec_automations() from public;
grant execute on function public.refresh_prospec_automations() to service_role;

comment on function public.refresh_prospec_automations() is 'Recalcula saúde dos chips, estatísticas diárias, incidentes e notificações operacionais do PROSPEC KR.';
