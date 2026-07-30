drop index if exists public.contacts_cpf_unique_not_null;

alter policy profiles_select on public.profiles using ((id = (select auth.uid())) or private.is_admin());
alter policy permissions_self_select on public.user_permissions using ((user_id = (select auth.uid())) or private.is_admin());
alter policy contacts_select on public.contacts using (private.is_admin() or (assigned_to = (select auth.uid())) or private.has_permission('lists'::text));
alter policy contacts_assignee_update on public.contacts using (assigned_to = (select auth.uid())) with check (assigned_to = (select auth.uid()));
alter policy phones_assignee_write on public.contact_phones using (exists (select 1 from public.contacts c where c.id = contact_phones.contact_id and c.assigned_to = (select auth.uid()))) with check (exists (select 1 from public.contacts c where c.id = contact_phones.contact_id and c.assigned_to = (select auth.uid())));
alter policy phones_select on public.contact_phones using (exists (select 1 from public.contacts c where c.id = contact_phones.contact_id and (private.is_admin() or c.assigned_to = (select auth.uid()) or private.has_permission('lists'::text))));
alter policy events_insert on public.contact_events with check ((actor_id = (select auth.uid())) and exists (select 1 from public.contacts c where c.id = contact_events.contact_id and (private.is_admin() or c.assigned_to = (select auth.uid()))));
alter policy events_select on public.contact_events using (exists (select 1 from public.contacts c where c.id = contact_events.contact_id and (private.is_admin() or c.assigned_to = (select auth.uid()) or private.has_permission('reports'::text))));
alter policy appointments_delete on public.appointments using ((owner_id = (select auth.uid())) or private.is_admin());
alter policy appointments_insert on public.appointments with check ((created_by = (select auth.uid())) and ((owner_id = (select auth.uid())) or private.is_admin()));
alter policy appointments_select on public.appointments using (private.is_admin() or (owner_id = (select auth.uid())) or ((visibility = 'common'::public.appointment_visibility) and private.has_permission('manage_shared_appointments'::text)));
alter policy appointments_update on public.appointments using ((owner_id = (select auth.uid())) or private.is_admin() or ((visibility = 'common'::public.appointment_visibility) and private.has_permission('manage_shared_appointments'::text))) with check ((owner_id = (select auth.uid())) or private.is_admin() or ((visibility = 'common'::public.appointment_visibility) and private.has_permission('manage_shared_appointments'::text)));
alter policy notifications_select on public.notifications using ((recipient_id = (select auth.uid())) or private.is_admin());
alter policy notifications_update on public.notifications using ((recipient_id = (select auth.uid())) or private.is_admin()) with check ((recipient_id = (select auth.uid())) or private.is_admin());
alter policy templates_own_write on public.message_templates using ((owner_id = (select auth.uid())) or private.is_admin()) with check ((owner_id = (select auth.uid())) or private.is_admin());
alter policy templates_select on public.message_templates using ((owner_id = (select auth.uid())) or is_shared or private.is_admin());
alter policy invitations_self_select on public.user_invitations using (lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'::text), ''::text)));
