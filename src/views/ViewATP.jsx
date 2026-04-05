/* ═══════════════════════════════════════════════════════════
   src/views/ViewATP.jsx — ATP Chile Admin · PrimeCorp SpA
   Leaflet cargado desde CDN — sin npm install
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase, getSolicitudes, fromDb, updateEstado as supabaseUpdateEstado, getSitiosConfig, upsertSitioConfig } from '../lib/supabase'
import { TODOS_SITIOS as SITES, COLOCALIZACIONES, TIPOS_DOCS_SITIO } from '../shared/data'
import {
  G, BK, RD, WA, SB,
  ATPLogo, Ic, Badge, Card, CardHeader, Btn, Timeline, STATE_COLORS,
} from '../shared/components'


/* ─── HELPERS GLOBALES ──────────────────────────────────── */
function diasEsperando(sol) {
  if (sol.estado !== 'En Gestión Propietario') return 0
  if (!sol.tsEnviado) return 0
  return Math.floor((Date.now() - new Date(sol.tsEnviado).getTime()) / 86400000)
}
function isCriticalSite(sitioId, sols) {
  const hace30 = new Date(Date.now() - 30 * 86400000)
  return sols.filter(s => s.sitio === sitioId && s.estado === 'Rechazado' && s.tsEnviado && new Date(s.tsEnviado) > hace30).length >= 3
}

/* ─── LEAFLET CDN LOADER ────────────────────────────────── */
const useLeaflet = () => {
  const [ready, setReady] = useState(!!window.L)
  useEffect(() => {
    if (window.L) { setReady(true); return }
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!document.querySelector('#leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setReady(true)
      document.head.appendChild(script)
    } else if (window.L) {
      setReady(true)
    }
  }, [])
  return ready
}

/* ─── CLAUDE API ────────────────────────────────────────── */
const callClaude = async (messages, systemPrompt) => {
  const apiKey = localStorage.getItem('atp_apikey')
  if (!apiKey) throw new Error('API key no configurada. Agrégala en Configuración.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return data.content[0]?.text || ''
}

/* ─── SIDEBAR ───────────────────────────────────────────── */
const TABS = [
  { id: 'dashboard',   label: 'Dashboard',       Icon: Ic.home    },
  { id: 'solicitudes', label: 'Solicitudes',      Icon: Ic.file,   pendiente: true },
  { id: 'mapa',        label: 'Mapa de Sitios',   Icon: Ic.map     },
  { id: 'sitios',      label: 'Sitios / Contactos', Icon: Ic.tower  },
  { id: 'whatsapp',    label: 'WhatsApp IA',       Icon: Ic.msg,    badge: true },
  { id: 'documentos',  label: 'Documentación',    Icon: Ic.shield  },
  { id: 'docs_sitios', label: 'Docs para Sitios',  Icon: Ic.file    },
  { id: 'historial',   label: 'Historial',        Icon: Ic.history },
  { id: 'config',      label: 'Configuración',    Icon: Ic.settings },
  { id: 'alertas',     label: '🚨 Alertas',         Icon: Ic.warn },
]

const AtpSidebar = ({ active, setActive, pendWa, pendPend = 0 }) => (
  <aside style={{
    width: 240, minHeight: '100vh', background: '#FFFFFF', borderRight: '1px solid #E5E7EB',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  }}>
    {/* Logo */}
    <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #F0F0F0' }}>
      <ATPLogo variant="full" height={40} style={{ filter: "brightness(0) invert(1)" }} />
      <div style={{ marginTop: 12, padding: '5px 10px', background: '#FEF3C7', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
        <span className="mono" style={{ fontSize: 10, color: '#92400E', letterSpacing: .5 }}>ATP Admin · Sistema activo</span>
      </div>
    </div>
    {/* Nav */}
    <nav style={{ padding: '8px 0', flex: 1 }}>
      {TABS.map(({ id, label, Icon, badge, pendiente }) => {
        const on = active === id
        return (
          <button key={id} onClick={() => setActive(id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 11,
            padding: '11px 18px', background: on ? '#FEF3C7' : 'transparent',
            borderLeft: `3px solid ${on ? G : 'transparent'}`,
            color: on ? G : '#6B7280',
            fontSize: 13, fontWeight: on ? 600 : 400, fontFamily: 'IBM Plex Sans',
            border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
            position: 'relative',
          }}>
            <Icon w={17} h={17} style={{ color: on ? G : '#9CA3AF', flexShrink: 0 }} />
            {label}
            {badge && pendWa > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#22C55E', color: '#fff',
                fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px',
                fontFamily: 'IBM Plex Mono',
              }}>{pendWa}</span>
            )}
            {pendiente && pendPend > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#F59E0B', color: '#fff',
                fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px',
                fontFamily: 'IBM Plex Mono',
              }}>{pendPend}</span>
            )}
          </button>
        )
      })}
    </nav>
    <div style={{ padding: '14px 18px', borderTop: '1px solid #F0F0F0' }}>
      <div className="mono" style={{ fontSize: 10, color: '#9CA3AF' }}>v2.2.0 · © 2025 PrimeCorp SpA</div>
    </div>
  </aside>
)

/* ─── HEADER ─────────────────────────────────────────────── */
const AtpHeader = ({ title, sub, onLogout }) => (
  <header style={{
    background: '#fff', borderBottom: '1px solid #E5E7EB',
    padding: '0 28px', height: 62,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
  }}>
    <div>
      <h1 style={{ fontSize: 17, fontWeight: 700, color: BK, letterSpacing: '-.3px' }}>{title}</h1>
      {sub && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{sub}</p>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <div style={{ width: 30, height: 30, background: G, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: BK }}>ATP</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: BK }}>ATP Chile</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Administrador</div>
        </div>
      </div>
      {onLogout && (
        <button onClick={onLogout} title="Cerrar sesión" style={{ padding: 8, background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', display: 'flex', color: '#6B7280' }}>
          <Ic.logout w={16} h={16} />
        </button>
      )}
    </div>
  </header>
)


/* ─── WIDGET CLIMA — open-meteo.com sin API key ─────────── */
const WeatherWidget = ({ sols }) => {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sitiosActivos = sols
      .filter(s => ['Autorizado', 'En Gestión Propietario'].includes(s.estado))
      .map(s => SITES.find(x => x.id === s.sitio))
      .filter(Boolean)
      .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
      .slice(0, 5) // max 5 consultas

    if (!sitiosActivos.length) { setLoading(false); return }

    Promise.all(sitiosActivos.map(async site => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lng}&current=wind_speed_10m,precipitation,weather_code&wind_speed_unit=kmh`
        )
        const data = await res.json()
        const wind = data.current?.wind_speed_10m || 0
        const rain = data.current?.precipitation || 0
        const wcode = data.current?.weather_code || 0
        const isStormy = wcode >= 95
        if (wind > 60 || rain > 10 || isStormy) {
          return {
            site: site.nombre, id: site.id, region: site.region,
            wind, rain, stormy: isStormy,
          }
        }
        return null
      } catch { return null }
    })).then(results => {
      setAlerts(results.filter(Boolean))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [sols])

  if (loading) return null
  if (!alerts.length) return (
    <div style={{ marginTop: 14, padding: '10px 16px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, fontSize: 12, color: '#15803D', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>🌤</span> Sin alertas climáticas en sitios activos
    </div>
  )

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: BK, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>⛈</span> Alertas climáticas en sitios activos
      </div>
      {alerts.map((a, i) => (
        <div key={i} style={{ padding: '10px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: BK }}>{a.site}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{a.region} · {a.id}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
            {a.wind > 60  && <span style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>💨 {Math.round(a.wind)} km/h</span>}
            {a.rain > 10  && <span style={{ background: '#DBEAFE', color: '#1D4ED8', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>🌧 {a.rain} mm/h</span>}
            {a.stormy     && <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>⛈ Tormenta</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB DASHBOARD
   ════════════════════════════════════════════════════════════ */
const TabDashboard = ({ sols }) => {
  const pend = sols.filter(s => ['BORRADOR', 'ENVIADA', 'EN REVISIÓN'].includes(s.estado)).length
  const apr  = sols.filter(s => s.estado === 'APROBADA').length
  const rec  = sols.filter(s => s.estado === 'RECHAZADA').length
  const act  = SITES.filter(s => s.estado === 'ocupado').length
  const alertas = []

  return (
    <div className="fade-up" style={{ padding: 28 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Pendientes',   val: pend, color: '#3B82F6', Icon: Ic.clock, sub: 'En revisión' },
          { label: 'Aprobadas',    val: apr,  color: '#22C55E', Icon: Ic.check, sub: 'Últimos 30 días' },
          { label: 'Rechazadas',   val: rec,  color: RD,        Icon: Ic.x,     sub: 'Últimos 30 días' },
          { label: 'Sitios Activos', val: act, color: G,        Icon: Ic.tower, sub: 'En este momento' },
        ].map(({ label, val, color, Icon, sub }, i) => (
          <Card key={i} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
                <div className="mono" style={{ fontSize: 38, fontWeight: 700, color: BK, lineHeight: 1, marginTop: 7 }}>{val}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>{sub}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon w={20} h={20} style={{ color }} />
              </div>
            </div>
            <div style={{ marginTop: 14, height: 3, background: '#F3F4F6', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${Math.min((val / 5) * 100, 100)}%`, background: color, borderRadius: 2, transition: 'width .5s' }} />
            </div>
          </Card>
        ))}
      </div>

      {/* Mapa mini + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <Card style={{ overflow: 'hidden' }}>
          <CardHeader title="Mapa de Sitios — Chile" icon={Ic.map}
            right={<span className="mono" style={{ fontSize: 11, color: '#9CA3AF' }}>{SITES.length} sitios</span>} />
          <SitesMapLeaflet height={360} />
          <div style={{ padding: '10px 18px', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {[{ color: G, label: 'Libre' }, { color: '#F59E0B', label: 'Ocupado' }, { color: WA, label: 'Con WhatsApp' }].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color }} />{l.label}
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Alertas */}
          <Card>
            <CardHeader title="Alertas Documentales" icon={Ic.warn} borderColor={RD} />
            <div style={{ padding: 10, maxHeight: 200, overflowY: 'auto' }}>
              {alertas.length === 0
                ? <div style={{ padding: 16, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Sin alertas</div>
                : alertas.map((d, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                    background: d.estado === 'vencido' ? '#FEF2F2' : '#FFFBEB',
                    borderLeft: `3px solid ${d.estado === 'vencido' ? RD : '#F59E0B'}`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: d.estado === 'vencido' ? '#991B1B' : '#92400E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nombre}</div>
                    {d.trabajador && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{d.trabajador}</div>}
                    <div className="mono" style={{ fontSize: 10, color: d.estado === 'vencido' ? RD : '#F59E0B', marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}>
                      {d.estado === 'vencido' ? '✕ Vencido' : `⚠ Vence ${d.vence}`}
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Recientes */}
          <Card style={{ flex: 1 }}>
            <CardHeader title="Solicitudes Recientes" icon={Ic.file} />
            {sols.slice(0, 4).map((s, i) => (
              <div key={i} style={{ padding: '12px 18px', borderBottom: i < 3 ? '1px solid #F9FAFB' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 11, color: G, fontWeight: 600 }}>{s.id}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: BK, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{SITES.find(x=>x.id===s.sitio)?.nombre||s.sitio}</div>
                </div>
                <Badge label={s.estado} />
              </div>
            ))}
          </Card>
        </div>
      </div>
      <WeatherWidget sols={sols} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB SOLICITUDES
   ════════════════════════════════════════════════════════════ */
const TabSolicitudes = ({ sols, setSols }) => {
  const [sel, setSel] = useState(null)
  const [rechModal, setRechModal] = useState(null)
  const [motivo, setMotivo] = useState('')

  const approve = async id => {
    await supabaseUpdateEstado(id, 'APROBADA')
    setSols(p => p.map(s => s.id === id ? { ...s, estado: 'APROBADA' } : s))
    if (sel?.id === id) setSel(p => ({ ...p, estado: 'APROBADA' }))
  }
  const reject = async id => {
    if (!motivo.trim()) return
    await supabaseUpdateEstado(id, 'RECHAZADA', { motivo_rechazo: motivo })
    setSols(p => p.map(s => s.id === id ? { ...s, estado: 'RECHAZADA', motivoRechazo: motivo } : s))
    if (sel?.id === id) setSel(p => ({ ...p, estado: 'RECHAZADA', motivoRechazo: motivo }))
    setRechModal(null); setMotivo('')
  }

  return (
    <div className="fade-up" style={{ padding: 28 }}>
      <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 18 }}>{sols.length} solicitudes en el sistema</div>
      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1.1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sols.map(s => {
            const site = SITES.find(x => x.id === s.sitio)
            return (
              <Card key={s.id} onClick={() => setSel(prev => prev?.id === s.id ? null : s)}
                style={{
                  padding: '16px 18px', cursor: 'pointer',
                  border: `1px solid ${sel?.id === s.id ? G : '#E5E7EB'}`,
                  boxShadow: sel?.id === s.id ? `0 0 0 2px ${G}22,0 4px 12px rgba(0,0,0,.06)` : undefined,
                  transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div className="mono" style={{ fontSize: 12, color: G, fontWeight: 600 }}>{s.id}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: BK, marginTop: 2 }}>{SITES.find(x=>x.id===s.sitio)?.nombre||s.sitio}</div>
                  </div>
                  <Badge label={s.estado} />
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.trabajo}</div>
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#9CA3AF', flexWrap: 'wrap' }}>
                  <span>📅 {s.fechaIngreso}</span>
                  <span>👷 {s.contratista}</span>
                  {site?.whatsapp && <span style={{ color: WA }}>📲 WhatsApp</span>}
                  {diasEsperando(s) > 2 && (
                    <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '1px 6px', fontWeight: 700, fontSize: 10 }}>
                      ⏳ {diasEsperando(s)}d esperando
                    </span>
                  )}
                </div>
                <Timeline estado={s.estado} />
              </Card>
            )
          })}
        </div>

        {sel && (
          <Card style={{ position: 'sticky', top: 72, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', background: BK, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="mono" style={{ fontSize: 12, color: G, fontWeight: 600 }}>{sel.id}</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: 2 }}>{SITES.find(x=>x.id===sel.sitio)?.nombre||sel.sitio}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge label={sel.estado} />
                <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', marginLeft: 4 }}>
                  <Ic.x w={17} h={17} />
                </button>
              </div>
            </div>
            <div style={{ padding: '18px 22px', maxHeight: '70vh', overflowY: 'auto' }}>
              <Timeline estado={sel.estado} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                {[
                  { lbl: 'Sitio ID', val: sel.sitio, mono: true },
                  { lbl: 'Empresa', val: sel.empresa },
                  { lbl: 'Fecha ingreso', val: `${sel.fechaIngreso} ${sel.horaIngreso}` },
                  { lbl: 'Fecha salida', val: `${sel.fechaSalida || '—'} ${sel.horaSalida || ''}` },
                  { lbl: 'Tipo de faena', val: sel.trabajo, full: true },
                ].map((x, i) => (
                  <div key={i} style={{ gridColumn: x.full ? '1/-1' : 'auto' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700, letterSpacing: .5 }}>{x.lbl}</div>
                    <div className={x.mono ? 'mono' : ''} style={{ fontSize: 13, fontWeight: 500, color: BK, marginTop: 3 }}>{x.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                  <Ic.users w={14} h={14} /> Cuadrilla ({sel.cuadrilla?.length} pers.)
                </div>
                {sel.cuadrilla?.map((w, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < sel.cuadrilla.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                    <span style={{ fontSize: 13, color: BK }}>{w.nombre}</span>
                    <span className="mono" style={{ fontSize: 12, color: '#6B7280' }}>{w.rut}</span>
                  </div>
                ))}
              </div>
              {sel.motivoRechazo && (
                <div style={{ marginTop: 12, padding: 12, background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>Motivo de rechazo</div>
                  <div style={{ fontSize: 13, color: '#7F1D1D' }}>{sel.motivoRechazo}</div>
                </div>
              )}
              {sel.estado === 'EN REVISIÓN' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <Btn variant="ghost" onClick={() => approve(sel.id)}
                    style={{ flex: 1, justifyContent: 'center', background: '#DCFCE7', color: '#15803D', borderColor: '#86EFAC', fontWeight: 700 }}>
                    <Ic.check w={16} h={16} /> Aprobar
                  </Btn>
                  <Btn variant="danger" onClick={() => { setRechModal(sel.id); setMotivo('') }}
                    style={{ flex: 1, justifyContent: 'center' }}>
                    <Ic.x w={16} h={16} /> Rechazar
                  </Btn>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {rechModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) { setRechModal(null); setMotivo('') } }}>
          <Card style={{ width: 480, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: BK, marginBottom: 14 }}>Motivo de rechazo (obligatorio)</div>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={4} autoFocus
              placeholder="Indique el motivo del rechazo para notificar al contratista y a ATP Chile…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'IBM Plex Sans', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => { setRechModal(null); setMotivo('') }}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => reject(rechModal)} style={{ opacity: motivo.trim() ? 1 : .5 }}>Confirmar rechazo</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   LEAFLET MAP COMPONENT — versión nueva exacta
   (CartoDB dark_all + puntos hover + popups dark)
   ════════════════════════════════════════════════════════════ */
const SitesMapLeaflet = ({ sites = SITES, height = 520, zoom = 7, center = [-34.2, -70.85], showPopup = true }) => {
  const leafletReady = useLeaflet()
  const ref  = useRef(null)
  const inst = useRef(null)

  useEffect(() => {
    if (!leafletReady || !ref.current || inst.current) return
    const L = window.L

    const map = L.map(ref.current, {
      center, zoom,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    sites.forEach(site => {
      const color = site.whatsapp ? WA : site.estado === 'ocupado' ? '#F59E0B' : G
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 3px ${color}44;cursor:pointer;transition:transform .15s" onmouseenter="this.style.transform='scale(1.5)'" onmouseleave="this.style.transform='scale(1)'"></div>`,
        className: '',
        iconSize:   [14, 14],
        iconAnchor: [7, 7],
      })

      const m = L.marker([site.lat, site.lng], { icon })

      if (showPopup) {
        m.bindPopup(`
          <div style="font-family:'IBM Plex Sans',sans-serif;padding:14px;min-width:210px;background:#FFFFFF;color:#1A1A1A;border-radius:10px;border:1px solid #E5E7EB;box-shadow:0 4px 16px rgba(0,0,0,.12)">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${G};font-weight:600;letter-spacing:.5px">${site.id}</div>
            <div style="font-weight:700;font-size:15px;margin:4px 0 2px">${site.nombre}</div>
            <div style="font-size:12px;color:#6B7280;margin-bottom:10px">${site.region} · ${site.tipo}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${site.estado === 'ocupado' ? '#F59E0B22' : '#22C55E22'};color:${site.estado === 'ocupado' ? '#FBBF24' : '#4ADE80'};font-family:monospace;text-transform:uppercase">${site.estado}</span>
              ${site.whatsapp ? `<span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#25D36622;color:#4ADE80;font-family:monospace">📲 WHATSAPP</span>` : ''}
              ${site.restriccionHorario ? `<span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#F59E0B22;color:#FBBF24;font-family:monospace">⏰ ${site.restriccionHorario.inicio}–${site.restriccionHorario.fin}</span>` : ''}
            </div>
            <div style="margin-top:10px;font-size:11px;color:#9CA3AF">${site.propietario}</div>
          </div>`,
          { maxWidth: 260 }
        )
      }
      m.addTo(map)
    })

    inst.current = map
    return () => {
      if (inst.current) { inst.current.remove(); inst.current = null }
    }
  }, [leafletReady])   // eslint-disable-line react-hooks/exhaustive-deps

  if (!leafletReady) return (
    <div style={{ height, width: '100%', background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(201,168,76,.5)', fontSize: 13, fontFamily: 'IBM Plex Mono' }}>Cargando mapa…</span>
    </div>
  )
  return <div ref={ref} style={{ height, width: '100%' }} />
}


/* ════════════════════════════════════════════════════════════
   MAPA CON RELIEVE — componente separado, no modifica SitesMapLeaflet
   ════════════════════════════════════════════════════════════ */
const SitesMapRelieve = ({ sites = SITES, height = 580, criticalIds = [] }) => {
  const leafletReady = useLeaflet()
  const ref  = useRef(null)
  const inst = useRef(null)

  useEffect(() => {
    if (!leafletReady || !ref.current || inst.current) return
    const L = window.L

    const map = L.map(ref.current, {
      center: [-34.2, -70.85], zoom: 7,
      zoomControl: true, scrollWheelZoom: false, attributionControl: false,
    })

    // Tile relieve ESRI + overlay azul mar
    L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '© OpenTopoMap',
    }).addTo(map)

    sites.forEach(site => {
      const isCritical = criticalIds.includes(site.id)
      const color = isCritical ? '#EF4444' : site.whatsapp ? WA : site.estado === 'ocupado' ? '#F59E0B' : G
      const pulse = isCritical ? `animation:criticalPulse 1.2s infinite;` : ''
      const icon = L.divIcon({
        html: `<div style="width:${isCritical?18:14}px;height:${isCritical?18:14}px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 3px ${color}44;cursor:pointer;${pulse}"></div>`,
        className: '', iconSize: [isCritical?18:14, isCritical?18:14], iconAnchor: [isCritical?9:7, isCritical?9:7],
      })
      const m = L.marker([site.lat, site.lng], { icon })
      m.bindPopup(`
        <div style="font-family:'IBM Plex Sans',sans-serif;padding:14px;min-width:210px;background:#FFFFFF;color:#1A1A1A;border-radius:10px;border:1px solid #E5E7EB">
          ${isCritical ? '<div style="background:#FEE2E2;color:#B91C1C;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700;margin-bottom:8px">⚠ ZONA CRÍTICA</div>' : ''}
          <div style="font-family:monospace;font-size:11px;color:${G};font-weight:600">${site.id}</div>
          <div style="font-weight:700;font-size:15px;margin:4px 0 2px">${site.nombre}</div>
          <div style="font-size:12px;color:#6B7280">${site.region} · ${site.tipo}</div>
        </div>`, { maxWidth: 260 })
      m.addTo(map)
    })

    inst.current = map
    return () => {
      if (inst.current) { inst.current.remove(); inst.current = null }
    }
  }, [leafletReady])

  if (!leafletReady) return <div style={{ height, width: '100%', background: '#E8F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 13, color: '#9CA3AF' }}>Cargando mapa…</span></div>
  return <div ref={ref} style={{ height, width: '100%' }} />
}

/* ════════════════════════════════════════════════════════════
   TAB MAPA — exacto de versión nueva
   ════════════════════════════════════════════════════════════ */
const TabMapa = () => {
  const [filter, setFilter]     = useState('todos')
  const [tileMode, setTileMode] = useState('claro')  // 'claro' | 'relieve'
  const [tablaQ, setTablaQ]     = useState('')
  const [tablaRegion, setTablaRegion] = useState('')
  const [tablaTipo, setTablaTipo]     = useState('')
  const [tablaWa, setTablaWa]         = useState('')
  const [tablaPg, setTablaPg]         = useState(1)
  const [mapFocusSite, setMapFocusSite] = useState(null)
  const TABLA_PP = 20

  const filtered = useMemo(() => {
    if (filter === 'whatsapp') return SITES.filter(s => s.whatsapp)
    if (filter === 'ocupado')  return SITES.filter(s => s.estado === 'ocupado')
    if (filter === 'libre')    return SITES.filter(s => s.estado === 'libre')
    return SITES
  }, [filter])

  const mapKey = filter

  const tablaFiltered = useMemo(() => {
    return SITES.filter(s => {
      if (tablaQ) {
        const ql = tablaQ.toLowerCase()
        if (!s.nombre.toLowerCase().includes(ql) && !s.id.toLowerCase().includes(ql) && !(s.comuna||'').toLowerCase().includes(ql)) return false
      }
      if (tablaRegion && s.region !== tablaRegion) return false
      if (tablaTipo  && s.tipo  !== tablaTipo)  return false
      if (tablaWa === 'si' && !s.whatsapp) return false
      if (tablaWa === 'no' && s.whatsapp)  return false
      return true
    })
  }, [tablaQ, tablaRegion, tablaTipo, tablaWa])

  const tablaTotalPg = Math.ceil(tablaFiltered.length / TABLA_PP)
  const tablaPaged   = tablaFiltered.slice((tablaPg-1)*TABLA_PP, tablaPg*TABLA_PP)

  return (
    <div className="fade-up" style={{ padding: 28 }}>
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 9, padding: 3, gap: 2 }}>
          {[
            { id: 'todos',    label: 'Todos' },
            { id: 'libre',    label: 'Libres' },
            { id: 'ocupado',  label: 'Ocupados' },
            { id: 'whatsapp', label: '📲 WhatsApp' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
              background: filter === f.id ? BK : 'transparent',
              color: filter === f.id ? '#fff' : '#6B7280',
              border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Sans', transition: 'all .15s',
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          {[{ color: G, label: 'Libre' }, { color: '#F59E0B', label: 'Ocupado' }, { color: WA, label: 'WhatsApp' }].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />{l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ background: '#F8FAFC', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic.map w={16} h={16} style={{ color: G }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Infraestructura ATP Chile</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,.15)', borderRadius: 7, padding: 2, gap: 2 }}>
              {[{ id: 'claro', label: '🗺 Normal' }, { id: 'relieve', label: '⛰ Relieve' }].map(t => (
                <button key={t.id} onClick={() => setTileMode(t.id)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: tileMode === t.id ? 'rgba(255,255,255,.9)' : 'transparent', color: tileMode === t.id ? BK : 'rgba(255,255,255,.7)', border: 'none', cursor: 'pointer', transition: 'all .15s' }}>{t.label}</button>
              ))}
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{filtered.length} sitios</span>
          </div>
        </div>
        {tileMode === 'claro'
          ? <SitesMapLeaflet key={mapKey + 'c'} sites={filtered} height={580} zoom={7} />
          : <SitesMapRelieve key={mapKey + 'r'} sites={filtered} height={580} />
        }
      </Card>

      {/* Buscador + tabla con filtros */}
      <Card style={{ marginTop: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Ic.search w={14} h={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input value={tablaQ} onChange={e => { setTablaQ(e.target.value); setTablaPg(1) }}
              placeholder="Buscar por nombre, ID, comuna..."
              style={{ width: '100%', paddingLeft: 32, padding: '8px 10px 8px 32px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', outline: 'none' }} />
          </div>
          <select value={tablaRegion} onChange={e => { setTablaRegion(e.target.value); setTablaPg(1) }}
            style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', outline: 'none', color: BK }}>
            <option value="">Todas las regiones</option>
            {[...new Set(SITES.map(s => s.region).filter(Boolean))].sort().map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={tablaTipo} onChange={e => { setTablaTipo(e.target.value); setTablaPg(1) }}
            style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', outline: 'none', color: BK }}>
            <option value="">Todos los tipos</option>
            {[...new Set(SITES.map(s => s.tipo).filter(Boolean))].sort().map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={tablaWa} onChange={e => { setTablaWa(e.target.value); setTablaPg(1) }}
            style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', outline: 'none', color: BK }}>
            <option value="">WhatsApp: todos</option>
            <option value="si">Con WhatsApp</option>
            <option value="no">Sin WhatsApp</option>
          </select>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{tablaFiltered.length} sitios</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              {['ID', 'Nombre', 'Región', 'Comuna', 'Tipo', 'Altura', 'WhatsApp'].map((h, i) => (
                <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tablaPaged.length === 0
              ? <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Sin resultados</td></tr>
              : tablaPaged.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}
                  onClick={() => setMapFocusSite(s)}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="mono" style={{ padding: '11px 14px', fontSize: 11, color: G, fontWeight: 600 }}>{s.id}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: BK }}>{s.nombre}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#6B7280' }}>{s.region}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#6B7280' }}>{s.comuna}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#6B7280' }}>{s.tipo}</td>
                  <td className="mono" style={{ padding: '11px 14px', fontSize: 12, color: '#6B7280' }}>{s.alturaTotal}m</td>
                  <td style={{ padding: '11px 14px' }}>
                    {s.whatsapp ? <span style={{ fontSize: 13 }}>✅</span> : <span style={{ color: '#D1D5DB' }}>—</span>}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {tablaTotalPg > 1 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Pág. {tablaPg} de {tablaTotalPg}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setTablaPg(p => Math.max(1, p-1))} disabled={tablaPg===1}
                style={{ padding: '4px 10px', border: '1px solid #E5E7EB', borderRadius: 5, background: '#fff', cursor: tablaPg===1?'default':'pointer', opacity: tablaPg===1?.4:1 }}>‹</button>
              <button onClick={() => setTablaPg(p => Math.min(tablaTotalPg, p+1))} disabled={tablaPg===tablaTotalPg}
                style={{ padding: '4px 10px', border: '1px solid #E5E7EB', borderRadius: 5, background: '#fff', cursor: tablaPg===tablaTotalPg?'default':'pointer', opacity: tablaPg===tablaTotalPg?.4:1 }}>›</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB WHATSAPP — IA REAL (Claude claude-sonnet-4-20250514)
   ════════════════════════════════════════════════════════════ */
const buildSystemPrompt = (sol, site) => {
  const tecnicos = (sol.trabajadores||[]).map(t=>t.nombre).filter(Boolean).join(', ') || sol.empresaNombre || '—'
  const horario  = site?.restriccionHorario
    ? `⚠ Restricción horaria del sitio: solo se permite ingreso entre ${site.restriccionHorario.inicio} y ${site.restriccionHorario.fin} hrs. ${site.restriccionHorario.descripcion}`
    : 'Sin restricción horaria especial.'

  return `Eres el asistente virtual de ATP Chile que gestiona autorizaciones de acceso a sitios de infraestructura de telecomunicaciones vía WhatsApp.

Estás respondiendo EN NOMBRE DE ATP CHILE a mensajes del propietario del sitio.

CONTEXTO COMPLETO DE LA SOLICITUD:
- ID Solicitud: ${sol.id}
- Sitio: ${site?.nombre || sol.sitio} (${sol.sitio})
- Propietario del sitio: ${site?.propietario || 'No especificado'}
- Tipo de sitio: ${site?.tipo || '—'} | Región: ${site?.region || '—'} | Comuna: ${site?.comuna || '—'}
- Operadora: ${sol.empresa}
- Descripción del trabajo: ${sol.trabajo}
- Fecha de ingreso: ${sol.desde} → ${sol.hasta}
- Hora ingreso: ${sol.horaInicio||'—'} · Hora salida: ${sol.horaFin||'—'}
- Empresa contratista: ${sol.empresaNombre || sol.empresa}
- Trabajadores: ${(sol.trabajadores||[]).map(t=>`${t.nombre||'—'} (RUT: ${t.rut||'—'})`).join(', ') || '—'}
- ${horario}

INSTRUCCIONES DE COMPORTAMIENTO:
1. Responde en español chileno, informal y amable. Tuteo suave, lenguaje directo. Máximo 3-4 oraciones por respuesta.
2. Si el propietario pregunta sobre el trabajo, técnicos, fechas o el sitio — responde con los datos REALES del contexto, nunca inventes.
3. Si el propietario AUTORIZA el acceso (dice "sí", "autorizo", "ok", "dale", "de acuerdo", "listo", "aceptado", "procede", o equivalentes) — confirma con entusiasmo y al final de tu respuesta escribe en una nueva línea exactamente: <<ACCION:AUTORIZAR>>
4. Si el propietario RECHAZA (dice "no", "rechazo", "no autorizo", "no puedo", "imposible") Y da un motivo — confirma el rechazo con el motivo y escribe al final: <<ACCION:RECHAZAR:motivo_aqui>>
5. Si el propietario rechaza SIN DAR MOTIVO — pide el motivo amablemente (sin incluir ningún tag <<ACCION>>).
6. Si hay dudas o preguntas — responde solo con información real del contexto.
7. Si preguntan por horario de llegada o salida, responde con las horas exactas: ingreso ${sol.horaInicio||'—'} y salida ${sol.horaFin||'—'}.
8. NUNCA incluyas el tag <<ACCION>> en respuestas que no sean una autorización o rechazo confirmado.

CONTEXTO TÉCNICO ADICIONAL (úsalo si es relevante):
- Altura de la estructura: ${site?.alturaTotal || site?.altTotal || '—'}m | Tipo: ${site?.tipo || '—'}
- Propietario: ${site?.propietario || '—'} | Tel: ${site?.tel || 'no registrado'}
- Días de trabajo: ${sol.desde && sol.hasta ? Math.ceil((new Date(sol.hasta)-new Date(sol.desde))/86400000)+1 : '—'} día(s)

CALIDAD DE RESPUESTAS:
- Sé específico: usa nombres, fechas exactas y RUTs cuando los tengas
- Ante dudas de seguridad: indica que los técnicos tienen documentación al día
- Respuestas entre 2 y 5 oraciones — ni muy cortas ni muy largas
- Lenguaje profesional pero cercano, sin tecnicismos innecesarios`
}

const PENDING_ESTADO = ['BORRADOR', 'ENVIADA', 'EN REVISIÓN']

const WaBubble = ({ msg }) => {
  const isBot  = msg.from === 'bot'
  const isProp = msg.from === 'propietario'
  const isSys  = msg.from === 'system'

  if (isSys) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
      <span style={{
        fontSize: 11, color: '#8696A0', background: 'rgba(134,150,160,.15)',
        borderRadius: 8, padding: '4px 12px',
      }}>{msg.text}</span>
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      justifyContent: isBot ? 'flex-start' : 'flex-end',
      marginBottom: 8,
    }}>
      {isBot && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: WA, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginRight: 8, alignSelf: 'flex-end',
        }}>
          <Ic.bot w={15} h={15} style={{ color: '#fff' }} />
        </div>
      )}
      <div style={{
        maxWidth: '74%',
        background: isBot ? '#202C33' : '#005C4B',
        color: '#E9EDF0', borderRadius: isBot ? '0 12px 12px 12px' : '12px 0 12px 12px',
        padding: '9px 14px', fontSize: 13, lineHeight: 1.5,
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.text}
        <div style={{ fontSize: 10, color: 'rgba(233,237,240,.4)', marginTop: 4, textAlign: 'right' }}>
          {msg.time}
        </div>
      </div>
    </div>
  )
}

const WaChat = ({ sol, site, onUpdateEstado }) => {
  const [msgs, setMsgs] = useState([
    {
      from: 'system', time: '',
      text: `Conversación con ${site?.propietario || 'Propietario'} · Sitio ${sol.sitioId}`,
    },
    {
      from: 'bot',
      time: now(),
      text: `Hola! Te escribimos de ATP Chile 👋 Hay una solicitud de acceso a tu sitio *${site?.nombre || sol.sitio}* para las fechas ${sol.desde} al ${sol.hasta}. La empresa *${sol.empresaNombre || sol.empresa}* realizará: ${sol.trabajo}. ¿Autorizas el acceso?`,
    },
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [estado, setEstado]   = useState(sol.estado)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    const txt = input.trim()
    if (!txt || loading) return
    setInput('')

    const userMsg = { from: 'propietario', time: now(), text: txt }
    setMsgs(p => [...p, userMsg])
    setLoading(true)

    try {
      const historial = msgs
        .filter(m => m.from !== 'system')
        .map(m => ({
          role: m.from === 'propietario' ? 'user' : 'assistant',
          content: m.text,
        }))
      historial.push({ role: 'user', content: txt })

      const raw = await callClaude(historial, buildSystemPrompt(sol, site))

      // Detectar acciones
      let display = raw
      let accion  = null
      let motivo  = null

      const autorMatch = raw.match(/<<ACCION:AUTORIZAR>>/i)
      const rechMatch      = raw.match(/<<ACCION:RECHAZAR:(.+?)>>/is)
      const rechFechasMatch = raw.match(/<<ACCION:RECHAZAR_CON_FECHAS:([^|]+)\|([^|]+)\|([^>]+)>>/i)

      if (autorMatch) {
        accion  = 'AUTORIZAR'
        display = raw.replace(/<<ACCION:AUTORIZAR>>/gi, '').trim()
      } else if (rechFechasMatch) {
        accion  = 'RECHAZAR_CON_FECHAS'
        motivo  = rechFechasMatch[1].trim()
        const fechaDesde = rechFechasMatch[2].trim()
        const fechaHasta = rechFechasMatch[3].trim()
        display = raw.replace(/<<ACCION:RECHAZAR_CON_FECHAS:.+?>>/gi, '').trim()
        display += `\n\n📅 Fechas alternativas sugeridas por el propietario: **${fechaDesde}** al **${fechaHasta}**\nSe ha notificado al contratista para que actualice la solicitud.`
        await onUpdateEstado(sol.id, 'Rechazado', { motivo_rechazo: motivo, fechas_sugeridas: `${fechaDesde}|${fechaHasta}` })
        setEstado('Rechazado')
        setMsgs(p => [...p, { from: 'system', time: '', text: `❌ Rechazado con fechas alternativas: ${fechaDesde} → ${fechaHasta}` }])
      } else if (rechMatch) {
        accion  = 'RECHAZAR'
        motivo  = rechMatch[1].trim()
        display = raw.replace(/<<ACCION:RECHAZAR:.+?>>/gis, '').trim()
      }

      setMsgs(p => [...p, { from: 'bot', time: now(), text: display }])

      if (accion === 'AUTORIZAR') {
        await onUpdateEstado(sol.id, 'Autorizado')
        setEstado('Autorizado')
        setMsgs(p => [...p, { from: 'system', time: '', text: '✅ Solicitud AUTORIZADA · Sistema actualizado en Supabase' }])
      } else if (accion === 'RECHAZAR' && motivo) {
        await onUpdateEstado(sol.id, 'Rechazado', { motivo_rechazo: motivo })
        setEstado('Rechazado')
        setMsgs(p => [...p, { from: 'system', time: '', text: `❌ Solicitud RECHAZADA · Motivo: ${motivo}` }])
      }
    } catch (err) {
      setMsgs(p => [...p, {
        from: 'system', time: '',
        text: `⚠ Error IA: ${err.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const closed = estado === 'Autorizado' || estado === 'Rechazado'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0B141A',
    }}>
      {/* Header WhatsApp */}
      <div style={{
        padding: '10px 16px', background: '#202C33',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3F4F56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic.users w={18} h={18} style={{ color: '#8696A0' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#E9EDF0', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {site?.propietario || 'Propietario'}
          </div>
          <div style={{ color: '#8696A0', fontSize: 11 }}>
            {loading ? 'escribiendo…' : `Sitio ${sol.sitioId}`}
          </div>
        </div>
        <div>
          {closed
            ? <Badge label={estado} />
            : <span style={{ fontSize: 11, color: '#8696A0' }}>En revisión</span>}
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
        {msgs.map((m, i) => <WaBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
            <div style={{ background: '#202C33', borderRadius: '0 12px 12px 12px', padding: '10px 14px' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: WA,
                    animation: `bounce .9s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 14px', background: '#202C33', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={closed ? 'Solicitud cerrada' : 'Simular mensaje del propietario…'}
          disabled={closed || loading}
          rows={1}
          style={{
            flex: 1, background: '#2A3942', border: 'none', borderRadius: 10,
            padding: '10px 14px', color: '#E9EDF0', fontSize: 13,
            fontFamily: 'IBM Plex Sans', resize: 'none', outline: 'none',
            maxHeight: 80, overflowY: 'auto',
            opacity: closed ? .5 : 1,
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading || closed}
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: input.trim() && !loading && !closed ? WA : '#2A3942',
            border: 'none', cursor: input.trim() && !loading && !closed ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .2s',
          }}
        >
          <Ic.send w={18} h={18} style={{ color: '#fff' }} />
        </button>
      </div>
    </div>
  )
}

const TabWhatsApp = ({ sols, setSols }) => {
  const [sel, setSel] = useState(null)
  const [apiKey, setApiKey]   = useState(localStorage.getItem('atp_apikey') || '')
  const [showKey, setShowKey] = useState(false)

  const [sitiosConfig, setSitiosConfig] = useState({})
  useEffect(() => { getSitiosConfig().then(setSitiosConfig) }, [])

  const waSols = useMemo(() =>
    sols.filter(s => {
      const c = sitiosConfig[s.sitio]
      const site = SITES.find(x => x.id === s.sitio)
      return c?.whatsapp || site?.whatsapp
    }),
    [sols, sitiosConfig]
  )

  const updateEstado = useCallback(async (id, estado, extra = {}) => {
    await supabaseUpdateEstado(id, estado, extra)
    setSols(p => p.map(s => s.id === id ? { ...s, estado, ...extra } : s))
  }, [setSols])

  const saveKey = () => {
    localStorage.setItem('atp_apikey', apiKey)
    setShowKey(false)
  }

  return (
    <div className="fade-up" style={{ height: 'calc(100vh - 62px)', display: 'flex', flexDirection: 'column' }}>
      {/* API Key banner */}
      {!localStorage.getItem('atp_apikey') && (
        <div style={{
          margin: '16px 28px 0', padding: '12px 18px',
          background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Ic.key w={18} h={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E' }}>API Key no configurada</div>
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 1 }}>La IA necesita una Anthropic API Key. Agrégala abajo o en Configuración.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              type="password"
              placeholder="sk-ant-api03-…"
              style={{ padding: '7px 11px', borderRadius: 7, border: '1px solid #FCD34D', fontSize: 12, fontFamily: 'IBM Plex Mono', width: 220, outline: 'none' }}
            />
            <Btn variant="primary" onClick={saveKey} style={{ padding: '7px 14px', fontSize: 12 }}>Guardar</Btn>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', flex: 1, margin: 16, gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        {/* Lista solicitudes */}
        <div style={{ borderRight: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '14px 16px', background: '#202C33',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>📲</span>
            <div>
              <div style={{ color: '#E9EDF0', fontWeight: 700, fontSize: 13 }}>Canal WhatsApp</div>
              <div style={{ color: '#8696A0', fontSize: 11 }}>{waSols.length} solicitudes activas</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {waSols.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                Sin solicitudes WhatsApp activas
              </div>
            ) : waSols.map((s, i) => {
              const site = SITES.find(x => x.id === s.sitio)
              const pend = PENDING_ESTADO.includes(s.estado)
              const on   = sel?.id === s.id
              return (
                <div
                  key={s.id}
                  onClick={() => setSel(s)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    background: on ? '#F0FDF4' : '#fff',
                    borderBottom: '1px solid #F0F0F0',
                    borderLeft: `3px solid ${on ? WA : 'transparent'}`,
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div className="mono" style={{ fontSize: 10, color: G, fontWeight: 600 }}>{s.id}</div>
                    <Badge label={s.estado} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: BK, marginBottom: 3 }}>{SITES.find(x=>x.id===s.sitio)?.nombre||s.sitio}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.trabajo}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    {pend && <span style={{ width: 7, height: 7, borderRadius: '50%', background: WA, flexShrink: 0, display: 'inline-block' }} />}
                    <span style={{ color: '#9CA3AF' }}>{site?.propietario || '—'}</span>
                    <span style={{ color: '#9CA3AF', marginLeft: 'auto' }}>📅 {s.fechaIngreso}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel chat */}
        <div style={{ background: '#0B141A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {sel ? (
            <WaChat
              key={sel.id}
              sol={sel}
              site={{...SITES.find(x => x.id === sel.sitio), ...sitiosConfig[sel.sitio]}}
              onUpdateEstado={updateEstado}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8696A0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#E9EDF0' }}>Canal WhatsApp IA</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                Selecciona una solicitud para simular la conversación con el propietario. La IA responde usando Claude y detecta autorizaciones automáticamente.
              </div>
              <div style={{
                marginTop: 24, padding: '10px 20px', background: 'rgba(37,211,102,.1)',
                border: '1px solid rgba(37,211,102,.2)', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: WA,
              }}>
                <Ic.bot w={16} h={16} />
                Modelo: claude-sonnet-4-20250514
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB DOCUMENTOS
   ════════════════════════════════════════════════════════════ */
const TabDocumentos = () => {
  const [tab, setTab] = useState('empresa')
  const DOCS_EMP  = []
  const DOCS_TRAB = []
  const allDocs = [...DOCS_EMP, ...DOCS_TRAB]
  const venc  = allDocs.filter(d => d.estado === 'vencido').length
  const xVenc = allDocs.filter(d => d.estado === 'por vencer').length
  const vigs  = allDocs.filter(d => d.estado === 'vigente').length

  const DocRow = ({ d }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #F0F0F0', gap: 12 }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: d.estado === 'vigente' ? '#22C55E' : d.estado === 'por vencer' ? '#F59E0B' : RD }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: BK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nombre}</div>
        {d.trabajador && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{d.trabajador} · <span className="mono">{d.rut}</span></div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 11, color: d.estado === 'vencido' ? RD : '#6B7280' }}>Vence: {d.vence}</div>
        <div style={{ marginTop: 4 }}><Badge label={d.estado} /></div>
      </div>
      <button style={{ padding: '6px 10px', background: '#F1F5F9', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B', fontWeight: 600 }}>
        <Ic.eye w={14} h={14} /> Ver
      </button>
    </div>
  )

  return (
    <div className="fade-up" style={{ padding: 28 }}>
      {venc > 0 && (
        <div style={{ padding: '13px 18px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Ic.warn w={20} h={20} style={{ color: RD, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#991B1B' }}>{venc} documento{venc > 1 ? 's' : ''} vencido{venc > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 1 }}>Estos documentos impiden el acceso a sitios. Actualiza los documentos afectados para continuar operando.</div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { lbl: 'Vigentes', n: vigs, color: '#22C55E', Ico: Ic.check },
          { lbl: 'Por vencer', n: xVenc, color: '#F59E0B', Ico: Ic.clock },
          { lbl: 'Vencidos', n: venc, color: RD, Ico: Ic.warn },
        ].map(({ lbl, n, color, Ico }, i) => (
          <Card key={i} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ico w={19} h={19} style={{ color }} />
            </div>
            <div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: BK, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{lbl}</div>
            </div>
          </Card>
        ))}
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', alignItems: 'center' }}>
          {[{ id: 'empresa', lbl: 'Empresa' }, { id: 'trabajadores', lbl: 'Trabajadores' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '13px 22px', fontWeight: 700, fontSize: 13, fontFamily: 'IBM Plex Sans',
              background: tab === t.id ? '#FAFAFA' : 'transparent',
              borderBottom: `2px solid ${tab === t.id ? G : 'transparent'}`,
              color: tab === t.id ? BK : '#6B7280', border: 'none', cursor: 'pointer', transition: 'all .15s',
            }}>{t.lbl}</button>
          ))}
          <div style={{ marginLeft: 'auto', padding: '0 14px' }}>
            <Btn variant="primary" icon={Ic.upload} style={{ fontSize: 12, padding: '7px 14px' }}>Cargar documento</Btn>
          </div>
        </div>
        {(tab === 'empresa' ? DOCS_EMP : DOCS_TRAB).map((d, i) => <DocRow key={i} d={d} />)}
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB HISTORIAL
   ════════════════════════════════════════════════════════════ */
const TabHistorial = ({ sols }) => {
  const [fil, setFil] = useState({ estado: '', sitio: '', q: '' })
  const [pg, setPg]   = useState(1)
  const PP = 10

  const filtered = sols.filter(s => {
    if (fil.estado && s.estado !== fil.estado) return false
    if (fil.sitio  && s.sitio !== fil.sitio) return false
    if (fil.q) {
      const ql = fil.q.toLowerCase()
      const nombre = SITES.find(x=>x.id===s.sitio)?.nombre || s.sitio
      if (!s.id.toLowerCase().includes(ql) && !nombre.toLowerCase().includes(ql)) return false
    }
    return true
  })
  const paged = filtered.slice((pg - 1) * PP, pg * PP)
  const total = Math.ceil(filtered.length / PP)

  const selStyle = { padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: 'IBM Plex Sans', background: '#fff', cursor: 'pointer', outline: 'none', color: BK }

  return (
    <div className="fade-up" style={{ padding: 28 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Ic.search w={15} h={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <input value={fil.q} onChange={e => setFil(p => ({ ...p, q: e.target.value }))} placeholder="Buscar ID o sitio…"
            style={{ ...selStyle, paddingLeft: 32, width: '100%' }} />
        </div>
        <select value={fil.estado} onChange={e => setFil(p => ({ ...p, estado: e.target.value }))} style={selStyle}>
          <option value="">Todos los estados</option>
          {['BORRADOR', 'ENVIADA', 'EN REVISIÓN', 'APROBADA', 'RECHAZADA', 'CERRADA'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={fil.sitio} onChange={e => setFil(p => ({ ...p, sitio: e.target.value }))} style={selStyle}>
          <option value="">Todos los sitios</option>
          {SITES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <Btn variant="ghost" icon={Ic.download} style={{ fontSize: 12 }}>Exportar CSV</Btn>
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              {['ID Solicitud', 'Sitio', 'Tipo de faena', 'Fecha ingreso', 'Empresa', 'Estado'].map((h, i) => (
                <th key={i} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0
              ? <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Sin resultados</td></tr>
              : paged.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <td className="mono" style={{ padding: '13px 16px', fontSize: 12, color: G, fontWeight: 600 }}>{s.id}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: BK }}>{SITES.find(x=>x.id===s.sitio)?.nombre||s.sitio}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.trabajo}</td>
                  <td className="mono" style={{ padding: '13px 16px', fontSize: 12, color: '#374151' }}>{s.desde||s.fechaIngreso||'—'}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: '#374151' }}>{s.empresa}</td>
                  <td style={{ padding: '13px 16px' }}><Badge label={s.estado} /></td>
                </tr>
              ))}
          </tbody>
        </table>
        {total > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Mostrando {(pg - 1) * PP + 1}–{Math.min(pg * PP, filtered.length)} de {filtered.length}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPg(p => Math.max(1, p - 1))} disabled={pg === 1}
                style={{ padding: '5px 9px', border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: pg === 1 ? 'default' : 'pointer', opacity: pg === 1 ? .4 : 1 }}>
                <Ic.chevL w={15} h={15} style={{ color: '#6B7280' }} />
              </button>
              {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPg(p)}
                  style={{ padding: '5px 10px', border: '1px solid #E5E7EB', borderRadius: 6, background: p === pg ? G : '#fff', color: p === pg ? BK : '#374151', fontWeight: p === pg ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPg(p => Math.min(total, p + 1))} disabled={pg === total}
                style={{ padding: '5px 9px', border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: pg === total ? 'default' : 'pointer', opacity: pg === total ? .4 : 1 }}>
                <Ic.chevR w={15} h={15} style={{ color: '#6B7280' }} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB SITIOS / CONTACTOS — editar propietario, tel, email, whatsapp
   ════════════════════════════════════════════════════════════ */
const TabSitios = () => {
  const [q, setQ]             = useState('')
  const [sel, setSel]         = useState(null)
  const [cfg, setCfg]         = useState({})   // sitiosConfig desde Supabase
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    getSitiosConfig().then(data => setCfg(data))
  }, [])

  const filtered = useMemo(() => {
    if (!q || q.length < 1) return SITES.slice(0, 80)
    const ql = q.toLowerCase()
    return SITES.filter(s =>
      s.nombre.toLowerCase().includes(ql) ||
      s.id.toLowerCase().includes(ql) ||
      (s.region || '').toLowerCase().includes(ql) ||
      (s.comuna || '').toLowerCase().includes(ql)
    ).slice(0, 100)
  }, [q])

  const selectSitio = s => {
    setSel(s)
    setSaved(false)
    const c = cfg[s.id] || {}
    setForm({
      propietario:    c.propietario   || s.propietario || '',
      contacto:       c.contacto      || s.contacto    || '',
      tel:            c.tel           || s.tel         || '',
      email:          c.email         || s.email       || '',
      whatsapp:       c.whatsapp      ?? false,
      correo_activo:  c.correo_activo ?? true,
      nota:           c.nota          || '',
      bloqueado:      c.bloqueado     ?? false,
      motivo_bloqueo: c.motivo_bloqueo || '',
      docs_requeridos: c.docs_requeridos || [],
      restriccion_activa:  c.restriccion_horaria?.activa    ?? false,
      restriccion_desde:   c.restriccion_horaria?.hora_desde || '',
      restriccion_hasta:   c.restriccion_horaria?.hora_hasta || '',
      restriccion_dias:    c.restriccion_horaria?.dias       || ['Lunes','Martes','Miércoles','Jueves','Viernes'],
      restriccion_habiles: c.restriccion_horaria?.solo_habiles ?? false,
    })
  }

  const handleTel = v => {
    let t = v.replace(/[^\d+]/g, '')
    if (t && !t.startsWith('+')) t = '+56' + t.replace(/^56/, '')
    setForm(f => ({ ...f, tel: t }))
  }

  const save = async () => {
    if (!sel) return
    setSaving(true)
    await upsertSitioConfig({
      sitio_id:       sel.id,
      propietario:    form.propietario,
      contacto:       form.contacto,
      tel:            form.tel,
      email:          form.email,
      whatsapp:       form.whatsapp,
      correo_activo:  form.correo_activo,
      nota:           form.nota,
      bloqueado:      form.bloqueado,
      motivo_bloqueo: form.motivo_bloqueo || '',
      docs_requeridos: form.docs_requeridos || [],
      restriccion_horaria: {
        activa:       form.restriccion_activa,
        hora_desde:   form.restriccion_desde,
        hora_hasta:   form.restriccion_hasta,
        dias:         form.restriccion_dias,
        solo_habiles: form.restriccion_habiles,
      },
    })
    setCfg(p => ({ ...p, [sel.id]: { ...form, sitio_id: sel.id } }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inp = { padding: '9px 11px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', width: '100%', outline: 'none', color: BK }
  const lbl = { fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5, display: 'block' }

  return (
    <div className="fade-up" style={{ padding: 28, display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
      {/* Lista sitios */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F0' }}>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar sitio..."
            style={{ ...inp, width: '100%' }} />
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
            {q ? `${filtered.length} resultados` : `${SITES.length} sitios totales`}
          </div>
        </div>
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {filtered.map(s => {
            const hasCfg = !!cfg[s.id]
            const hasWa  = cfg[s.id]?.whatsapp
            return (
              <div key={s.id} onClick={() => selectSitio(s)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F9FAFB',
                  background: sel?.id === s.id ? G + '11' : 'transparent',
                  borderLeft: `3px solid ${sel?.id === s.id ? G : 'transparent'}`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 10, color: G, fontWeight: 600 }}>{s.id}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {hasWa  && <span style={{ fontSize: 9, background: '#DCFCE7', color: '#15803D', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>WA</span>}
                    {hasCfg && <span style={{ fontSize: 9, background: '#DBEAFE', color: '#1D4ED8', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>CFG</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: BK, marginTop: 1 }}>{s.nombre}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.region} · {s.comuna}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Editor */}
      {sel ? (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: BK, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="mono" style={{ fontSize: 11, color: G }}>{sel.id} · {sel.codigo}</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{sel.nombre}</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{sel.region} · {sel.tipo} · {sel.alturaTotal}m</div>
            </div>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Propietario / Empresa</label>
                <input value={form.propietario} onChange={e => setForm(f => ({ ...f, propietario: e.target.value }))} style={inp} placeholder="Ej: Inmobiliaria Norte SpA" />
              </div>
              <div>
                <label style={lbl}>Nombre contacto</label>
                <input value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} style={inp} placeholder="Ej: Carlos Rojas" />
              </div>
              <div>
                <label style={lbl}>Teléfono (WhatsApp)</label>
                <input value={form.tel} onChange={e => handleTel(e.target.value)} style={{ ...inp, fontFamily: 'IBM Plex Mono' }} placeholder="+56 9 1234 5678" />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Se agrega +56 automáticamente</div>
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} placeholder="propietario@email.cl" />
              </div>
            </div>
            <div>
              <label style={lbl}>Nota interna</label>
              <textarea value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} rows={2}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} placeholder="Ej: Solicitar permiso con 48h de anticipación" />
            </div>
            {/* WhatsApp toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: form.whatsapp ? '#F0FDF4' : '#F9FAFB', borderRadius: 8, border: `1px solid ${form.whatsapp ? '#86EFAC' : '#E5E7EB'}` }}>
              <button onClick={() => setForm(f => ({ ...f, whatsapp: !f.whatsapp }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: form.whatsapp ? WA : '#D1D5DB', position: 'relative', transition: 'background .2s',
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, transition: 'left .2s',
                  left: form.whatsapp ? 23 : 3,
                }} />
              </button>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: form.whatsapp ? '#15803D' : BK }}>
                  {form.whatsapp ? '📲 WhatsApp activo' : 'WhatsApp desactivado'}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {form.whatsapp ? 'Las solicitudes en este sitio usarán IA WhatsApp para autorizar' : 'Activar para habilitar canal WhatsApp IA en este sitio'}
                </div>
              </div>
            </div>
            {/* Correo activo/inactivo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: form.correo_activo ? '#EFF6FF' : '#F9FAFB', borderRadius: 8, border: `1px solid ${form.correo_activo ? '#BFDBFE' : '#E5E7EB'}` }}>
              <button onClick={() => setForm(f => ({ ...f, correo_activo: !f.correo_activo }))}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.correo_activo ? '#3B82F6' : '#D1D5DB', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left .2s', left: form.correo_activo ? 23 : 3 }} />
              </button>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: form.correo_activo ? '#1D4ED8' : BK }}>
                  {form.correo_activo ? '✉️ Correo activo' : 'Correo desactivado'}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {form.correo_activo ? 'Se enviará correo al propietario cuando haya solicitudes' : 'No se enviará correo a este propietario'}
                </div>
              </div>
            </div>

            {/* Bloqueo de sitio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', background: form.bloqueado ? '#FEF2F2' : '#F9FAFB', borderRadius: 8, border: `1px solid ${form.bloqueado ? '#FECACA' : '#E5E7EB'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setForm(f => ({ ...f, bloqueado: !f.bloqueado }))}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.bloqueado ? RD : '#D1D5DB', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left .2s', left: form.bloqueado ? 23 : 3 }} />
                </button>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.bloqueado ? '#B91C1C' : BK }}>
                    {form.bloqueado ? '🚫 Sitio BLOQUEADO' : 'Sitio activo'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Al activar, nadie podrá ingresar solicitudes en este sitio</div>
                </div>
              </div>
              {form.bloqueado && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Motivo del bloqueo (aparecerá en popup)</label>
                  <textarea value={form.motivo_bloqueo || ''} onChange={e => setForm(f => ({ ...f, motivo_bloqueo: e.target.value }))} rows={2}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #FECACA', fontSize: 13, fontFamily: 'IBM Plex Sans', resize: 'vertical', outline: 'none' }}
                    placeholder="Ej: Propietario no autoriza acceso hasta el 30/04 por obras en el inmueble." />
                </div>
              )}
            </div>

            {/* Docs requeridos */}
            <div style={{ padding: '14px 16px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369A1', marginBottom: 10 }}>📋 Documentos requeridos en este sitio</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {([...(TIPOS_DOCS_SITIO||[]), ...(cfg['__GLOBAL__']?.docs_requeridos || [])]).map(doc => (
                  <label key={doc} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, padding: '6px 8px', borderRadius: 5, background: (form.docs_requeridos||[]).includes(doc) ? '#DBEAFE' : '#fff', border: `1px solid ${(form.docs_requeridos||[]).includes(doc) ? '#93C5FD' : '#E5E7EB'}` }}>
                    <input type="checkbox" checked={(form.docs_requeridos||[]).includes(doc)}
                      onChange={e => setForm(f => ({
                        ...f,
                        docs_requeridos: e.target.checked
                          ? [...(f.docs_requeridos||[]), doc]
                          : (f.docs_requeridos||[]).filter(d => d !== doc)
                      }))}
                      style={{ accentColor: G }} />
                    {doc}
                  </label>
                ))}
              </div>
              {(form.docs_requeridos||[]).length > 0 && (
                <div style={{ fontSize: 11, color: '#0369A1', marginTop: 8 }}>
                  {(form.docs_requeridos||[]).length} doc{(form.docs_requeridos||[]).length > 1 ? 's' : ''} requerido{(form.docs_requeridos||[]).length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Restricción horaria */}
            <div style={{ padding: '14px 16px', background: form.restriccion_activa ? '#FFF7ED' : '#F9FAFB', borderRadius: 8, border: `1px solid ${form.restriccion_activa ? '#FED7AA' : '#E5E7EB'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: form.restriccion_activa ? 14 : 0 }}>
                <button onClick={() => setForm(f => ({ ...f, restriccion_activa: !f.restriccion_activa }))}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.restriccion_activa ? '#F59E0B' : '#D1D5DB', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.restriccion_activa ? 23 : 3, transition: 'left .2s' }} />
                </button>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.restriccion_activa ? '#B45309' : BK }}>
                    {form.restriccion_activa ? '⏰ Restricción horaria activa' : 'Sin restricción horaria'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Configura días y horas permitidos para acceso</div>
                </div>
              </div>
              {form.restriccion_activa && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Hora inicio permitida</label>
                      <input type="time" value={form.restriccion_desde} onChange={e => setForm(f => ({ ...f, restriccion_desde: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Hora fin permitida</label>
                      <input type="time" value={form.restriccion_hasta} onChange={e => setForm(f => ({ ...f, restriccion_hasta: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Días permitidos</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(dia => (
                        <label key={dia} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 20, background: (form.restriccion_dias||[]).includes(dia) ? '#FEF3C7' : '#F3F4F6', border: `1px solid ${(form.restriccion_dias||[]).includes(dia) ? '#F59E0B' : '#E5E7EB'}`, fontWeight: (form.restriccion_dias||[]).includes(dia) ? 700 : 400 }}>
                          <input type="checkbox" checked={(form.restriccion_dias||[]).includes(dia)}
                            onChange={e => setForm(f => ({ ...f, restriccion_dias: e.target.checked ? [...(f.restriccion_dias||[]), dia] : (f.restriccion_dias||[]).filter(d => d !== dia) }))}
                            style={{ accentColor: '#F59E0B', margin: 0 }} />
                          {dia}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.restriccion_habiles} onChange={e => setForm(f => ({ ...f, restriccion_habiles: e.target.checked }))} style={{ accentColor: '#F59E0B' }} />
                    Solo días hábiles (excluye feriados nacionales)
                  </label>
                </div>
              )}
            </div>

            <Btn variant="primary" onClick={save} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
              {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
            </Btn>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗼</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: BK }}>Selecciona un sitio</div>
          <div style={{ fontSize: 13 }}>Busca y selecciona un sitio para editar sus datos de contacto y configurar WhatsApp.</div>
        </Card>
      )}
    </div>
  )
}


/* ════════════════════════════════════════════════════════════
   TAB DOCS PARA SITIOS — gestionar tipos de documentos
   ════════════════════════════════════════════════════════════ */
const DOCS_STORAGE_KEY = 'atp_tipos_docs_custom'
const GLOBAL_SITIO_ID  = '__GLOBAL__'

const TabDocsSitios = () => {
  const [docs, setDocs]         = useState([])
  const [nuevoDoc, setNuevoDoc] = useState('')
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)

  // Cargar docs custom desde Supabase fila __GLOBAL__
  useEffect(() => {
    supabase.from('sitios_config').select('docs_requeridos').eq('sitio_id', GLOBAL_SITIO_ID).single()
      .then(({ data }) => {
        if (data?.docs_requeridos) setDocs(data.docs_requeridos)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const allDocs = [...(TIPOS_DOCS_SITIO || []), ...docs]

  const guardarEnSupabase = async (next) => {
    await supabase.from('sitios_config').upsert(
      { sitio_id: GLOBAL_SITIO_ID, docs_requeridos: next },
      { onConflict: 'sitio_id' }
    )
  }

  const agregar = async () => {
    const nombre = nuevoDoc.trim()
    if (!nombre || allDocs.includes(nombre)) return
    const next = [...docs, nombre]
    setDocs(next)
    await guardarEnSupabase(next)
    setNuevoDoc('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const eliminar = async (doc) => {
    if (TIPOS_DOCS_SITIO?.includes(doc)) return
    const next = docs.filter(d => d !== doc)
    setDocs(next)
    await guardarEnSupabase(next)
  }

  return (
    <div className="fade-up" style={{ padding: 28, maxWidth: 680 }}>
      <Card style={{ overflow: 'hidden' }}>
        <CardHeader title="Documentos para Sitios" icon={Ic.file} />
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
            Gestiona los tipos de documentos disponibles para asignar a cada sitio en <strong>Sitios / Contactos</strong>.<br/>
            Los documentos base (precargados) no se pueden eliminar. Puedes agregar los que necesites.
          </div>

          {/* Agregar nuevo */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <input
              value={nuevoDoc}
              onChange={e => setNuevoDoc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregar()}
              placeholder="Ej: Permiso municipal de acceso, Seguro de vida vigente..."
              style={{ flex: 1, padding: '10px 13px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'IBM Plex Sans', outline: 'none' }}
            />
            <Btn variant="primary" onClick={agregar} icon={Ic.plus}>Agregar</Btn>
          </div>
          {loading && <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>⏳ Cargando...</div>}
          {saved && <div style={{ fontSize: 12, color: '#15803D', marginBottom: 12 }}>✓ Documento guardado en Supabase</div>}

          {/* Lista completa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allDocs.map((doc, i) => {
              const esBase = TIPOS_DOCS_SITIO?.includes(doc)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 7, background: esBase ? '#F0F9FF' : '#FAFAFA', border: `1px solid ${esBase ? '#BAE6FD' : '#E5E7EB'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: esBase ? '#DBEAFE' : '#F3F4F6', color: esBase ? '#1D4ED8' : '#6B7280', fontWeight: 600 }}>
                      {esBase ? 'Base' : 'Custom'}
                    </span>
                    <span style={{ fontSize: 13, color: '#1A1A1A' }}>{doc}</span>
                  </div>
                  {!esBase && (
                    <button onClick={() => eliminar(doc)}
                      style={{ background: '#FEE2E2', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', color: '#B91C1C', fontSize: 12, fontWeight: 600 }}>
                      Eliminar
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 16, padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D', fontSize: 12, color: '#92400E' }}>
            💡 Los documentos personalizados se guardan localmente. Para que aparezcan en "Sitios / Contactos" debes estar en el mismo navegador.
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB ALERTAS OPERATIVAS
   ════════════════════════════════════════════════════════════ */
const PALABRAS_RECLAMO = ['reclamo', 'problema', 'inconveniente', 'molestia', 'queja', 'daño', 'rotura', 'basura', 'ruido', 'conflicto']

const TabAlertas = ({ sols }) => {
  const [sub, setSub] = useState('bloqueados')
  const ahora = Date.now()
  const hace30 = ahora - 30 * 86400000

  // 6a: Técnicos bloqueados — Autorizados con fecha hoy, sin actualización en >30 min
  const hoy = new Date().toISOString().split('T')[0]
  const bloqueados = sols.filter(s =>
    s.estado === 'Autorizado' &&
    s.desde === hoy &&
    s.tsAutorizado &&
    (ahora - new Date(s.tsAutorizado).getTime()) > 30 * 60 * 1000
  )

  // 6b: Reclamos de propietarios
  const reclamos = sols.filter(s =>
    s.motivoRechazo &&
    PALABRAS_RECLAMO.some(p => s.motivoRechazo.toLowerCase().includes(p))
  )

  // 6c: Anomalías
  const sitiosConRechazos = {}
  sols.filter(s => s.estado === 'Rechazado' && s.tsEnviado && new Date(s.tsEnviado).getTime() > hace30)
    .forEach(s => { sitiosConRechazos[s.sitio] = (sitiosConRechazos[s.sitio] || 0) + 1 })
  const sitiosCriticos = Object.entries(sitiosConRechazos).filter(([, n]) => n >= 3)

  const operadoresStats = {}
  sols.filter(s => s.tsEnviado && new Date(s.tsEnviado).getTime() > hace30).forEach(s => {
    if (!operadoresStats[s.operador]) operadoresStats[s.operador] = { total: 0, exitosos: 0 }
    operadoresStats[s.operador].total++
    if (s.estado === 'Autorizado') operadoresStats[s.operador].exitosos++
  })
  const operadoresBajos = Object.entries(operadoresStats)
    .filter(([, v]) => v.total >= 3 && (v.exitosos / v.total) < 0.5)

  const total = bloqueados.length + reclamos.length + sitiosCriticos.length + operadoresBajos.length
  const SUB = [
    { id: 'bloqueados', label: `⏰ Técnicos en espera (${bloqueados.length})` },
    { id: 'reclamos',   label: `💬 Reclamos (${reclamos.length})` },
    { id: 'anomalias',  label: `📊 Anomalías (${sitiosCriticos.length + operadoresBajos.length})` },
  ]

  return (
    <div className="fade-up" style={{ padding: 28 }}>
      {total === 0 && (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, color: '#15803D', fontSize: 16 }}>Sin alertas activas</div>
          <div style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>Todo en orden en los últimos 30 días</div>
        </div>
      )}

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SUB.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: sub === s.id ? BK : '#F1F5F9', color: sub === s.id ? '#fff' : '#374151',
          }}>{s.label}</button>
        ))}
      </div>

      {/* 6a: Técnicos bloqueados */}
      {sub === 'bloqueados' && (
        <div>
          {bloqueados.length === 0
            ? <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No hay técnicos en espera hoy</div>
            : bloqueados.map((s, i) => (
              <Card key={i} style={{ padding: '16px 20px', marginBottom: 10, borderLeft: `4px solid ${RD}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: BK }}>{s.id} — {SITES.find(x => x.id === s.sitio)?.nombre || s.sitio}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Empresa: {s.empresaNombre || s.empresa} · Fecha: {s.desde}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Técnicos: {(s.trabajadores || []).map(t => t.nombre).join(', ') || '—'}</div>
                  </div>
                  <span style={{ background: '#FEE2E2', color: RD, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                    🚨 En espera {Math.floor((ahora - new Date(s.tsAutorizado).getTime()) / 60000)} min
                  </span>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* 6b: Reclamos */}
      {sub === 'reclamos' && (
        <div>
          {reclamos.length === 0
            ? <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Sin reclamos registrados</div>
            : reclamos.map((s, i) => (
              <Card key={i} style={{ padding: '16px 20px', marginBottom: 10, borderLeft: `4px solid #F59E0B` }}>
                <div className="mono" style={{ fontSize: 11, color: G, fontWeight: 600, marginBottom: 4 }}>{s.id}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: BK, marginBottom: 6 }}>{SITES.find(x => x.id === s.sitio)?.nombre || s.sitio}</div>
                <div style={{ fontSize: 13, background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, padding: '8px 12px', color: '#92400E' }}>
                  💬 {s.motivoRechazo}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Operadora: {s.operador} · {s.desde}</div>
              </Card>
            ))
          }
        </div>
      )}

      {/* 6c: Anomalías */}
      {sub === 'anomalias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sitiosCriticos.length === 0 && operadoresBajos.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Sin anomalías detectadas en los últimos 30 días</div>
          )}
          {sitiosCriticos.map(([sitioId, n], i) => {
            const site = SITES.find(x => x.id === sitioId)
            return (
              <Card key={i} style={{ padding: '16px 20px', borderLeft: `4px solid ${RD}` }}>
                <div style={{ fontWeight: 700, color: BK }}>{site?.nombre || sitioId}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{site?.region} · {site?.tipo}</div>
                <div style={{ marginTop: 8, background: '#FEF2F2', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>
                  ⚠ {n} rechazos en los últimos 30 días — sitio problemático
                </div>
              </Card>
            )
          })}
          {operadoresBajos.map(([op, v], i) => (
            <Card key={'op-' + i} style={{ padding: '16px 20px', borderLeft: `4px solid #F59E0B` }}>
              <div style={{ fontWeight: 700, color: BK }}>{op}</div>
              <div style={{ marginTop: 8, background: '#FFFBEB', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                📉 Tasa de éxito: {Math.round((v.exitosos / v.total) * 100)}% ({v.exitosos}/{v.total} solicitudes) — por debajo del 50%
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB CONFIGURACIÓN
   ════════════════════════════════════════════════════════════ */
const TabConfig = () => {
  const [apiKey, setApiKey]   = useState(localStorage.getItem('atp_apikey') || '')
  const [saved, setSaved]     = useState(false)
  const [showKey, setShowKey] = useState(false)

  const save = () => {
    localStorage.setItem('atp_apikey', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="fade-up" style={{ padding: 28, maxWidth: 620 }}>
      <Card style={{ overflow: 'hidden' }}>
        <CardHeader title="Configuración del sistema" icon={Ic.settings} />
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* API Key */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BK, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Ic.key w={15} h={15} style={{ color: G }} /> Anthropic API Key
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
              Requerida para el canal WhatsApp IA y otras funciones de inteligencia artificial. La misma clave se comparte con la vista Operador.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setSaved(false) }}
                placeholder="sk-ant-api03-…"
                style={{
                  flex: 1, padding: '10px 13px', borderRadius: 8,
                  border: '1px solid #E5E7EB', fontSize: 13,
                  fontFamily: 'IBM Plex Mono', outline: 'none', color: BK,
                }}
              />
              <button onClick={() => setShowKey(p => !p)}
                style={{ padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#F9FAFB', cursor: 'pointer', color: '#6B7280' }}>
                <Ic.eye w={16} h={16} />
              </button>
              <Btn variant="primary" onClick={save} style={{ padding: '10px 18px' }}>
                {saved ? '✓ Guardada' : 'Guardar'}
              </Btn>
            </div>
          </div>

          {/* Env vars info */}
          <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>Variables de entorno (Vercel)</div>
            {[
              { k: 'VITE_SUPABASE_URL',       v: 'https://gzjqqpazdrkcuyruczwf.supabase.co' },
              { k: 'VITE_SUPABASE_ANON_KEY',  v: '***' },
              { k: 'VITE_EMAILJS_SERVICE_ID', v: 'service_nafjkji' },
              { k: 'VITE_EMAILJS_TEMPLATE_ID',v: 'template_y8bgoqa' },
            ].map(({ k, v }, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: i < 3 ? '1px solid #E5E7EB' : 'none', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: G, fontWeight: 600, minWidth: 220 }}>{k}</span>
                <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: '#9CA3AF', padding: '10px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <strong>v2.2.0</strong> · ATP Chile — Plataforma de Gestión de Accesos · PrimeCorp SpA · 2025
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   HELPER
   ════════════════════════════════════════════════════════════ */
function now() {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

/* ════════════════════════════════════════════════════════════
   MAIN ViewATP
   ════════════════════════════════════════════════════════════ */
const SECTIONS = {
  dashboard:   { title: 'Dashboard',            sub: 'Resumen operacional en tiempo real' },
  solicitudes: { title: 'Solicitudes de Acceso', sub: 'Flujo completo de autorizaciones' },
  mapa:        { title: 'Mapa de Sitios',        sub: 'Infraestructura ATP Chile · CartoDB Dark' },
  sitios:      { title: 'Sitios / Contactos',    sub: 'Editar propietarios, teléfono, email y WhatsApp por sitio' },
  whatsapp:    { title: 'Canal WhatsApp IA',      sub: 'Autorización de propietarios vía IA · claude-sonnet-4-20250514' },
  documentos:  { title: 'Gestión Documental',    sub: 'Estado y vigencia de documentos' },
  docs_sitios: { title: 'Documentos para Sitios', sub: 'Agregar tipos de documentos requeridos por sitio' },
  historial:   { title: 'Historial y Reportes',  sub: 'Trazabilidad de visitas y accesos' },
  config:      { title: 'Configuración',         sub: 'API Key, variables de entorno y sistema' },
  alertas:     { title: '🚨 Alertas Operativas',   sub: 'Técnicos bloqueados · Reclamos · Anomalías detectadas' },
}

export default function ViewATP({ onLogout }) {
  const [tab,  setTab]  = useState('dashboard')
  const [sols, setSols] = useState([])

  // Carga inicial + realtime Supabase
  useEffect(() => {
    getSolicitudes().then(data => setSols(data.map(fromDb)))

    const channel = supabase
      .channel('solicitudes-atp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, payload => {
        if (payload.eventType === 'INSERT') setSols(p => [fromDb(payload.new), ...p])
        if (payload.eventType === 'UPDATE') setSols(p => p.map(s => s.id === payload.new.id ? fromDb(payload.new) : s))
        if (payload.eventType === 'DELETE') setSols(p => p.filter(s => s.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const pendWa = useMemo(() =>
    sols.filter(s => {
      const site = SITES.find(x => x.id === s.sitio)
      return site?.whatsapp && PENDING_ESTADO.includes(s.estado)
    }).length,
    [sols]
  )

  const pendPend = useMemo(() =>
    sols.filter(s => s.estado === 'Pendiente').length,
    [sols]
  )

  const { title, sub } = SECTIONS[tab]

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':   return <TabDashboard   sols={sols} />
      case 'solicitudes': return <TabSolicitudes sols={sols} setSols={setSols} />
      case 'mapa':        return <TabMapa />
      case 'sitios':      return <TabSitios />
      case 'whatsapp':    return <TabWhatsApp    sols={sols} setSols={setSols} />
      case 'documentos':  return <TabDocumentos />
      case 'docs_sitios': return <TabDocsSitios />
      case 'historial':   return <TabHistorial   sols={sols} />
      case 'config':      return <TabConfig />
      case 'alertas':     return <TabAlertas sols={sols} />
      default:            return <TabDashboard   sols={sols} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      <AtpSidebar active={tab} setActive={setTab} pendWa={pendWa} pendPend={pendPend} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <AtpHeader title={title} sub={sub} onLogout={onLogout} />
        <main style={{ flex: 1, overflowY: 'auto' }}>{renderTab()}</main>
      </div>
    </div>
  )
}
