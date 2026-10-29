-- Henriksen – ruch bez logowania (goście): każde urządzenie gościa ma losowy identyfikator (henriksen-dev w telefonie),
-- a aplikacja zgłasza otwarcie, ukończoną sesję i imię wpisane w nagłówku (PREFS.name). Wyników ani odpowiedzi nie wysyła.
-- Uruchom raz po admin.sql (Supabase → SQL Editor → New query → Run).
-- Tabele bez reguł RLS = nikt nie czyta ich bezpośrednio; zapis tylko przez guest_ping, odczyt tylko admin (admin_guest_*).

create table if not exists public.guest_devices (
  id         uuid primary key,
  name       text,
  ua         text,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  opens      int not null default 0,
  sessions   int not null default 0,
  last_subj  text
);
create table if not exists public.guest_days (
  device_id  uuid not null references public.guest_devices(id) on delete cascade,
  day        date not null,
  opens      int not null default 0,
  sessions   int not null default 0,
  primary key (device_id, day)
);
alter table public.guest_devices enable row level security;
alter table public.guest_days enable row level security;

-- p_kind: open (start aplikacji) | session (ukończona sesja, p_subj = przedmiot) | name (zmiana imienia)
create or replace function public.guest_ping(p_id uuid, p_name text default null, p_kind text default 'open',
  p_subj text default null, p_ua text default null) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_name text := nullif(left(btrim(coalesce(p_name, '')), 40), '');
  v_o int := case when p_kind = 'open' then 1 else 0 end;
  v_s int := case when p_kind = 'session' then 1 else 0 end;
  v_subj text := case when p_kind = 'session' then left(p_subj, 10) end;
begin
  if p_id is null or p_kind not in ('open', 'session', 'name') then return; end if;
  insert into guest_devices (id, name, ua, opens, sessions, last_subj)
    values (p_id, v_name, left(p_ua, 200), v_o, v_s, v_subj)
  on conflict (id) do update set
    name = coalesce(v_name, guest_devices.name), ua = coalesce(left(p_ua, 200), guest_devices.ua), last_at = now(),
    opens = guest_devices.opens + v_o, sessions = guest_devices.sessions + v_s,
    last_subj = coalesce(v_subj, guest_devices.last_subj);
  if v_o + v_s > 0 then
    insert into guest_days (device_id, day, opens, sessions)
      values (p_id, (now() at time zone 'Europe/Warsaw')::date, v_o, v_s)
    on conflict (device_id, day) do update set opens = guest_days.opens + v_o, sessions = guest_days.sessions + v_s;
  end if;
end $$;

revoke all on function public.guest_ping(uuid, text, text, text, text) from public;
grant execute on function public.guest_ping(uuid, text, text, text, text) to anon, authenticated;

-- liczby do kafla „Goście” w Administracji
create or replace function public.admin_guest_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare v_from date := (now() at time zone 'Europe/Warsaw')::date - 6;
begin
  if not public.is_admin() then raise exception 'Tylko administrator'; end if;
  return json_build_object(
    'guests',        (select count(*) from guest_devices),
    'new_week',      (select count(*) from guest_devices where first_at >= now() - interval '7 days'),
    'active_week',   (select count(distinct device_id) from guest_days where day >= v_from),
    'opens_week',    (select coalesce(sum(opens), 0) from guest_days where day >= v_from),
    'sessions_week', (select coalesce(sum(sessions), 0) from guest_days where day >= v_from),
    'sessions',      (select coalesce(sum(sessions), 0) from guest_devices),
    'last_at',       (select max(last_at) from guest_devices)
  );
end $$;

-- lista urządzeń gości (ostatnio aktywne najpierw)
create or replace function public.admin_guests() returns json
language plpgsql stable security definer set search_path = public as $$
declare v_from date := (now() at time zone 'Europe/Warsaw')::date - 6; v json;
begin
  if not public.is_admin() then raise exception 'Tylko administrator'; end if;
  select json_agg(x order by x.last_at desc) into v from (
    select g.name, g.ua, g.first_at, g.last_at, g.opens, g.sessions, g.last_subj,
      (select coalesce(sum(d.sessions), 0) from guest_days d where d.device_id = g.id and d.day >= v_from) as sessions_week,
      (select count(*) from guest_days d where d.device_id = g.id) as days
    from guest_devices g order by g.last_at desc limit 300) x;
  return coalesce(v, '[]'::json);
end $$;

revoke all on function public.admin_guest_stats() from public, anon;
revoke all on function public.admin_guests() from public, anon;
grant execute on function public.admin_guest_stats() to authenticated;
grant execute on function public.admin_guests() to authenticated;
