/* ═══════════════════════════════════════════════════════════
   src/shared/components.jsx — ATP Chile · PrimeCorp SpA
   ═══════════════════════════════════════════════════════════ */

export const G = '#C9A84C'
export const BK = '#1A1A1A'
export const RD = '#E94560'
export const WA = '#25D366'
export const SB = '#0D0D0D'

/* ─── LOGO ─────────────────────────────────────────────── */
/**
 * ATPLogo
 * variant="full"    → logo completo PNG (fondos oscuros)
 * variant="compact" → isotipo recortado con contenedor oscuro (fondos claros)
 * variant="sidebar" → para sidebar oscuro, con nombre abajo
 */
export const ATPLogo = ({ variant = 'full', height = 48, style = {} }) => {
  if (variant === 'compact') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: BK, borderRadius: 8, padding: '4px 8px',
        ...style
      }}>
        <img
          src="/Logo_de_ATP.png"
          alt="ATP Chile"
          style={{
            height,
            width: 'auto',
            objectFit: 'cover',
            objectPosition: 'left center',
            maxWidth: height * 1.1,
          }}
        />
      </div>
    )
  }
  if (variant === 'sidebar') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', ...style }}>
        <img src="/Logo_de_ATP.png" alt="ATP Chile" style={{ height, width: 'auto' }} />
      </div>
    )
  }
  // full
  return (
    <img
      src="/Logo_de_ATP.png"
      alt="ATP Chile"
      style={{ height, width: 'auto', display: 'block', ...style }}
    />
  )
}

/* ─── SVG ICON SYSTEM ───────────────────────────────────── */
const SVG = ({ d, d2, d3, circle, rect, poly, polyline, line, path, paths, w = 24, h = 24, sw = 2, ...p }) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {circle && <circle {...circle} />}
    {rect && <rect {...rect} />}
    {poly && <polygon points={poly} />}
    {polyline && <polyline points={polyline} />}
    {line && <line {...line} />}
    {path && <path d={path} />}
    {paths && paths.map((pp, i) => <path key={i} d={pp} />)}
    {d && <path d={d} />}
    {d2 && <path d={d2} />}
    {d3 && <path d={d3} />}
  </svg>
)

export const Ic = {
  home: p => <SVG {...p} path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" d2="M9 22V12h6v10" />,
  file: p => <SVG {...p} paths={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"]} />,
  map: p => <SVG {...p} poly="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" d="M8 2v16M16 6v16" />,
  shield: p => <SVG {...p} path="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  history: p => <SVG {...p} path="M3.51 15a9 9 0 1 0 .49-4.95" d2="M1 4v6h6" />,
  plus: p => <SVG {...p} d="M12 5v14M5 12h14" />,
  x: p => <SVG {...p} d="M18 6 6 18M6 6l12 12" />,
  check: p => <SVG {...p} polyline="20 6 9 17 4 12" />,
  clock: p => <SVG {...p} circle={{ cx: 12, cy: 12, r: 10 }} polyline="12 6 12 12 16 14" />,
  users: p => <SVG {...p} paths={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]} circle={{ cx: 9, cy: 7, r: 4 }} />,
  download: p => <SVG {...p} path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" polyline="7 10 12 15 17 10" d3="M12 15V3" />,
  eye: p => <SVG {...p} path="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" circle={{ cx: 12, cy: 12, r: 3 }} />,
  pin: p => <SVG {...p} path="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" circle={{ cx: 12, cy: 10, r: 3 }} />,
  zap: p => <SVG {...p} poly="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  chevR: p => <SVG {...p} polyline="9 18 15 12 9 6" />,
  chevL: p => <SVG {...p} polyline="15 18 9 12 15 6" />,
  warn: p => <SVG {...p} paths={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"]} d="M12 9v4M12 17h.01" />,
  upload: p => <SVG {...p} polyline="16 16 12 12 8 16" d3="M12 12v9" path="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />,
  search: p => <SVG {...p} circle={{ cx: 11, cy: 11, r: 8 }} d="m21 21-4.35-4.35" />,
  filter: p => <SVG {...p} poly="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  phone: p => <SVG {...p} path="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />,
  info: p => <SVG {...p} circle={{ cx: 12, cy: 12, r: 10 }} d="M12 16v-4M12 8h.01" />,
  tower: p => <SVG {...p} d="M4.9 16.1C3 12.2 3.1 8 5 5" d2="M7.8 13.7c-.9-2-.9-4.2 0-6.1" d3="M12 12h.01" path="M16.2 13.7c.9-2 .9-4.2 0-6.1" paths={["M19.1 16.1c1.9-3.9 1.8-8.1-.1-11.1", "M12 12v10"]} />,
  msg: p => <SVG {...p} path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  send: p => <SVG {...p} poly="22 2 11 13" path="M22 2 15 22 11 13 2 9l20-7z" />,
  bot: p => <SVG {...p} rect={{ x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 }} paths={["M12 2v4", "M8 11V7a4 4 0 0 1 8 0v4"]} d="M8 15h.01M16 15h.01" />,
  settings: p => <SVG {...p} path="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" circle={{ cx: 12, cy: 12, r: 3 }} />,
  key: p => <SVG {...p} path="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />,
  refresh: p => <SVG {...p} path="M23 4v6h-6" d2="M1 20v-6h6" d3="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />,
  logout: p => <SVG {...p} path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" polyline="16 17 21 12 16 7" d="M21 12H9" />,
  chart: p => <SVG {...p} paths={["M18 20V10", "M12 20V4", "M6 20v-6"]} />,
}

/* ─── ESTADO COLORS ─────────────────────────────────────── */
export const STATE_COLORS = {
  BORRADOR: { bg: '#F1F5F9', text: '#475569' },
  ENVIADA: { bg: '#DBEAFE', text: '#1D4ED8' },
  'EN REVISIÓN': { bg: '#EDE9FE', text: '#6D28D9' },
  APROBADA: { bg: '#DCFCE7', text: '#15803D' },
  RECHAZADA: { bg: '#FEE2E2', text: '#B91C1C' },
  CERRADA: { bg: '#F1F5F9', text: '#64748B' },
  Autorizado: { bg: '#DCFCE7', text: '#15803D' },
  Rechazado: { bg: '#FEE2E2', text: '#B91C1C' },
  Pendiente: { bg: '#EDE9FE', text: '#6D28D9' },
  BAJO: { bg: '#DCFCE7', text: '#15803D' },
  MEDIO: { bg: '#FEF3C7', text: '#92400E' },
  ALTO: { bg: '#FEE2E2', text: '#B91C1C' },
  CRÍTICO: { bg: '#1A1A1A', text: '#F87171' },
  libre: { bg: '#DCFCE7', text: '#15803D' },
  ocupado: { bg: '#FEF3C7', text: '#92400E' },
  vigente: { bg: '#DCFCE7', text: '#15803D' },
  'por vencer': { bg: '#FEF3C7', text: '#92400E' },
  vencido: { bg: '#FEE2E2', text: '#B91C1C' },
}

export const Badge = ({ label, className = '' }) => {
  const c = STATE_COLORS[label] || { bg: '#F1F5F9', text: '#64748B' }
  return (
    <span className={`mono ${className}`} style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: .5,
      textTransform: 'uppercase', background: c.bg, color: c.text,
    }}>{label}</span>
  )
}

/* ─── CARD ──────────────────────────────────────────────── */
export const Card = ({ children, style = {}, ...p }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    ...style
  }} {...p}>{children}</div>
)

export const CardHeader = ({ title, icon: Icon2, right, borderColor = G }) => (
  <div style={{
    padding: '14px 20px', borderBottom: '1px solid #F0F0F0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Icon2 && <Icon2 w={16} h={16} style={{ color: borderColor }} />}
      <span style={{ fontWeight: 700, fontSize: 14, color: BK }}>{title}</span>
    </div>
    {right && <div>{right}</div>}
  </div>
)

/* ─── BTN ───────────────────────────────────────────────── */
export const Btn = ({ children, variant = 'primary', icon: Ico, onClick, style = {}, ...p }) => {
  const vs = {
    primary: { background: G, color: BK, border: 'none', fontWeight: 700 },
    danger: { background: RD, color: '#fff', border: 'none', fontWeight: 700 },
    ghost: { background: '#fff', color: '#374151', border: '1px solid #E5E7EB', fontWeight: 600 },
    dark: { background: BK, color: G, border: 'none', fontWeight: 700 },
    wa: { background: WA, color: '#fff', border: 'none', fontWeight: 700 },
  }
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
      fontFamily: 'IBM Plex Sans', transition: 'all .15s',
      ...vs[variant], ...style
    }} {...p}>
      {Ico && <Ico w={16} h={16} />}{children}
    </button>
  )
}

/* ─── TIMELINE ──────────────────────────────────────────── */
export const Timeline = ({ estado }) => {
  const steps = ['BORRADOR', 'ENVIADA', 'EN REVISIÓN', estado === 'RECHAZADA' ? 'RECHAZADA' : 'APROBADA', 'CERRADA']
  const cur = estado === 'APROBADA' || estado === 'RECHAZADA'
    ? 3
    : ['BORRADOR', 'ENVIADA', 'EN REVISIÓN', 'APROBADA', 'CERRADA'].indexOf(estado)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', gap: 0 }}>
      {steps.map((s, i) => {
        const done = i < cur, active = i === cur, rejected = estado === 'RECHAZADA' && i === 3
        const dot = rejected ? RD : done ? '#22C55E' : active ? G : '#D1D5DB'
        const txt = rejected ? RD : done ? '#22C55E' : active ? G : '#9CA3AF'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, margin: '0 auto 5px', transition: 'all .3s' }} />
              <div className="mono" style={{ fontSize: 9, color: txt, fontWeight: active || done ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>{s}</div>
            </div>
            {i < steps.length - 1 && <div style={{ height: 1, background: done ? '#22C55E' : '#E5E7EB', flex: 0.6, marginTop: 5, transition: 'all .3s' }} />}
          </div>
        )
      })}
    </div>
  )
}
