-- ============================================================
-- Vera Desarrollos — Etapa 7: tipos de proveedor + liquidaciones ligadas a proveedor
-- Pegá TODO esto en el SQL Editor de Supabase y ejecutá.
-- ============================================================
alter table providers add column if not exists kind text default 'materiales';
-- Tipos: materiales | mano de obra | profesional | servicios / subcontrato | equipos / alquiler

alter table liquidaciones add column if not exists provider_id bigint references providers(id) on delete set null;
