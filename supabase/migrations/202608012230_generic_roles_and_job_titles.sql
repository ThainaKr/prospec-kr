alter type public.app_role add value if not exists 'member';
alter table public.profiles drop constraint if exists lawyer_honorific;
alter table public.user_invitations add column if not exists job_title text;
