/* ═══════════════════════════════════════════════════════════
   src/views/ViewATP.jsx — ATP Chile Admin · PrimeCorp SpA
   Leaflet cargado desde CDN — sin npm install
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase, getSolicitudes, fromDb, updateEstado as supabaseUpdateEstado, getSitiosConfig, upsertSitioConfig } from '../lib/supabase'
import { TODOS_SITIOS as SITES, COLOCALIZACIONES } from '../shared/data'
import {
  G, BK, RD, WA, SB,
  ATPLogo, Ic, Badge, Card, CardHeader, Btn, Timeline, STATE_COLORS,
} from '../shared/components'

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
  { id: 'solicitudes', label: 'Solicitudes',      Icon: Ic.file    },
  { id: 'mapa',        label: 'Mapa de Sitios',   Icon: Ic.map     },
  { id: 'whatsapp',    label: 'WhatsApp IA',       Icon: Ic.msg,    badge: true },
  { id: 'documentos',  label: 'Documentación',    Icon: Ic.shield  },
  { id: 'historial',   label: 'Historial',        Icon: Ic.history },
  { id: 'config',      label: 'Configuración',    Icon: Ic.settings },
]

const AtpSidebar = ({ active, setActive, pendWa }) => (
  <aside style={{
    width: 240, minHeight: '100vh', background: SB,
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  }}>
    {/* Logo */}
    <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(201,168,76,.12)' }}>
      <ATPLogo variant="full" height={44} />
      <div style={{ marginTop: 12, padding: '5px 10px', background: 'rgba(201,168,76,.08)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
        <span className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: .5 }}>ATP Admin · Sistema activo</span>
      </div>
    </div>
    {/* Nav */}
    <nav style={{ padding: '8px 0', flex: 1 }}>
      {TABS.map(({ id, label, Icon, badge }) => {
        const on = active === id
        return (
          <button key={id} onClick={() => setActive(id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 11,
            padding: '11px 18px', background: on ? 'rgba(201,168,76,.1)' : 'transparent',
            borderLeft: `3px solid ${on ? G : 'transparent'}`,
            color: on ? G : 'rgba(255,255,255,.45)',
            fontSize: 13, fontWeight: on ? 600 : 400, fontFamily: 'IBM Plex Sans',
            border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
            position: 'relative',
          }}>
            <Icon w={17} h={17} style={{ color: on ? G : 'rgba(255,255,255,.3)', flexShrink: 0 }} />
            {label}
            {badge && pendWa > 0 && (
              <span style={{
                marginLeft: 'auto', background: WA, color: '#fff',
                fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px',
                fontFamily: 'IBM Plex Mono',
              }}>{pendWa}</span>
            )}
          </button>
        )
      })}
    </nav>
    <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
      <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.18)' }}>v2.2.0 · © 2025 PrimeCorp SpA</div>
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
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.tipoTrabajo}</div>
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#9CA3AF' }}>
                  <span>📅 {s.fechaIngreso}</span>
                  <span>👷 {s.contratista}</span>
                  {site?.whatsapp && <span style={{ color: WA }}>📲 WhatsApp</span>}
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
                  { lbl: 'Tipo de faena', val: sel.tipoTrabajo, full: true },
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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
          <div style="font-family:'IBM Plex Sans',sans-serif;padding:14px;min-width:210px;background:#1A1A1A;color:#fff;border-radius:10px">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${G};font-weight:600;letter-spacing:.5px">${site.id}</div>
            <div style="font-weight:700;font-size:15px;margin:4px 0 2px">${site.nombre}</div>
            <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:10px">${site.region} · ${site.tipo}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${site.estado === 'ocupado' ? '#F59E0B22' : '#22C55E22'};color:${site.estado === 'ocupado' ? '#FBBF24' : '#4ADE80'};font-family:monospace;text-transform:uppercase">${site.estado}</span>
              ${site.whatsapp ? `<span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#25D36622;color:#4ADE80;font-family:monospace">📲 WHATSAPP</span>` : ''}
              ${site.restriccionHorario ? `<span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#F59E0B22;color:#FBBF24;font-family:monospace">⏰ ${site.restriccionHorario.inicio}–${site.restriccionHorario.fin}</span>` : ''}
            </div>
            <div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.4)">${site.propietario}</div>
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
    <div style={{ height, width: '100%', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(201,168,76,.5)', fontSize: 13, fontFamily: 'IBM Plex Mono' }}>Cargando mapa…</span>
    </div>
  )
  return <div ref={ref} style={{ height, width: '100%' }} />
}

/* ════════════════════════════════════════════════════════════
   TAB MAPA — exacto de versión nueva
   ════════════════════════════════════════════════════════════ */
const TabMapa = () => {
  const [filter, setFilter] = useState('todos')

  const filtered = useMemo(() => {
    if (filter === 'whatsapp') return SITES.filter(s => s.whatsapp)
    if (filter === 'ocupado')  return SITES.filter(s => s.estado === 'ocupado')
    if (filter === 'libre')    return SITES.filter(s => s.estado === 'libre')
    return SITES
  }, [filter])

  const mapKey = filter  // force re-mount on filter change

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
        <div style={{ background: BK, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic.map w={16} h={16} style={{ color: G }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Infraestructura ATP Chile</span>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{filtered.length} sitios · CartoDB Dark</span>
        </div>
        <SitesMapLeaflet key={mapKey} sites={filtered} height={580} zoom={7} />
      </Card>

      {/* Tabla resumen */}
      <Card style={{ marginTop: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              {['ID', 'Nombre', 'Región', 'Operadora', 'Tipo', 'Estado', 'Riesgo', 'WhatsApp'].map((h, i) => (
                <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F0F0F0' }}>
                <td className="mono" style={{ padding: '12px 14px', fontSize: 11, color: G, fontWeight: 600 }}>{s.id}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: BK }}>{s.nombre}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>{s.region}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>{s.operadora}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>{s.tipo}</td>
                <td style={{ padding: '12px 14px' }}><Badge label={s.estado} /></td>
                <td style={{ padding: '12px 14px' }}><Badge label={s.riesgo} /></td>
                <td style={{ padding: '12px 14px' }}>
                  {s.whatsapp ? <span style={{ fontSize: 13 }}>✅</span> : <span style={{ color: '#D1D5DB', fontSize: 13 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB WHATSAPP — IA REAL (Claude claude-sonnet-4-20250514)
   ════════════════════════════════════════════════════════════ */
const buildSystemPrompt = (sol, site) => {
  const tecnicos = sol.cuadrilla?.map(t => t.nombre).join(', ') || sol.contratista
  const horario  = site?.restriccionHorario
    ? `⚠ Restricción horaria del sitio: solo se permite ingreso entre ${site.restriccionHorario.inicio} y ${site.restriccionHorario.fin} hrs. ${site.restriccionHorario.descripcion}`
    : 'Sin restricción horaria especial.'

  return `Eres el asistente virtual de ATP Chile que gestiona autorizaciones de acceso a sitios de infraestructura de telecomunicaciones vía WhatsApp.

Estás respondiendo EN NOMBRE DE ATP CHILE a mensajes del propietario del sitio.

CONTEXTO COMPLETO DE LA SOLICITUD:
- ID Solicitud: ${sol.id}
- Sitio: ${site?.nombre || sol.nombreSitio} (${sol.sitioId})
- Propietario del sitio: ${site?.propietario || 'No especificado'}
- Tipo de sitio: ${site?.tipo || '—'} | Región: ${site?.region || '—'} | Comuna: ${site?.comuna || '—'}
- Operadora: ${sol.empresa}
- Descripción del trabajo: ${sol.tipoTrabajo}
- Fecha y hora de ingreso: ${sol.fechaIngreso} a las ${sol.horaIngreso} hrs
- Fecha y hora de salida: ${sol.fechaSalida || sol.fechaIngreso} a las ${sol.horaSalida || '—'} hrs
- Técnico responsable: ${sol.contratista} (RUT: ${sol.rut})
- Cuadrilla completa: ${tecnicos}
- ${horario}

INSTRUCCIONES DE COMPORTAMIENTO:
1. Responde en español chileno, informal y amable. Tuteo suave, lenguaje directo. Máximo 3-4 oraciones por respuesta.
2. Si el propietario pregunta sobre el trabajo, técnicos, fechas o el sitio — responde con los datos REALES del contexto, nunca inventes.
3. Si el propietario AUTORIZA el acceso (dice "sí", "autorizo", "ok", "dale", "de acuerdo", "listo", "aceptado", "procede", o equivalentes) — confirma con entusiasmo y al final de tu respuesta escribe en una nueva línea exactamente: <<ACCION:AUTORIZAR>>
4. Si el propietario RECHAZA (dice "no", "rechazo", "no autorizo", "no puedo", "imposible") Y da un motivo — confirma el rechazo con el motivo y escribe al final: <<ACCION:RECHAZAR:motivo_aqui>>
5. Si el propietario rechaza SIN DAR MOTIVO — pide el motivo amablemente (sin incluir ningún tag <<ACCION>>).
6. Si hay dudas o preguntas — responde solo con información real del contexto.
7. NUNCA incluyas el tag <<ACCION>> en respuestas que no sean una autorización o rechazo confirmado.`
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
      text: `Hola! Te escribimos de ATP Chile. Hay una solicitud de acceso a tu sitio *${site?.nombre || sol.nombreSitio}* para el día ${sol.fechaIngreso} (${sol.horaIngreso} – ${sol.horaSalida || '—'}). La empresa *${sol.empresa}* realizará: ${sol.tipoTrabajo}. ¿Autorizas el acceso?`,
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
      const rechMatch  = raw.match(/<<ACCION:RECHAZAR:(.+?)>>/is)

      if (autorMatch) {
        accion  = 'AUTORIZAR'
        display = raw.replace(/<<ACCION:AUTORIZAR>>/gi, '').trim()
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

  const waSols = useMemo(() =>
    sols.filter(s => {
      const site = SITES.find(x => x.id === s.sitio)
      return site?.whatsapp
    }),
    [sols]
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
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.tipoTrabajo}</div>
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
              site={SITES.find(x => x.id === sel.sitio)}
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
    if (fil.q && !s.id.toLowerCase().includes(fil.q.toLowerCase()) && !SITES.find(x=>x.id===s.sitio)?.nombre||s.sitio.toLowerCase().includes(fil.q.toLowerCase())) return false
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
                  <td style={{ padding: '13px 16px', fontSize: 12, color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.tipoTrabajo}</td>
                  <td className="mono" style={{ padding: '13px 16px', fontSize: 12, color: '#374151' }}>{s.fechaIngreso}</td>
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
  whatsapp:    { title: 'Canal WhatsApp IA',      sub: 'Autorización de propietarios vía IA · claude-sonnet-4-20250514' },
  documentos:  { title: 'Gestión Documental',    sub: 'Estado y vigencia de documentos' },
  historial:   { title: 'Historial y Reportes',  sub: 'Trazabilidad de visitas y accesos' },
  config:      { title: 'Configuración',         sub: 'API Key, variables de entorno y sistema' },
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

  const { title, sub } = SECTIONS[tab]

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':   return <TabDashboard   sols={sols} />
      case 'solicitudes': return <TabSolicitudes sols={sols} setSols={setSols} />
      case 'mapa':        return <TabMapa />
      case 'whatsapp':    return <TabWhatsApp    sols={sols} setSols={setSols} />
      case 'documentos':  return <TabDocumentos />
      case 'historial':   return <TabHistorial   sols={sols} />
      case 'config':      return <TabConfig />
      default:            return <TabDashboard   sols={sols} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F2F3F5' }}>
      <AtpSidebar active={tab} setActive={setTab} pendWa={pendWa} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <AtpHeader title={title} sub={sub} onLogout={onLogout} />
        <main style={{ flex: 1, overflowY: 'auto' }}>{renderTab()}</main>
      </div>
    </div>
  )
}
