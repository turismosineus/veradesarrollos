-- ============================================================
-- Vera Construcciones — Auth y perfiles (Opción B: login real)
-- Pegá TODO esto en el SQL Editor de Supabase y ejecutá (después del schema.sql).
-- ============================================================

-- Tabla de perfiles: extiende a cada usuario de Auth con su rol y proyecto.
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text default 'inversor',   -- 'director' o 'inversor'
  project    text,                       -- nombre del proyecto (solo para inversores)
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Cada usuario puede leer únicamente su propio perfil.
drop policy if exists "leer perfil propio" on profiles;
create policy "leer perfil propio"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

-- Cuando se crea un usuario nuevo en Auth, se genera su perfil automáticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
