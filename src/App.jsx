import { useState, useEffect } from 'react'
import { USERS } from './shared/data.js'
import { GlobalStyle } from './shared/components.jsx'
import { supabase, fromDb } from './lib/supabase.js'
import { enviarCorreoAutorizacion } from './lib/email.js'
import LoginPage from './LoginPage.jsx'
import ViewATP from './views/ViewATP.jsx'
import ViewOperador from './views/ViewOperador.jsx'
import ViewPropietario from './views/ViewPropietario.jsx'

const SESSION_KEY = 'atp_session'

export default function App() {
  const [user, setUser] = useState(() => {
    try { const s=sessionStorage.getItem(SESSION_KEY); return s?JSON.parse(s):null } catch { return null }
  })

  function handleLogin(userData) {
    setUser(userData)
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData)) } catch {}
  }

  function handleLogout() {
    setUser(null)
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }

  // Handle propietario action from email link (?id=SOL-001&action=autorizar|rechazar)
  const [emailAction, setEmailAction] = useState(null) // { id, action }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const id     = params.get('id')
    if ((action === 'autorizar' || action === 'rechazar') && id) {
      window.history.replaceState({}, '', window.location.pathname)
      setEmailAction({ id, action })
    }
  }, [])

  if (emailAction) return <DecisionPage id={emailAction.id} action={emailAction.action} onDone={() => setEmailAction(null)} />

  if (!user) return <LoginPage onLogin={handleLogin}/>

  return (
    <>
      <GlobalStyle/>
      {user.role === 'atp'         && <ViewATP        user={user} onLogout={handleLogout}/>}
      {user.role === 'operador'    && <ViewOperador    user={user} onLogout={handleLogout}/>}
      {user.role === 'propietario' && <ViewPropietario user={user} onLogout={handleLogout}/>}
    </>
  )
}

// ── PANTALLA STANDALONE DE DECISIÓN (desde correo) ─────────────────
function DecisionPage({ id, action, onDone }) {
  const [step, setStep] = useState('loading') // loading | confirm | motivo | done | error
  const [sol, setSol]   = useState(null)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    supabase.from('solicitudes').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) { setStep('error'); return }
        setSol(fromDb(data))
        setStep('confirm')
      })
  }, [id])

  async function confirmar() {
    if (action === 'rechazar' && !motivo.trim()) return
    const nuevoEstado = action === 'autorizar' ? 'Autorizado' : 'Rechazado'
    const extra = action === 'rechazar' ? { motivo_rechazo: motivo.trim() } : {}
    await supabase.from('solicitudes').update({ estado: nuevoEstado, ...extra }).eq('id', id)
    if (nuevoEstado === 'Autorizado') {
      try { await enviarCorreoAutorizacion({ solicitud: { ...sol, estado: nuevoEstado } }) } catch(e) {}
    }
    setStep('done')
  }

  const esAut = action === 'autorizar'
  const color = esAut ? '#15803D' : '#DC2626'
  const bgCol = esAut ? '#DCFCE7' : '#FEF2F2'

  if (step === 'loading') return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Segoe UI',Arial,sans-serif",background:'#F5F7FA'}}>
      <div style={{textAlign:'center',color:'#6B7280',fontSize:15}}>Cargando solicitud...</div>
    </div>
  )

  if (step === 'error') return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Segoe UI',Arial,sans-serif",background:'#F5F7FA'}}>
      <div style={{background:'#fff',borderRadius:12,padding:40,maxWidth:440,width:'100%',textAlign:'center',boxShadow:'0 8px 32px #0002'}}>
        <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
        <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Solicitud no encontrada</div>
        <p style={{color:'#6B7280',fontSize:14}}>El enlace puede haber expirado o la solicitud ya fue procesada.</p>
        <button onClick={onDone} style={{marginTop:20,background:'#1A1A1A',color:'#fff',border:'none',borderRadius:6,padding:'10px 24px',fontWeight:700,cursor:'pointer'}}>Ir al inicio</button>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Segoe UI',Arial,sans-serif",background:'#F5F7FA'}}>
      <div style={{background:'#fff',borderRadius:12,padding:40,maxWidth:440,width:'100%',textAlign:'center',boxShadow:'0 8px 32px #0002'}}>
        <div style={{fontSize:56,marginBottom:12}}>{esAut ? '✅' : '🚫'}</div>
        <div style={{fontWeight:700,fontSize:20,color:color,marginBottom:8}}>{esAut ? 'Acceso autorizado' : 'Acceso rechazado'}</div>
        <p style={{color:'#6B7280',fontSize:14}}>La solicitud <strong>{id}</strong> ha sido {esAut ? 'autorizada' : 'rechazada'}. El equipo ATP Chile y el operador han sido notificados.</p>
        <button onClick={onDone} style={{marginTop:20,background:'#1A1A1A',color:'#fff',border:'none',borderRadius:6,padding:'10px 24px',fontWeight:700,cursor:'pointer'}}>Cerrar</button>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Segoe UI',Arial,sans-serif",background:'#F5F7FA',padding:16}}>
      <div style={{background:'#fff',borderRadius:12,padding:36,maxWidth:480,width:'100%',boxShadow:'0 8px 32px #0002'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:14,color:'#6B7280',marginBottom:4}}>Solicitud de acceso a sitio ATP Chile</div>
          <div style={{fontWeight:700,fontSize:22,color:'#1A1A1A'}}>{id}</div>
        </div>
        {sol && (
          <div style={{background:'#F8FAFC',borderRadius:8,padding:16,marginBottom:24,fontSize:13,color:'#374151',lineHeight:1.8}}>
            <div><strong>Sitio:</strong> {sol.sitio}</div>
            <div><strong>Empresa:</strong> {sol.empresaNombre || sol.empresa || '—'}</div>
            <div><strong>Tipo de trabajo:</strong> {sol.trabajo}</div>
            <div><strong>Fechas:</strong> {sol.desde} → {sol.hasta}</div>
            <div><strong>Técnicos:</strong> {sol.trabajadores?.length || 0} persona(s)</div>
          </div>
        )}
        {action === 'rechazar' && (
          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Motivo del rechazo (obligatorio)</label>
            <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={3}
              placeholder="Indique el motivo..."
              style={{width:'100%',border:'1px solid #D1D5DB',borderRadius:6,padding:'9px 12px',fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box'}} />
          </div>
        )}
        <button onClick={confirmar}
          disabled={action === 'rechazar' && !motivo.trim()}
          style={{width:'100%',background:color,color:'#fff',border:'none',borderRadius:8,padding:'13px 0',fontWeight:700,fontSize:15,cursor:'pointer',opacity:action==='rechazar'&&!motivo.trim()?0.5:1}}>
          {esAut ? '✅ Confirmar autorización' : '🚫 Confirmar rechazo'}
        </button>
      </div>
    </div>
  )
}
