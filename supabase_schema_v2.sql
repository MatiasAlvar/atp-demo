-- ============================================================
-- ATP DEMO v2 - Ejecuta esto en Supabase SQL Editor
-- LIMPIA datos de prueba + agrega nuevas tablas
-- ============================================================

-- Limpiar solicitudes de prueba
DELETE FROM solicitudes;
DELETE FROM alertas;

-- Tabla trabajadores acreditados
CREATE TABLE IF NOT EXISTS trabajadores_acreditados (
  id text primary key,
  rut text not null unique,
  nombre text not null,
  empresa_rut text default '',
  empresa_nombre text default '',
  mandante text default '',
  acreditado boolean default true,
  vencimiento date,
  notas text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla contactos propietarios (por sitio)
CREATE TABLE IF NOT EXISTS propietarios_contactos (
  id text primary key,
  sitio_id text not null,
  nombre text not null,
  cargo text default 'Propietario',
  email text default '',
  telefono text default '',
  whatsapp text default '',
  notas text default '',
  es_principal boolean default false,
  created_at timestamptz default now()
);

-- Tabla empresas contratistas
CREATE TABLE IF NOT EXISTS empresas_contratistas (
  rut text primary key,
  nombre text not null unique,
  email text default '',
  telefono text default '',
  created_at timestamptz default now()
);

-- Habilitar RLS
ALTER TABLE trabajadores_acreditados ENABLE ROW LEVEL SECURITY;
ALTER TABLE propietarios_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_contratistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all trabajadores" ON trabajadores_acreditados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all propietarios_contactos" ON propietarios_contactos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all empresas" ON empresas_contratistas FOR ALL USING (true) WITH CHECK (true);

-- Tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE trabajadores_acreditados;
ALTER PUBLICATION supabase_realtime ADD TABLE empresas_contratistas;

-- Datos iniciales empresas contratistas
INSERT INTO empresas_contratistas (rut, nombre) VALUES
('76.124.890-1', 'Lari Obras y Servicios SpA'),
('77.341.200-5', 'TelcoServ SpA'),
('76.890.123-4', 'Network Solutions Ltda.'),
('77.012.345-6', 'Infratel SpA'),
('76.543.210-9', 'TecnoAndes SpA'),
('76.222.333-1', 'Torres & Redes Chile SpA'),
('77.888.999-0', 'Telecomunicaciones del Sur Ltda.')
ON CONFLICT (rut) DO NOTHING;

-- Trabajadores acreditados iniciales
INSERT INTO trabajadores_acreditados (id, rut, nombre, empresa_rut, empresa_nombre, mandante, acreditado, vencimiento) VALUES
('W001', '12.345.678-9', 'Javier Hernández', '76.124.890-1', 'Lari Obras y Servicios SpA', 'Telefónica Móviles Chile S.A.', true, '2026-12-31'),
('W002', '15.234.567-8', 'Ana Rodríguez', '77.341.200-5', 'TelcoServ SpA', 'Entel PCS', true, '2026-09-30'),
('W003', '11.222.333-4', 'Carlos Muñoz', '76.890.123-4', 'Network Solutions Ltda.', 'Claro Chile S.A.', true, '2026-06-30'),
('W004', '16.789.012-3', 'María González', '77.012.345-6', 'Infratel SpA', 'WOM S.A.', true, '2026-11-30'),
('W005', '14.567.890-1', 'Roberto Soto', '76.543.210-9', 'TecnoAndes SpA', 'Telefónica Móviles Chile S.A.', true, '2026-08-31'),
('W006', '13.456.789-2', 'Laura Castillo', '76.124.890-1', 'Lari Obras y Servicios SpA', 'Entel PCS', false, '2026-03-01'),
('W007', '17.890.123-4', 'Diego Morales', '77.341.200-5', 'TelcoServ SpA', 'Claro Chile S.A.', true, '2026-10-31'),
('W008', '18.901.234-5', 'Valentina Ríos', '76.890.123-4', 'Network Solutions Ltda.', 'WOM S.A.', true, '2026-07-31'),
('W009', '09.293.203-3', 'Pedro Mamani', '76.543.210-9', 'TecnoAndes SpA', 'Telefónica Móviles Chile S.A.', true, '2027-01-31'),
('W010', '20.111.222-3', 'Carla Vega', '76.222.333-1', 'Torres & Redes Chile SpA', 'WOM S.A.', false, '2026-02-28')
ON CONFLICT (id) DO NOTHING;

-- Alertas iniciales
INSERT INTO alertas (id, sitio_id, tipo, titulo, descripcion, estado) VALUES
('ALT001', 'CL48769', 'contractual', 'Problema contractual con propietario', 'El contrato de arriendo vence el 30/03/2026. Posibles demoras en autorizaciones.', 'activo'),
('ALT002', 'CL31102', 'documentacion', 'Requiere permiso municipal adicional', 'Este sitio requiere adjuntar permiso de la Municipalidad de Valparaíso para trabajos de instalación.', 'activo'),
('ALT003', 'CL-TAR-5021', 'documentacion', 'Requiere coordinación con Gendarmería', 'Recinto penitenciario: coordinar con Gendarmería 72h antes. Adjuntar cédulas de todos los técnicos.', 'activo')
ON CONFLICT (id) DO NOTHING;
