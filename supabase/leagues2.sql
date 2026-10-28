-- Henriksen – ligi, krok 2: punkty z każdego przedmiotu w rankingu. Uruchom raz po leagues.sql
-- (Supabase → SQL Editor → New query → Run). Dodaje kolumnę i podmienia funkcję rankingu; danych nie usuwa.

-- {"mat":{"w":punkty w tygodniu,"t":od początku},"pl":{…},"en":{…}}
alter table public.public_stats add column if not exists subj jsonb not null default '{}';

drop function if exists public.league_ranking(uuid);
create function public.league_ranking(p_league uuid)
returns table (user_id uuid, name text, week_pts int, total_pts int, streak int, cups jsonb, subj jsonb, this_week boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.name,
    case when s.week_start = date_trunc('week', now() at time zone 'Europe/Warsaw')::date then s.week_pts else 0 end,
    coalesce(s.total_pts, 0),
    case when s.updated_at > now() - interval '2 days' then coalesce(s.streak, 0) else 0 end,
    coalesce(s.cups, '{}'::jsonb),
    coalesce(s.subj, '{}'::jsonb),
    coalesce(s.week_start = date_trunc('week', now() at time zone 'Europe/Warsaw')::date, false)
  from league_members m
  join profiles p on p.id = m.user_id
  left join public_stats s on s.user_id = m.user_id
  where m.league_id = p_league and m.status = 'active'
    and exists (select 1 from league_members me where me.league_id = p_league and me.status = 'active'
                and (me.user_id = auth.uid() or public.parent_of(me.user_id)))
$$;
revoke all on function public.league_ranking(uuid) from public, anon;
grant execute on function public.league_ranking(uuid) to authenticated;
