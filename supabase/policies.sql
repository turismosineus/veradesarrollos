-- ============================================================
-- Vera Desarrollos — Reglas de acceso (Etapa 2)
-- Pegá TODO esto en el SQL Editor de Supabase y ejecutá.
-- Sin esto, la app no puede leer ni escribir los datos.
-- ============================================================

-- Datos: cualquier usuario LOGUEADO puede leer y escribir.
-- (El detalle por rol —inversor de solo lectura, etc.— hoy lo controla la app.
--  Más adelante se puede endurecer a nivel base de datos.)
do $$
declare t text;
begin
  foreach t in array array['projects','providers','orders','expenses','investments','receipts','investor_docs']
  loop
    execute format('drop policy if exists "acceso logueados" on public.%I', t);
    execute format('create policy "acceso logueados" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Storage: el bucket "archivos" es accesible por usuarios logueados.
drop policy if exists "archivos leer"  on storage.objects;
drop policy if exists "archivos subir" on storage.objects;
drop policy if exists "archivos borrar" on storage.objects;

create policy "archivos leer"  on storage.objects for select to authenticated using (bucket_id = 'archivos');
create policy "archivos subir" on storage.objects for insert to authenticated with check (bucket_id = 'archivos');
create policy "archivos borrar" on storage.objects for delete to authenticated using (bucket_id = 'archivos');
