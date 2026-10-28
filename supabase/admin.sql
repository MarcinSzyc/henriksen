-- Henriksen – panel Administracja: proste liczby o wszystkich kontach (tylko dla admina z app_admins).
-- Uruchom raz po approval.sql (Supabase → SQL Editor → New query → Run). Nic nie zmienia w danych.

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_week bigint := (extract(epoch from now() - interval '7 days') * 1000)::bigint; -- sessions.start to ms (Date.now())
begin
  if not public.is_admin() then raise exception 'Tylko administrator'; end if;
  return json_build_object(
    'users',            (select count(*) from auth.users),
    'new_week',         (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'no_family',        (select count(*) from auth.users u where not exists (select 1 from profiles p where p.id = u.id)),
    'parents',          (select count(*) from profiles where role = 'parent'),
    'students',         (select count(*) from profiles where role = 'student'),
    'students_pending', (select count(*) from profiles where role = 'student' and status = 'pending'),
    'families',         (select count(*) from families),
    'families_pending', (select count(*) from families where status = 'pending'),
    'sessions',         (select count(*) from sessions),
    'sessions_week',    (select count(*) from sessions where start >= v_week),
    'active_week',      (select count(distinct user_id) from sessions where start >= v_week),
    'leagues',          (select count(*) from leagues),
    'last_session',     (select max(start) from sessions)
  );
end $$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
