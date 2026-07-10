-- ============================================================
--  SPORTLY360°  ·  Esquema de base de datos (Supabase / Postgres)
--  Aplicado en el proyecto Supabase `sportly360` (scixksgcbqumhygvdmal).
--  Este archivo es la referencia versionada del esquema.
-- ============================================================

-- ─── 1. TABLA PERFILES ───────────────────────────────────────
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  apellido    text,
  rut         text unique,
  telefono    text,
  rol         text not null default 'user' check (rol in ('user','admin')),
  created_at  timestamptz not null default now()
);

-- ─── 2. TABLA SUSCRIPCIONES ──────────────────────────────────
create table if not exists public.suscripciones (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan          text not null default 'free'   check (plan   in ('free','premium')),
  estado        text not null default 'activa' check (estado in ('activa','cancelada','vencida')),
  fecha_inicio  timestamptz not null default now(),
  fecha_fin     timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_suscripciones_user on public.suscripciones(user_id);

-- ─── 3. FUNCIÓN HELPER: ¿el usuario actual es admin? ─────────
--  SECURITY DEFINER evita recursión de RLS al consultar perfiles
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ─── 4. SEGURIDAD A NIVEL DE FILA (RLS) ──────────────────────
alter table public.perfiles      enable row level security;
alter table public.suscripciones enable row level security;

drop policy if exists "perfiles_select" on public.perfiles;
create policy "perfiles_select" on public.perfiles
  for select using ( id = auth.uid() or public.es_admin() );

drop policy if exists "perfiles_update" on public.perfiles;
create policy "perfiles_update" on public.perfiles
  for update using ( id = auth.uid() or public.es_admin() )
  with check ( id = auth.uid() or public.es_admin() );

drop policy if exists "suscripciones_select" on public.suscripciones;
create policy "suscripciones_select" on public.suscripciones
  for select using ( user_id = auth.uid() or public.es_admin() );

drop policy if exists "suscripciones_admin_manage" on public.suscripciones;
create policy "suscripciones_admin_manage" on public.suscripciones
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- ─── 5. TRIGGER: crear perfil + suscripción al registrarse ───
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rut      text := nullif(new.raw_user_meta_data->>'rut','');
  v_rut_norm text := regexp_replace(coalesce(new.raw_user_meta_data->>'rut',''), '[^0-9kK]', '', 'g');
  v_rol      text := 'user';
begin
  -- RUT del administrador: 20.919.257-8  ->  209192578
  if v_rut_norm = '209192578' then
    v_rol := 'admin';
  end if;

  insert into public.perfiles (id, nombre, apellido, rut, telefono, rol)
  values (
    new.id,
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    v_rut,
    new.raw_user_meta_data->>'telefono',
    v_rol
  );

  insert into public.suscripciones (user_id, plan, estado)
  values (new.id, 'free', 'activa');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
