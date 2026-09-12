-- ============================================================
-- Vera Desarrollos — Etapa 8: SEGURIDAD REAL POR ROL
-- director / administrador → acceso completo
-- inversor                 → SOLO LECTURA y SOLO de su proyecto
-- ============================================================
--
-- ⚠️  ANTES DE EJECUTAR ESTE ARCHIVO, corré esta consulta sola y mirá el resultado:
--
--     select email, role, project from public.profiles;
--
--     Tu usuario (y el de cualquier admin) tiene que tener role = 'director'
--     o 'administrador'. Si está vacío o mal escrito, CORREGILO PRIMERO en
--     Table Editor → profiles. Si no, al aplicar estas reglas quedarías como
--     inversor (solo lectura) y no podrías cargar nada.
--
--     Los inversores tienen que tener role = 'inversor' y en project el
--     nombre EXACTO del proyecto que pueden ver.
-- ============================================================

-- ── Funciones auxiliares (leen el perfil del usuario logueado) ──
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('director','administrador') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_project()
returns text language sql stable security definer set search_path = public as $$
  select project from public.profiles where id = auth.uid();
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_project() to authenticated;

-- ── Admins: todo, en todas las tablas (reemplaza la regla vieja "acceso logueados") ──
do $$
declare t text;
begin
  foreach t in array array['projects','providers','orders','expenses','liquidaciones','investments','receipts','investor_docs','plans','budgets','media','cameras']
  loop
    execute format('drop policy if exists "acceso logueados" on public.%I', t);
    execute format('drop policy if exists "admin todo" on public.%I', t);
    execute format('drop policy if exists "inversor lee" on public.%I', t);
    execute format('create policy "admin todo" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ── Inversores: solo lectura, solo lo de su proyecto ──
create policy "inversor lee" on public.projects      for select to authenticated using (name = public.my_project());
create policy "inversor lee" on public.plans         for select to authenticated using (project_id in (select id from public.projects where name = public.my_project()));
create policy "inversor lee" on public.media         for select to authenticated using (project_id in (select id from public.projects where name = public.my_project()));
create policy "inversor lee" on public.cameras       for select to authenticated using (project_id in (select id from public.projects where name = public.my_project()));
create policy "inversor lee" on public.expenses      for select to authenticated using (project = public.my_project());
create policy "inversor lee" on public.liquidaciones for select to authenticated using (project = public.my_project());
create policy "inversor lee" on public.investments   for select to authenticated using (project = public.my_project());
-- providers, orders, receipts, budgets e investor_docs: el inversor NO los ve (no hay política de lectura).

-- ── Archivos (Storage): todos los logueados pueden VER; solo admins suben o borran ──
drop policy if exists "archivos leer"   on storage.objects;
drop policy if exists "archivos subir"  on storage.objects;
drop policy if exists "archivos borrar" on storage.objects;
create policy "archivos leer"   on storage.objects for select to authenticated using (bucket_id = 'archivos');
create policy "archivos subir"  on storage.objects for insert to authenticated with check (bucket_id = 'archivos' and public.is_admin());
create policy "archivos borrar" on storage.objects for delete to authenticated using (bucket_id = 'archivos' and public.is_admin());

-- ============================================================
-- MARCHA ATRÁS (solo si algo sale mal): descomentá y ejecutá este bloque
-- para volver a la regla anterior "cualquier logueado puede todo".
-- ============================================================
-- do $$ declare t text; begin
--   foreach t in array array['projects','providers','orders','expenses','liquidaciones','investments','receipts','investor_docs','plans','budgets','media','cameras'] loop
--     execute format('drop policy if exists "admin todo" on public.%I', t);
--     execute format('drop policy if exists "inversor lee" on public.%I', t);
--     execute format('create policy "acceso logueados" on public.%I for all to authenticated using (true) with check (true)', t);
--   end loop; end $$;
-- drop policy if exists "archivos subir"  on storage.objects;
-- drop policy if exists "archivos borrar" on storage.objects;
-- create policy "archivos subir"  on storage.objects for insert to authenticated with check (bucket_id = 'archivos');
-- create policy "archivos borrar" on storage.objects for delete to authenticated using (bucket_id = 'archivos');
