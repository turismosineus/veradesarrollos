-- ============================================================
-- Vera Desarrollos — Etapa 9: VÍNCULOS POR ID + TOTALES CALCULADOS
-- Pegá TODO esto en el SQL Editor de Supabase y ejecutá.
-- Es seguro: no borra nada; agrega columnas y las rellena a partir
-- de los nombres que ya tenías cargados.
-- ============================================================

-- 1) Columnas de vínculo por ID
alter table expenses      add column if not exists project_id  bigint references projects(id)  on delete cascade;
alter table expenses      add column if not exists provider_id bigint references providers(id) on delete set null;
alter table liquidaciones add column if not exists project_id  bigint references projects(id)  on delete cascade;
alter table investments   add column if not exists project_id  bigint references projects(id)  on delete cascade;
alter table budgets       add column if not exists project_id  bigint references projects(id)  on delete set null;
alter table orders        add column if not exists project_id  bigint references projects(id)  on delete set null;
alter table receipts      add column if not exists project_id  bigint references projects(id)  on delete set null;

-- 2) Relleno automático: enlaza lo existente buscando por nombre
update expenses      e set project_id  = p.id from projects  p where e.project_id  is null and e.project  = p.name;
update expenses      e set provider_id = v.id from providers v where e.provider_id is null and e.provider = v.name;
update liquidaciones l set project_id  = p.id from projects  p where l.project_id  is null and l.project  = p.name;
update investments   i set project_id  = p.id from projects  p where i.project_id  is null and i.project  = p.name;
update budgets       b set project_id  = p.id from projects  p where b.project_id  is null and b.project  = p.name;
update orders        o set project_id  = p.id from projects  p where o.project_id  is null and o.project  = p.name;
update receipts      r set project_id  = p.id from projects  p where r.project_id  is null and r.project  = p.name;

-- 3) Seguridad del inversor: ahora filtra por ID de proyecto (más robusto que por nombre)
drop policy if exists "inversor lee" on public.expenses;
drop policy if exists "inversor lee" on public.liquidaciones;
drop policy if exists "inversor lee" on public.investments;
create policy "inversor lee" on public.expenses      for select to authenticated using (project_id in (select id from public.projects where name = public.my_project()));
create policy "inversor lee" on public.liquidaciones for select to authenticated using (project_id in (select id from public.projects where name = public.my_project()));
create policy "inversor lee" on public.investments   for select to authenticated using (project_id in (select id from public.projects where name = public.my_project()));

-- 4) Verificación: registros que tenían un nombre de proyecto que NO coincide con ninguno
--    (si todo da 0, quedó perfecto; si hay alguno, editalo desde la app y elegí el proyecto)
select 'gastos'        as tabla, count(*) as sin_vincular from expenses      where project_id is null and coalesce(project,'') <> ''
union all select 'liquidaciones', count(*) from liquidaciones where project_id is null and coalesce(project,'') <> ''
union all select 'aportes',       count(*) from investments   where project_id is null and coalesce(project,'') <> '';
