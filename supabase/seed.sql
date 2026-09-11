-- ============================================================
-- OPCIONAL — Datos de ejemplo
-- Corré esto SOLO si querés arrancar con proyectos de muestra.
-- Si preferís empezar de cero y cargar tus proyectos reales, NO lo corras.
-- ============================================================

insert into projects (name, address, status, progress, start_date, end_date, sale_price, budget, spent, description) values
 ('Torre Mendoza Centro','San Martín 856, Mendoza','construccion',62,'2024-03-01','2026-09-30',2800000,1650000,1023500,'Torre residencial de 12 pisos con amenities en el microcentro.'),
 ('Complejo Residencial Las Heras','Av. Las Heras 1200, Mendoza','planificacion',12,'2024-12-01','2027-06-30',4100000,2400000,289000,'Complejo de 3 torres con espacios verdes y cocheras.');

insert into providers (name, rubro, contact, phone, email) values
 ('Materiales Cuyo SA','Materiales','Juan García','261-4123456','ventas@materialescuyo.com'),
 ('ElectroConstruc','Electricidad','María López','261-4987654','info@electroconstruc.com'),
 ('Carpintería del Sol','Carpintería','Roberto Díaz','261-5001122','carpinteriadelsol@gmail.com');

insert into investments (investor, project, amount, pct, date) values
 ('Carlos Méndez','Torre Mendoza Centro',350000,21,'2024-03-15'),
 ('Grupo Inversora SA','Torre Mendoza Centro',500000,30,'2024-04-01'),
 ('Constructora del Sur','Complejo Residencial Las Heras',800000,33,'2024-12-05');

insert into expenses (concept, category, amount, date, provider, project) values
 ('Hormigón premezclado','materiales',85000,'2024-10-20','Materiales Cuyo SA','Torre Mendoza Centro'),
 ('Mano de obra octubre','mano de obra',120000,'2024-10-31','-','Torre Mendoza Centro');
