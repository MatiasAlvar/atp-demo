import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── SOLICITUDES ───────────────────────────────────────────────
export async function getSolicitudes() {
  const { data, error } = await supabase.from('solicitudes').select('*').order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}

export async function upsertSolicitud(sol) {
  const { data, error } = await supabase.from('solicitudes').upsert(toDb(sol), { onConflict: 'id' }).select()
  if (error) { console.error(error); return null }
  return data?.[0]
}

export async function updateEstado(id, estado, extra = {}) {
  const patch = { estado, ...extra }
  if (estado === 'Autorizado') patch.ts_autorizado = new Date().toISOString()
  console.log('🔄 updateEstado llamado:', id, estado, patch)
  const { data, error } = await supabase.from('solicitudes').update(patch).eq('id', id).select()
  if (error) {
    console.error('❌ updateEstado ERROR:', error)
    return false
  }
  console.log('✅ updateEstado OK, DB devolvió:', data?.[0]?.estado)
  return true
}

// ── ALERTAS ───────────────────────────────────────────────────
export async function getAlertas() {
  const { data, error } = await supabase.from('alertas').select('*').order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}

export async function upsertAlerta(alerta) {
  const { error } = await supabase.from('alertas').upsert(alerta, { onConflict: 'id' })
  if (error) console.error(error)
}

export async function resolverAlerta(id) {
  const { error } = await supabase.from('alertas').update({ estado: 'resuelto' }).eq('id', id)
  if (error) console.error(error)
}

// ── TRABAJADORES ──────────────────────────────────────────────
export async function getTrabajadores() {
  const { data, error } = await supabase.from('trabajadores_acreditados').select('*').order('nombre')
  if (error) { console.error(error); return [] }
  return data
}

export async function upsertTrabajador(t) {
  const { error } = await supabase.from('trabajadores_acreditados').upsert(t, { onConflict: 'id' })
  if (error) console.error(error)
}

export async function deleteTrabajador(id) {
  const { error } = await supabase.from('trabajadores_acreditados').delete().eq('id', id)
  if (error) console.error(error)
}

// ── EMPRESAS ──────────────────────────────────────────────────
export async function getEmpresas() {
  const { data, error } = await supabase.from('empresas_contratistas').select('*').order('nombre')
  if (error) { console.error(error); return [] }
  return data
}

export async function upsertEmpresa(e) {
  const { error } = await supabase.from('empresas_contratistas').upsert(e, { onConflict: 'rut' })
  if (error) { console.error(error); return false }
  return true
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────
export function subscribeSolicitudes(callback) {
  return supabase.channel('sol-' + Math.random())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, callback)
    .subscribe()
}

export function subscribeAlertas(callback) {
  return supabase.channel('alt-' + Math.random())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, callback)
    .subscribe()
}

// ── HELPERS ───────────────────────────────────────────────────
function toDb(sol) {
  return {
    id: sol.id,
    ref_cliente: sol.refCliente || '',
    operador: sol.operador || '',
    empresa_rut: sol.empresa || '',
    empresa_nombre: sol.empresaNombre || '',
    trabajo: sol.trabajo || '',
    sitio_id: sol.sitio || '',
    desde: sol.desde || null,
    hasta: sol.hasta || null,
    zona: sol.zona || '',
    estado: sol.estado || 'Borrador',
    auto: sol.auto || false,
    motivo: sol.motivo || '',
    correo_mandante: sol.correoMandante || '',
    correo_contratista: sol.correoContratista || '',
    trabajadores: sol.trabajadores || [],
    historial: sol.historial || [],
    ts_enviado: sol.tsEnviado || null,
    ts_autorizado: sol.tsAutorizado || null,
    motivo_rechazo: sol.motivoRechazo || '',
  }
}

export function fromDb(row) {
  return {
    id: row.id,
    refCliente: row.ref_cliente || '',
    operador: row.operador,
    empresa: row.empresa_rut || '',
    empresaNombre: row.empresa_nombre || '',
    trabajo: row.trabajo || '',
    sitio: row.sitio_id || '',
    desde: row.desde || '',
    hasta: row.hasta || '',
    zona: row.zona || '',
    estado: row.estado || 'Borrador',
    auto: row.auto || false,
    motivo: row.motivo || '',
    correoMandante: row.correo_mandante || '',
    correoContratista: row.correo_contratista || '',
    trabajadores: row.trabajadores || [],
    historial: row.historial || [],
    tsEnviado: row.ts_enviado || '',
    tsAutorizado: row.ts_autorizado || '',
    motivoRechazo: row.motivo_rechazo || '',
  }
}

// ── SITIOS CONFIG (contactos editables) ───────────────────────
export async function getSitiosConfig() {
  const { data, error } = await supabase.from('sitios_config').select('*')
  if (error) { console.error(error); return {} }
  return Object.fromEntries((data||[]).map(r => [r.sitio_id, r]))
}

export async function upsertSitioConfig(cfg) {
  const { error } = await supabase.from('sitios_config').upsert(cfg, { onConflict: 'sitio_id' })
  if (error) console.error(error)
  return !error
}

// ── REGLAS POR SITIO ─────────────────────────────────────────
export async function getReglasSitios() {
  const { data, error } = await supabase.from('reglas_sitios').select('*')
  if (error) { console.error(error); return {} }
  return Object.fromEntries((data||[]).map(r => [r.sitio_id, r]))
}

export async function upsertReglaSitio(regla) {
  const { error } = await supabase.from('reglas_sitios')
    .upsert({ ...regla, updated_at: new Date().toISOString() }, { onConflict: 'sitio_id' })
  if (error) console.error(error)
  return !error
}
