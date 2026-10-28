-- Henriksen – szczegóły w panelu Administracja: lista za każdym kaflem (tylko dla admina z app_admins).
-- Uruchom raz po admin.sql (Supabase → SQL Editor → New query → Run). Nic nie zmienia w danych.
-- p_kind: users | families | parents | students | active | sessions | leagues | nofamily

create or replace function public.admin_details(p_kind text) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_week bigint := (extract(epoch from now() - interval '7 days') * 1000)::bigint; -- sessions.start to ms
  v json;
begin
  if not public.is_admin() then raise exception 'Tylko administrator'; end if;

  if p_kind = 'users' then
    select json_agg(x order by x.created_at desc) into v from (
      select u.email::text as email, u.created_at, u.last_sign_in_at, p.name, p.role, p.status, f.code
      from auth.users u left join profiles p on p.id = u.id left join families f on f.id = p.family_id) x;

  elsif p_kind = 'families' then
    select json_agg(x order by x.created_at desc) into v from (
      select f.code, f.status, f.created_at, cu.email::text as email,
        (select string_agg(p.name, ', ' order by p.name) from profiles p where p.family_id = f.id and p.role = 'parent') as parents,
        (select string_agg(p.name || case when p.status = 'pending' then ' (czeka)' else '' end, ', ' order by p.name)
           from profiles p where p.family_id = f.id and p.role = 'student') as kids,
        (select count(*) from sessions s where s.family_id = f.id) as sessions,
        (select max(s.start) from sessions s where s.family_id = f.id) as last_session
      from families f join auth.users cu on cu.id = f.created_by) x;

  elsif p_kind = 'parents' then
    select json_agg(x order by x.name) into v from (
      select p.name, u.email::text as email, p.status, f.code, u.last_sign_in_at,
        (select count(*) from profiles k where k.family_id = p.family_id and k.role = 'student') as kids
      from profiles p join auth.users u on u.id = p.id left join families f on f.id = p.family_id
      where p.role = 'parent') x;

  elsif p_kind = 'students' then
    select json_agg(x order by x.name) into v from (
      select p.name, p.status, f.code,
        (select string_agg(q.name, ', ') from profiles q where q.family_id = p.family_id and q.role = 'parent') as parents,
        (select count(*) from sessions s where s.user_id = p.id) as sessions,
        (select max(s.start) from sessions s where s.user_id = p.id) as last_session,
        ps.week_pts, ps.total_pts, ps.streak
      from profiles p left join families f on f.id = p.family_id left join public_stats ps on ps.user_id = p.id
      where p.role = 'student') x;

  elsif p_kind = 'active' then
    select json_agg(x order by x.sessions desc) into v from (
      select coalesce(p.name, u.email::text) as name, p.role, f.code,
        count(*) as sessions, max(s.start) as last_session,
        round(avg(s.pct)) as avg_pct
      from sessions s join auth.users u on u.id = s.user_id
        left join profiles p on p.id = s.user_id left join families f on f.id = p.family_id
      where s.start >= v_week
      group by s.user_id, p.name, u.email, p.role, f.code) x;

  elsif p_kind = 'sessions' then
    select json_agg(x order by x.start desc) into v from (
      select coalesce(p.name, '–') as name, s.subj, s.start, s.status, s.pct, s.grade,
        s.data -> 'cfg' ->> 'mode' as mode, s.data ->> 'n' as n
      from sessions s left join profiles p on p.id = s.user_id
      where s.start >= v_week
      order by s.start desc limit 200) x;

  elsif p_kind = 'leagues' then
    select json_agg(x order by x.created_at desc) into v from (
      select l.name, l.code, l.status, l.created_at, cp.name as owner,
        (select count(*) from league_members m where m.league_id = l.id and m.status = 'active') as members,
        (select count(*) from league_members m where m.league_id = l.id and m.status = 'pending') as pending,
        (select string_agg(p.name, ', ' order by p.name) from league_members m join profiles p on p.id = m.user_id
           where m.league_id = l.id and m.status = 'active') as names
      from leagues l left join profiles cp on cp.id = l.created_by) x;

  elsif p_kind = 'nofamily' then
    select json_agg(x order by x.created_at desc) into v from (
      select u.email::text as email, u.created_at, u.last_sign_in_at
      from auth.users u where not exists (select 1 from profiles p where p.id = u.id)) x;

  else
    raise exception 'Nieznany rodzaj: %', p_kind;
  end if;

  return coalesce(v, '[]'::json);
end $$;

revoke all on function public.admin_details(text) from public, anon;
grant execute on function public.admin_details(text) to authenticated;
