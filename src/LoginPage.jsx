/* ═══════════════════════════════════════════════════════════
   src/LoginPage.jsx — ATP Chile · PrimeCorp SpA
   ═══════════════════════════════════════════════════════════ */
import { useState } from 'react'
import { ATPLogo, G, BK, RD } from './shared/components'
import { USERS } from './shared/data.js'

// Passwords locales (no están en data.js por seguridad)
const PASSWORDS = {
  atp:        'atp2026',
  telefonica: 'tef2026',
  entel:      'entel2026',
  claro:      'claro2026',
  wom:        'wom2026',
  merced:     'prop2026',
}

const ACCOUNTS = {
  atp:        { pass: 'atp2026',   role: 'atp',         nombre: 'ATP Admin',           empresa: 'ATP Chile' },
  telefonica: { pass: 'tef2026',   role: 'operador',    nombre: 'Movistar/Telefónica', empresa: 'Telefónica Chile S.A.' },
  entel:      { pass: 'entel2026', role: 'operador',    nombre: 'Entel',               empresa: 'Entel S.A.' },
  claro:      { pass: 'claro2026', role: 'operador',    nombre: 'Claro',               empresa: 'Claro Chile S.A.' },
  wom:        { pass: 'wom2026',   role: 'operador',    nombre: 'WOM',                 empresa: 'WOM S.A.' },
  merced:     { pass: 'prop2026',  role: 'propietario', nombre: 'Propietario',         empresa: 'Inmobiliaria La Merced SpA' },
}

const ROL_LABELS = {
  atp:        { label: 'ATP Admin',   color: G,         bg: G + '22' },
  operador:   { label: 'Operador',    color: '#3B82F6', bg: '#DBEAFE' },
  propietario:{ label: 'Propietario', color: '#8B5CF6', bg: '#EDE9FE' },
}

export default function LoginPage({ onLogin }) {
  const [user, setUser]     = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 420))   // simula latencia

    const acc = ACCOUNTS[user.trim().toLowerCase()]
    if (!acc || acc.pass !== pass) {
      setError('Usuario o contraseña incorrectos.')
      setLoading(false)
      return
    }
    // Merge con USERS de data.js para preservar todos los campos que ViewOperador/ViewPropietario esperan
    const username = user.trim().toLowerCase()
    const usersData = USERS?.[username] || {}
    onLogin({ username, ...acc, ...usersData })
    setLoading(false)
  }

  const demoBtn = (u) => {
    const acc = ACCOUNTS[u]
    const rolInfo = ROL_LABELS[acc.role]
    return (
      <button
        key={u}
        onClick={() => { setUser(u); setPass(acc.pass); setError('') }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
          padding: '10px 14px', borderRadius: 8,
          background: user === u ? '#FEF3C7' : '#FFFFFF',
          border: `1px solid ${user === u ? G : '#E5E7EB'}`,
          cursor: 'pointer', transition: 'all .15s', textAlign: 'left', width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: rolInfo.bg, color: rolInfo.color, fontFamily: 'IBM Plex Mono',
            textTransform: 'uppercase', letterSpacing: .5,
          }}>{rolInfo.label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: BK }}>{acc.nombre}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'IBM Plex Mono' }}>
          {u} / {acc.pass}
        </span>
      </button>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F0F2F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'IBM Plex Sans, sans-serif',
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${G}18 0%, transparent 70%)`,
      }} />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px', position: 'relative', zIndex: 1 }}>
        {/* LOGO */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <ATPLogo variant="full" height={72} />
        </div>

        {/* Card login */}
        <div style={{
          background: '#FFFFFF', borderRadius: 16,
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '22px 28px 18px',
            borderBottom: '1px solid #F0F0F0',
          }}>
            <h1 style={{ color: '#1A1A1A', fontWeight: 700, fontSize: 18, margin: 0, letterSpacing: '-.3px' }}>
              Iniciar sesión
            </h1>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '5px 0 0' }}>
              Plataforma de gestión de accesos a sitios
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 7 }}>
                Usuario
              </label>
              <input
                value={user}
                onChange={e => { setUser(e.target.value); setError('') }}
                autoComplete="username"
                placeholder="Ingresa tu usuario"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 9,
                  background: '#F9FAFB', border: `1px solid ${error ? RD : '#E5E7EB'}`,
                  color: '#1A1A1A', fontSize: 14, fontFamily: 'IBM Plex Sans',
                  outline: 'none', transition: 'border-color .15s',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 7 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={pass}
                onChange={e => { setPass(e.target.value); setError('') }}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 9,
                  background: '#F9FAFB', border: `1px solid ${error ? RD : '#E5E7EB'}`,
                  color: '#1A1A1A', fontSize: 14, fontFamily: 'IBM Plex Sans',
                  outline: 'none', transition: 'border-color .15s',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: RD + '18', border: `1px solid ${RD}44`,
                color: '#FCA5A5', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !user || !pass}
              style={{
                width: '100%', padding: '13px', borderRadius: 9,
                background: loading || !user || !pass ? 'rgba(201,168,76,.3)' : G,
                color: BK, fontWeight: 700, fontSize: 15, border: 'none',
                cursor: loading || !user || !pass ? 'not-allowed' : 'pointer',
                fontFamily: 'IBM Plex Sans', transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading
                ? <><span style={{ width: 16, height: 16, border: `2px solid ${BK}44`, borderTopColor: BK, borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} /> Verificando…</>
                : 'Ingresar'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ padding: '0 28px 24px' }}>
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>
                Cuentas de demo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.keys(ACCOUNTS).map(demoBtn)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span className="mono" style={{ fontSize: 10, color: '#9CA3AF', letterSpacing: .5 }}>
            v2.2.0 · © 2025 PrimeCorp SpA · Confidencial
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: ${G} !important; box-shadow: 0 0 0 3px ${G}22; outline: none; }
      `}</style>
    </div>
  )
}
