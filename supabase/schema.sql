-- Henriksen – baza w Supabase (etap 1): rodziny, profile, sesje, ustawienia i reguły dostępu (RLS).
-- Uruchom całość raz w Supabase → SQL Editor → New query → Run.
-- Rodzic: create_family(imię) → dostaje kod rodziny. Dziecko: join_family(kod, imię) → uczeń w tej rodzinie.
-- Uczeń czyta i zapisuje tylko swoje sesje i ustawienia; rodzic czyta sesje rodziny i zmienia ustawienia dzieci.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  role text not null check (role in ('parent', 'student')),
  name text not null default '',
  created_at timestamptz not null default now()
);

-- jedna sesja = jeden wpis z historii aplikacji (id jak w localStorage, czyli Date.now())
create table public.sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id bigint not null,
  family_id uuid references public.families (id) on delete set null,
  subj text not null default 'mat',
  start bigint not null,
  status text not null,
  pct int,
  grade int,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- PREFS (henriksen-ustawienia) i PLP (henriksen-polski)
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  prefs jsonb not null default '{}',
  plp jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- pomocnicze: rodzina i rola zalogowanego (security definer, żeby reguły nie zapętlały się na profiles)
create function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from profiles where id = auth.uid()
$$;

create function public.is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'parent' from profiles where id = auth.uid()), false)
$$;

create function public.in_my_family(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid and family_id is not null and family_id = public.my_family())
$$;

-- rodzina sesji i czas zmiany ustawiane w bazie, nie przez aplikację
create function public.stamp_session() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.family_id := (select family_id from profiles where id = new.user_id);
  new.updated_at := now();
  return new;
end $$;
create trigger sessions_stamp before insert or update on public.sessions
  for each row execute function public.stamp_session();

create function public.stamp_settings() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger settings_stamp before insert or update on public.settings
  for each row execute function public.stamp_settings();

-- rodzic zakłada rodzinę: zwraca 6-znakowy kod (bez I, L, O, 0, 1, żeby nie mylić)
create function public.create_family(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_fam uuid;
  abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Najpierw się zaloguj'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'To konto ma już rodzinę'; end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(abc, 1 + floor(random() * length(abc))::int, 1);
    end loop;
    exit when not exists (select 1 from families where code = v_code);
  end loop;
  insert into families (code, created_by) values (v_code, auth.uid()) returning id into v_fam;
  insert into profiles (id, family_id, role, name) values (auth.uid(), v_fam, 'parent', coalesce(trim(p_name), ''));
  return v_code;
end $$;

-- dziecko dołącza do rodziny kodem
create function public.join_family(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_fam uuid;
begin
  if auth.uid() is null then raise exception 'Najpierw się zaloguj'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'To konto ma już rodzinę'; end if;
  select id into v_fam from families where code = upper(trim(p_code));
  if v_fam is null then raise exception 'Nie ma rodziny z takim kodem'; end if;
  insert into profiles (id, family_id, role, name) values (auth.uid(), v_fam, 'student', coalesce(trim(p_name), ''));
  return v_fam;
end $$;

-- reguły dostępu
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.settings enable row level security;

create policy families_read on public.families for select to authenticated
  using (id = public.my_family());

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or (family_id is not null and family_id = public.my_family()));
create policy profiles_rename on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy sessions_read on public.sessions for select to authenticated
  using (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id)));
create policy sessions_insert on public.sessions for insert to authenticated
  with check (user_id = auth.uid());
create policy sessions_update on public.sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy settings_read on public.settings for select to authenticated
  using (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id)));
create policy settings_insert on public.settings for insert to authenticated
  with check (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id)));
create policy settings_update on public.settings for update to authenticated
  using (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id)))
  with check (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id)));

-- uprawnienia: niezalogowani nie widzą nic; z profilu da się zmienić tylko imię (rola i rodzina tylko przez funkcje)
revoke all on public.families, public.profiles, public.sessions, public.settings from anon;
revoke insert, update, delete on public.families from authenticated;
revoke insert, update, delete on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;
revoke all on function public.create_family(text), public.join_family(text, text) from public, anon;
grant execute on function public.create_family(text), public.join_family(text, text) to authenticated;
revoke all on function public.stamp_session(), public.stamp_settings() from public, anon, authenticated;
