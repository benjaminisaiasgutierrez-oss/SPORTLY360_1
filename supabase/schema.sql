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

-- ─── 6. DATOS DEPORTIVOS (competiciones / posiciones / goleadores) ──
--  Poblado desde API-Football (api-sports.io). Lectura pública, escritura
--  solo vía service_role (script de sincronización, no desde el cliente).
create table if not exists public.competiciones (
  id      text primary key,
  nombre  text not null,
  logo    text,
  tipo    text not null check (tipo in ('league','cup')),
  pais    text,
  orden   int not null default 0,
  color   text   -- color de marca, usado en el indicador activo del sidebar
);
alter table public.competiciones enable row level security;
drop policy if exists "competiciones_select_all" on public.competiciones;
create policy "competiciones_select_all" on public.competiciones for select using (true);

create table if not exists public.posiciones (
  id              bigint generated always as identity primary key,
  competicion_id  text not null references public.competiciones(id) on delete cascade,
  temporada       text not null,
  grupo           text,
  rank            int,
  equipo          text not null,
  logo            text,
  played          int,
  win             int,
  draw            int,
  lose            int,
  gf              int,
  ga              int,
  gd              int,
  points          int,
  form            text,
  descripcion     text   -- texto real de la API (zona de clasificación: Champions/Europa/Conference/Descenso, incluye casos de cupo por copa)
);
create index if not exists idx_posiciones_comp_temp on public.posiciones(competicion_id, temporada);
alter table public.posiciones enable row level security;
drop policy if exists "posiciones_select_all" on public.posiciones;
create policy "posiciones_select_all" on public.posiciones for select using (true);

create table if not exists public.goleadores (
  id              bigint generated always as identity primary key,
  competicion_id  text not null references public.competiciones(id) on delete cascade,
  temporada       text not null,
  rank            int,
  jugador         text not null,
  equipo          text,
  team_logo       text,
  foto            text,
  goles           int,
  asistencias     int,
  amarillas       int,
  rojas           int
);
create index if not exists idx_goleadores_comp_temp on public.goleadores(competicion_id, temporada);
alter table public.goleadores enable row level security;
drop policy if exists "goleadores_select_all" on public.goleadores;
create policy "goleadores_select_all" on public.goleadores for select using (true);

-- Plantel completo por equipo (no solo los máximos goleadores).
create table if not exists public.plantilla (
  id              bigint generated always as identity primary key,
  competicion_id  text not null references public.competiciones(id) on delete cascade,
  temporada       text not null,
  equipo          text not null,
  team_logo       text,
  jugador         text not null,
  foto            text,
  posicion        text,
  dorsal          int,
  nacionalidad    text,
  edad            int,
  altura          text,
  peso            text,
  partidos        int,
  titular         int,
  minutos         int,
  goles           int,
  asistencias     int,
  tiros           int,
  tiros_arco      int,
  pases           int,
  precision_pase  int,
  pases_clave     int,
  tackles         int,
  intercepciones  int,
  duelos_gan      int,
  faltas_com      int,
  faltas_rec      int,
  amarillas       int,
  rojas           int,
  rating          numeric
);
create index if not exists idx_plantilla_comp_temp_equipo on public.plantilla(competicion_id, temporada, equipo);
alter table public.plantilla enable row level security;
drop policy if exists "plantilla_select_all" on public.plantilla;
create policy "plantilla_select_all" on public.plantilla for select using (true);

-- Info institucional del equipo (no varía por competición/temporada).
create table if not exists public.equipos_info (
  id              bigint generated always as identity primary key,
  equipo          text not null unique,
  team_api_id     int,
  codigo          text,
  pais            text,
  fundacion       int,
  estadio         text,
  ciudad          text,
  capacidad       int,
  entrenador      text,
  entrenador_foto text
);
alter table public.equipos_info enable row level security;
drop policy if exists "equipos_info_select_all" on public.equipos_info;
create policy "equipos_info_select_all" on public.equipos_info for select using (true);

-- Estadísticas de equipo por competición/temporada (porterías, tarjetas).
create table if not exists public.equipo_stats (
  id              bigint generated always as identity primary key,
  competicion_id  text not null references public.competiciones(id) on delete cascade,
  temporada       text not null,
  equipo          text not null,
  porterias       int,
  amarillas       int,
  rojas           int,
  tiros           int,
  tiros_arco      int
);
create index if not exists idx_equipo_stats_comp_temp on public.equipo_stats(competicion_id, temporada, equipo);
alter table public.equipo_stats enable row level security;
drop policy if exists "equipo_stats_select_all" on public.equipo_stats;
create policy "equipo_stats_select_all" on public.equipo_stats for select using (true);
