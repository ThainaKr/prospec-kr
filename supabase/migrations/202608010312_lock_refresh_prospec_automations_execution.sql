revoke execute on function public.refresh_prospec_automations() from public;
revoke execute on function public.refresh_prospec_automations() from anon;
revoke execute on function public.refresh_prospec_automations() from authenticated;
grant execute on function public.refresh_prospec_automations() to service_role;
