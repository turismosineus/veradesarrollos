-- ============================================================
-- Vera Desarrollos — Etapa 10: MONEDA (ARS / USD) + cotización del día
-- El negocio se mide en USD; los movimientos pueden cargarse en pesos con la
-- cotización del día para calcular su equivalente en dólares.
-- Pegá TODO esto en el SQL Editor y ejecutá.
-- ============================================================
alter table expenses      add column if not exists currency text default 'ARS', add column if not exists rate numeric;
alter table liquidaciones add column if not exists currency text default 'ARS', add column if not exists rate numeric;
alter table budgets       add column if not exists currency text default 'ARS', add column if not exists rate numeric;
alter table investments   add column if not exists currency text default 'USD', add column if not exists rate numeric;

-- Lo que ya tenías cargado queda como ARS sin cotización (la app lo marca en amarillo
-- y no lo suma en USD hasta que le cargues el dólar). Si querés asignarles una
-- cotización única de una vez, descomentá y poné el valor:
-- update expenses      set rate = 1350 where currency = 'ARS' and rate is null;
-- update liquidaciones set rate = 1350 where currency = 'ARS' and rate is null;
-- update budgets       set rate = 1350 where currency = 'ARS' and rate is null;

-- Verificación: cuántos movimientos en pesos quedan sin cotización
select 'gastos' as tabla, count(*) as sin_cotizacion from expenses where currency='ARS' and rate is null
union all select 'liquidaciones', count(*) from liquidaciones where currency='ARS' and rate is null
union all select 'presupuestos',  count(*) from budgets where currency='ARS' and rate is null;
