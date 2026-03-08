-- ============================================================
-- ATP DEMO - Supabase Schema
-- Pega esto en Supabase → SQL Editor → Run
-- ============================================================

-- Tabla solicitudes
create table if not exists solicitudes (
  id text primary key,
  ref_cliente text default '',
  operador text not null,
  empresa_rut text default '',
  empresa_nombre text default '',
  trabajo text default '',
  sitio_id text default '',
  desde date,
  hasta date,
  zona text default '',
  estado text default 'Borrador',
  auto boolean default false,
  motivo text default '',
  correo_mandante text default '',
  correo_contratista text default '',
  trabajadores jsonb default '[]',
  historial jsonb default '[]',
  ts_enviado timestamptz,
  ts_autorizado timestamptz,
  created_at timestamptz default now()
);

-- Tabla alertas de sitio
create table if not exists alertas (
  id text primary key,
  sitio_id text not null,
  tipo text not null,
  titulo text not null,
  descripcion text default '',
  estado text default 'activo',
  added_by text default 'ATP',
  created_at timestamptz default now()
);

-- Habilitar acceso público (demo)
alter table solicitudes enable row level security;
alter table alertas enable row level security;

create policy "allow all solicitudes" on solicitudes for all using (true) with check (true);
create policy "allow all alertas" on alertas for all using (true) with check (true);

-- Habilitar tiempo real
alter publication supabase_realtime add table solicitudes;
alter publication supabase_realtime add table alertas;

-- Datos iniciales de prueba
insert into solicitudes (id, ref_cliente, operador, empresa_rut, empresa_nombre, trabajo, sitio_id, desde, hasta, estado, auto, correo_mandante, correo_contratista, trabajadores, historial, ts_enviado, ts_autorizado) values
('ATP-CL-26-01591', 'TEF-2026-0234', 'Telefónica Móviles Chile S.A.', '76.124.890-1', 'Lari Obras y Servicios SpA', 'LEVANTAMIENTO OBSERVACIONES', 'CL48769', '2026-03-04', '2026-03-06', 'Autorizado', true, 'accesos@telefonica.cl', 'ops@lari.cl', '[{"rut":"12.345.678-9","nombre":"Javier Hernández"}]', '[]', '2026-03-01T09:12:00Z', '2026-03-02T14:30:00Z'),
('ATP-CL-26-01571', 'CLA-ACC-26-001', 'Claro Chile S.A.', '76.890.123-4', 'Network Solutions Ltda.', 'AUDITORÍA', 'CL70045', '2026-03-12', '2026-03-13', 'En Gestión Propietario', true, 'accesos@claro.cl', 'ops@network.cl', '[{"rut":"11.222.333-4","nombre":"Carlos Muñoz"}]', '[]', '2026-03-05T08:30:00Z', null),
('ATP-CL-26-01562', 'WOM-2026-087', 'WOM S.A.', '77.012.345-6', 'Infratel SpA', 'OPERACION Y MANTENIMIENTO', 'CL31102', '2026-03-15', '2026-03-17', 'Validado', true, 'accesos@wom.cl', 'ops@infratel.cl', '[{"rut":"16.789.012-3","nombre":"María González"}]', '[]', '2026-03-06T10:00:00Z', null),
('ATP-CL-26-01550', '', 'Telefónica Móviles Chile S.A.', '76.543.210-9', 'TecnoAndes SpA', 'INSTALACIÓN', 'CL91230', '2026-03-20', '2026-03-24', 'Autorizado', true, 'accesos@telefonica.cl', 'ops@tecnoandes.cl', '[{"rut":"14.567.890-1","nombre":"Roberto Soto"}]', '[]', '2026-02-20T09:00:00Z', '2026-02-22T16:00:00Z')
on conflict (id) do nothing;

insert into alertas (id, sitio_id, tipo, titulo, descripcion, estado) values
('ALT001', 'CL48769', 'contractual', 'Problema contractual con propietario', 'El contrato de arriendo vence el 30/03/2026. Posibles demoras en autorizaciones.', 'activo'),
('ALT002', 'CL31102', 'documentacion', 'Requiere permiso municipal adicional', 'Este sitio requiere adjuntar permiso de la Municipalidad de Valparaíso para trabajos de instalación.', 'activo'),
('ALT003', 'CL-TAR-5021', 'documentacion', 'Requiere coordinación con Gendarmería', 'Recinto penitenciario: coordinar con Gendarmería 72h antes. Adjuntar cédulas de todos los técnicos.', 'activo')
on conflict (id) do nothing;
