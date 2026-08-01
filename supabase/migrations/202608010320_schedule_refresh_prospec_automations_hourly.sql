create extension if not exists pg_cron with schema extensions;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'refresh-prospec-automations-hourly';

  if v_job_id is null then
    perform cron.schedule(
      'refresh-prospec-automations-hourly',
      '5 * * * *',
      'select public.refresh_prospec_automations();'
    );
  else
    perform cron.alter_job(
      job_id := v_job_id,
      schedule := '5 * * * *',
      command := 'select public.refresh_prospec_automations();',
      active := true
    );
  end if;
end
$$;

comment on extension pg_cron is 'Agendamento das automações operacionais do PROSPEC KR.';
