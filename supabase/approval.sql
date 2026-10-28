-- Henriksen – zatwierdzanie kont (bez maili). Uruchom raz po schema.sql, leagues.sql i leagues2.sql.
-- Nowa rodzina czeka na akceptację admina, nowe dziecko – na zgodę swojego rodzica. Dopóki konto nie jest aktywne,
-- nie zapisze wyników, ustawień ani podsumowania do lig i nie dołączy do ligi. Istniejące konta od razu są aktywne.
-- Admin: konto z e-mailem poniżej (zmień, jeśli używasz innego).

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_admins enable row level security;
create policy app_admins_self on public.app_admins for select to authenticated using (user_id = auth.uid());
revoke all on public.app_admins from anon;
revoke insert, update, delete on public.app_admins from authenticated;

insert into public.app_admins (user_id)
  select id from auth.users where email = 'szyc.marcin@gmail.com'
  on conflict do nothing;

alter table public.families add column if not exists status text not null default 'pending' check (status in ('pending', 'active'));
alter table public.profiles add column if not exists status text not null default 'pending' check (status in ('pending', 'active'));
update public.families set status = 'active';
update public.profiles set status = 'active';

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid())
$$;

-- aktywne konto: profil aktywny w aktywnej rodzinie
create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p join families f on f.id = p.family_id
                 where p.id = auth.uid() and p.status = 'active' and f.status = 'active')
$$;

-- rodzic zakłada rodzinę: czeka na admina (admin ma ją od razu aktywną)
create or replace function public.create_family(p_name text) returns text
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
  insert into families (code, created_by, status)
    values (v_code, auth.uid(), case when public.is_admin() then 'active' else 'pending' end) returning id into v_fam;
  insert into profiles (id, family_id, role, name, status) values (auth.uid(), v_fam, 'parent', coalesce(trim(p_name), ''), 'active');
  return v_code;
end $$;

-- dziecko dołącza kodem do aktywnej rodziny i czeka na zgodę rodzica
create or replace function public.join_family(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_fam uuid;
begin
  if auth.uid() is null then raise exception 'Najpierw się zaloguj'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'To konto ma już rodzinę'; end if;
  select id into v_fam from families where code = upper(trim(p_code)) and status = 'active';
  if v_fam is null then raise exception 'Nie ma takiej rodziny albo czeka jeszcze na akceptację'; end if;
  insert into profiles (id, family_id, role, name, status) values (auth.uid(), v_fam, 'student', coalesce(trim(p_name), ''), 'pending');
  return v_fam;
end $$;

-- admin: rodziny czekające na akceptację
create or replace function public.admin_requests()
returns table (family_id uuid, parent_name text, email text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, p.name, u.email::text, f.created_at
  from families f
  join profiles p on p.family_id = f.id and p.role = 'parent'
  join auth.users u on u.id = f.created_by
  where f.status = 'pending' and public.is_admin()
  order by f.created_at
$$;

-- admin akceptuje rodzinę albo ją odrzuca (konto zostaje, może poprosić jeszcze raz)
create or replace function public.admin_decide(p_family uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Tylko administrator'; end if;
  if p_ok then
    update families set status = 'active' where id = p_family;
  else
    delete from profiles where family_id = p_family;
    delete from families where id = p_family and status = 'pending';
  end if;
end $$;

-- rodzic: dzieci czekające na zgodę
create or replace function public.family_requests()
returns table (user_id uuid, name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.created_at from profiles p
  where p.status = 'pending' and p.role = 'student' and public.parent_of(p.id) and public.is_active()
  order by p.created_at
$$;

-- rodzic zatwierdza dziecko albo odrzuca (dziecko może poprosić jeszcze raz)
create or replace function public.decide_member(p_user uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.parent_of(p_user) and public.is_active()) then raise exception 'Zgodę daje rodzic tego dziecka'; end if;
  if p_ok then update profiles set status = 'active' where id = p_user;
  else delete from profiles where id = p_user and status = 'pending';
  end if;
end $$;

-- zapis tylko z aktywnego konta
drop policy if exists sessions_insert on public.sessions;
drop policy if exists sessions_update on public.sessions;
create policy sessions_insert on public.sessions for insert to authenticated
  with check (user_id = auth.uid() and public.is_active());
create policy sessions_update on public.sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active());

drop policy if exists settings_insert on public.settings;
drop policy if exists settings_update on public.settings;
create policy settings_insert on public.settings for insert to authenticated
  with check (public.is_active() and (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id))));
create policy settings_update on public.settings for update to authenticated
  using (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id)))
  with check (public.is_active() and (user_id = auth.uid() or (public.is_parent() and public.in_my_family(user_id))));

drop policy if exists public_stats_own on public.public_stats;
create policy public_stats_own on public.public_stats for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active());

-- ligi tylko dla aktywnych kont
create or replace function public.create_league(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_status text;
  v_id uuid;
  v_code text;
begin
  if not public.is_active() then raise exception 'Konto czeka jeszcze na akceptację'; end if;
  select role into v_role from profiles where id = auth.uid();
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Wpisz nazwę ligi'; end if;
  v_status := case when v_role = 'parent' then 'active' else 'pending' end;
  v_code := public.league_code();
  insert into leagues (name, code, created_by, status) values (left(trim(p_name), 30), v_code, auth.uid(), v_status) returning id into v_id;
  insert into league_members (league_id, user_id, status) values (v_id, auth.uid(), v_status);
  return v_code;
end $$;

create or replace function public.join_league(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_id uuid;
begin
  if not public.is_active() then raise exception 'Konto czeka jeszcze na akceptację'; end if;
  select role into v_role from profiles where id = auth.uid();
  select id into v_id from leagues where code = upper(trim(p_code)) and status = 'active';
  if v_id is null then raise exception 'Nie ma ligi z takim kodem'; end if;
  insert into league_members (league_id, user_id, status)
    values (v_id, auth.uid(), case when v_role = 'parent' then 'active' else 'pending' end)
    on conflict (league_id, user_id) do nothing;
  return v_id;
end $$;

revoke all on function public.admin_requests(), public.admin_decide(uuid, boolean), public.family_requests(),
  public.decide_member(uuid, boolean), public.is_admin(), public.is_active() from public, anon;
grant execute on function public.admin_requests(), public.admin_decide(uuid, boolean), public.family_requests(),
  public.decide_member(uuid, boolean), public.is_admin(), public.is_active() to authenticated;
