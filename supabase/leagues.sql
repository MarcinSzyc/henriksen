-- Henriksen – ligi (ranking z kolegami). Uruchom raz w Supabase → SQL Editor → New query → Run (po schema.sql).
-- Dziecko zakłada ligę albo dołącza kodem; liga i każde dołączenie dziecka czekają na zgodę jego rodzica.
-- Ranking widzi tylko podsumowania (public_stats: punkty w tygodniu i od początku, seria, puchary) – nigdy sesji innych dzieci.

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

-- podsumowanie wyników, które telefon wysyła przy synchronizacji (jedyne, co widzą inni w lidze)
create table public.public_stats (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  week_start date,
  week_pts int not null default 0,
  total_pts int not null default 0,
  streak int not null default 0,
  cups jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.public_stats enable row level security;

-- rodzic tego dziecka (ta sama rodzina, rola parent)
create function public.parent_of(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_parent() and public.in_my_family(uid)
$$;

create function public.league_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  v text;
  abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  loop
    v := '';
    for i in 1..6 loop v := v || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from leagues where code = v);
  end loop;
  return v;
end $$;

-- załóż ligę: dziecko → czeka na zgodę rodzica, rodzic → od razu aktywna
create function public.create_league(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_status text;
  v_id uuid;
  v_code text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role is null then raise exception 'Najpierw dołącz do rodziny'; end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Wpisz nazwę ligi'; end if;
  v_status := case when v_role = 'parent' then 'active' else 'pending' end;
  v_code := public.league_code();
  insert into leagues (name, code, created_by, status) values (left(trim(p_name), 30), v_code, auth.uid(), v_status) returning id into v_id;
  insert into league_members (league_id, user_id, status) values (v_id, auth.uid(), v_status);
  return v_code;
end $$;

-- dołącz kodem: dziecko → czeka na zgodę rodzica
create function public.join_league(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_id uuid;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role is null then raise exception 'Najpierw dołącz do rodziny'; end if;
  select id into v_id from leagues where code = upper(trim(p_code)) and status = 'active';
  if v_id is null then raise exception 'Nie ma ligi z takim kodem'; end if;
  insert into league_members (league_id, user_id, status)
    values (v_id, auth.uid(), case when v_role = 'parent' then 'active' else 'pending' end)
    on conflict (league_id, user_id) do nothing;
  return v_id;
end $$;

-- rodzic decyduje: zgoda (liga dziecka i jego członkostwo stają się aktywne) albo odmowa (prośba znika)
create function public.decide_league(p_league uuid, p_user uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.parent_of(p_user) then raise exception 'Zgodę daje rodzic tego dziecka'; end if;
  if p_ok then
    update leagues set status = 'active' where id = p_league and created_by = p_user and status = 'pending';
    update league_members set status = 'active' where league_id = p_league and user_id = p_user;
  else
    delete from league_members where league_id = p_league and user_id = p_user;
    delete from leagues where id = p_league and created_by = p_user and status = 'pending';
  end if;
end $$;

-- wypisanie z ligi (samo dziecko albo jego rodzic); pusta liga znika
create function public.leave_league(p_league uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user <> auth.uid() and not public.parent_of(p_user) then raise exception 'Brak uprawnień'; end if;
  delete from league_members where league_id = p_league and user_id = p_user;
  delete from leagues l where l.id = p_league and not exists (select 1 from league_members m where m.league_id = l.id);
end $$;

-- ligi zalogowanego (i, dla rodzica, ligi jego dzieci) z informacją, kogo dotyczą
create function public.my_leagues()
returns table (league_id uuid, name text, code text, league_status text, user_id uuid, user_name text, member_status text, is_creator boolean)
language sql stable security definer set search_path = public as $$
  select l.id, l.name, case when l.status = 'active' then l.code end, l.status, m.user_id, p.name, m.status, l.created_by = m.user_id
  from league_members m
  join leagues l on l.id = m.league_id
  join profiles p on p.id = m.user_id
  where m.user_id = auth.uid() or public.parent_of(m.user_id)
  order by l.created_at
$$;

-- ranking ligi: tylko aktywni członkowie; widzi go aktywny członek albo rodzic aktywnego członka
create function public.league_ranking(p_league uuid)
returns table (user_id uuid, name text, week_pts int, total_pts int, streak int, cups jsonb)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.name,
    case when s.week_start = date_trunc('week', now() at time zone 'Europe/Warsaw')::date then s.week_pts else 0 end,
    coalesce(s.total_pts, 0),
    case when s.updated_at > now() - interval '2 days' then coalesce(s.streak, 0) else 0 end,
    coalesce(s.cups, '{}'::jsonb)
  from league_members m
  join profiles p on p.id = m.user_id
  left join public_stats s on s.user_id = m.user_id
  where m.league_id = p_league and m.status = 'active'
    and exists (select 1 from league_members me where me.league_id = p_league and me.status = 'active'
                and (me.user_id = auth.uid() or public.parent_of(me.user_id)))
$$;

-- tabele tylko przez funkcje; podsumowanie zapisuje i czyta wyłącznie właściciel
create policy public_stats_own on public.public_stats for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.leagues, public.league_members, public.public_stats from anon;
revoke all on public.leagues, public.league_members from authenticated;
revoke all on function public.league_code() from public, anon, authenticated;
revoke all on function public.create_league(text), public.join_league(text), public.decide_league(uuid, uuid, boolean),
  public.leave_league(uuid, uuid), public.my_leagues(), public.league_ranking(uuid), public.parent_of(uuid) from public, anon;
grant execute on function public.create_league(text), public.join_league(text), public.decide_league(uuid, uuid, boolean),
  public.leave_league(uuid, uuid), public.my_leagues(), public.league_ranking(uuid), public.parent_of(uuid) to authenticated;
