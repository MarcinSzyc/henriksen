-- Henriksen – panel Administracja: co robi każde dziecko (dziś, w 7 dni, szachy), tylko dla admina z app_admins.
-- Uruchom raz po admin2.sql (Supabase → SQL Editor → New query → Run). Nic nie zmienia w danych.
-- Partie z komputerem = sesje subj 'sz' z cfg.mode 'gra' (zapisują się po końcu partii), wynik w recs[0].c = w/d/l.
-- Łamigłówki = sesje subj 'lg', cfg.mode blockout / mosty / flow / trojki (admin_lg_mode); czas gry = suma (end - start) w minutach.

create or replace function public.admin_lg_mode(p_user uuid, p_mode text, p_week bigint, p_day bigint) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'today', count(*) filter (where s.start >= p_day),
    'week',  count(*) filter (where s.start >= p_week),
    'all',   count(*),
    'min_week', coalesce(round(sum(greatest(0, least((s.data ->> 'end')::bigint - s.start, 3600000))) filter (where s.start >= p_week) / 60000.0), 0),
    'min_all',  coalesce(round(sum(greatest(0, least((s.data ->> 'end')::bigint - s.start, 3600000))) / 60000.0), 0),
    'last',  max(s.start),
    'lvl',   max((s.data -> 'cfg' ->> 'lvl')::int) + 1,
    'three', count(*) filter (where (s.data -> 'recs' -> 0 ->> 'st')::int = 3),
    'best',  max((s.data -> 'recs' -> 0 ->> 'sc')::int),
    'tile',  max((s.data -> 'recs' -> 0 ->> 'mx')::int),
    'recent', (select json_agg(t order by t.start desc) from (
        select s2.start, s2.data -> 'cfg' ->> 'lvl' as lvl, s2.data -> 'cfg' ->> 'n' as n,
          s2.data -> 'recs' -> 0 ->> 'st' as st, s2.data -> 'recs' -> 0 ->> 'sc' as sc, s2.data -> 'recs' -> 0 ->> 'mx' as mx,
          s2.data -> 'recs' -> 0 ->> 'mv' as mv, s2.data -> 'recs' -> 0 ->> 'cost' as cost
        from sessions s2 where s2.user_id = p_user and s2.subj = 'lg' and s2.data -> 'cfg' ->> 'mode' = p_mode
        order by s2.start desc limit 5) t))
  from sessions s where s.user_id = p_user and s.subj = 'lg' and s.data -> 'cfg' ->> 'mode' = p_mode
$$;
revoke all on function public.admin_lg_mode(uuid, text, bigint, bigint) from public, anon, authenticated;

create or replace function public.admin_kids() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_week bigint := (extract(epoch from now() - interval '7 days') * 1000)::bigint; -- sessions.start to ms
  v_day bigint := (extract(epoch from date_trunc('day', now() at time zone 'Europe/Warsaw') at time zone 'Europe/Warsaw') * 1000)::bigint;
  v json;
begin
  if not public.is_admin() then raise exception 'Tylko administrator'; end if;
  select json_agg(x order by x.last_session desc nulls last, x.name) into v from (
    select p.name, f.code,
      (select max(s.start) from sessions s where s.user_id = p.id) as last_session,
      (select count(*) from sessions s where s.user_id = p.id and s.start >= v_day) as today,
      (select count(*) from sessions s where s.user_id = p.id and s.start >= v_week) as week,
      (select json_object_agg(t.subj, t.n) from (select s.subj, count(*) as n from sessions s
         where s.user_id = p.id and s.start >= v_week group by s.subj) t) as week_subj,
      ps.week_pts,
      (select json_build_object(
         'today',  count(*) filter (where g.start >= v_day),
         'week',   count(*) filter (where g.start >= v_week),
         'all',    count(*),
         'w',      count(*) filter (where g.start >= v_week and g.res = 'w'),
         'd',      count(*) filter (where g.start >= v_week and g.res = 'd'),
         'l',      count(*) filter (where g.start >= v_week and g.res = 'l'),
         'timed',  count(*) filter (where g.start >= v_week and g.tc is not null),
         'last',   max(g.start),
         'min_week', coalesce(round(sum(g.dur) filter (where g.start >= v_week) / 60000.0), 0),
         'opps',   (select json_object_agg(o.opp, json_build_object('n', o.n, 'w', o.w)) from (
                      select s2.data -> 'cfg' ->> 'opp' as opp, count(*) as n,
                        count(*) filter (where s2.data -> 'recs' -> 0 ->> 'c' = 'w') as w
                      from sessions s2 where s2.user_id = p.id and s2.subj = 'sz' and s2.data -> 'cfg' ->> 'mode' = 'gra'
                        and s2.start >= v_week group by 1) o))
       from (select s.start, s.data -> 'recs' -> 0 ->> 'c' as res, s.data -> 'cfg' ->> 'tc' as tc,
               greatest(0, least((s.data ->> 'end')::bigint - s.start, 3600000)) as dur from sessions s
             where s.user_id = p.id and s.subj = 'sz' and s.data -> 'cfg' ->> 'mode' = 'gra') g) as games,
      (select json_build_object(
         'sets',   count(*),
         'done',   coalesce(sum((s.data ->> 'done')::int), 0),
         'ok',     coalesce(sum((s.data ->> 'done')::int - coalesce((s.data ->> 'errors')::int, 0)), 0))
       from sessions s where s.user_id = p.id and s.subj = 'sz' and s.data -> 'cfg' ->> 'mode' = 'zadania' and s.start >= v_week) as puzzles,
      (select count(*) from sessions s where s.user_id = p.id and s.subj = 'sz' and s.data -> 'cfg' ->> 'mode' = 'nauka'
         and s.start >= v_week) as lessons,
      json_build_object('blockout', public.admin_lg_mode(p.id, 'blockout', v_week, v_day),
                        'mosty',    public.admin_lg_mode(p.id, 'mosty', v_week, v_day),
                        'flow',     public.admin_lg_mode(p.id, 'flow', v_week, v_day),
                        'trojki',   public.admin_lg_mode(p.id, 'trojki', v_week, v_day)) as lg
    from profiles p left join families f on f.id = p.family_id left join public_stats ps on ps.user_id = p.id
    where p.role = 'student') x;
  return coalesce(v, '[]'::json);
end $$;

revoke all on function public.admin_kids() from public, anon;
grant execute on function public.admin_kids() to authenticated;
