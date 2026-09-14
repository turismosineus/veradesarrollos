-- ============================================================
-- Vera Desarrollos — Etapa 11: pagos imputados a presupuestos + dólar de referencia
-- Pegá TODO esto en el SQL Editor y ejecutá.
-- ============================================================
-- Cada pago (gasto o liquidación) puede imputarse a un presupuesto elegido
alter table expenses      add column if not exists budget_id bigint references budgets(id) on delete set null;
alter table liquidaciones add column if not exists budget_id bigint references budgets(id) on delete set null;

-- Configuración global: dólar de referencia para valuar saldos pendientes
create table if not exists settings (
  id         int primary key,
  ref_rate   numeric,
  updated_at timestamptz default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;
alter table settings enable row level security;
drop policy if exists "leer settings"  on public.settings;
drop policy if exists "admin settings" on public.settings;
create policy "leer settings"  on public.settings for select to authenticated using (true);
create policy "admin settings" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- (Opcional) fijar ya el dólar de referencia — cambiá el valor:
-- update settings set ref_rate = 1350 where id = 1;
