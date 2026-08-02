drop policy if exists user_work_state_self_select on public.user_work_state;
drop policy if exists user_work_state_self_insert on public.user_work_state;
drop policy if exists user_work_state_self_update on public.user_work_state;

create policy user_work_state_self_select
on public.user_work_state
for select
to authenticated
using (user_id = (select auth.uid()));

create policy user_work_state_self_insert
on public.user_work_state
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy user_work_state_self_update
on public.user_work_state
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
