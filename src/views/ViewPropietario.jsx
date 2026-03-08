import { useState, useEffect } from 'react'
import { supabase, getSolicitudes, updateEstado, fromDb } from './lib/supabase.js'
import { SITIOS, TRABAJO_INFORMAL, C, ESTADO_COLOR } from './shared/data.js'
import { ATPLogo, GlobalStyle, Badge } from './shared/components.jsx'

export default function ViewPropietario({ user, onLogout }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]         = useState(true)
  const [accion, setAccion]           = useState(null) // {id, tipo}

  // Cargar solicitudes de los sitios del propietario
  async function cargar() {
    const data = await getSolicitudes()
    const rows = data.map(fromDb).filter(s =>
      user.sitios?.includes(s.sitio) &&
      ['En Gestión Propietario', 'Autorizado', 'Rechazado'].includes(s.estado)
    )
    setSolicitudes(rows)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const ch = supabase.channel('prop-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // Acción desde URL query params (cuando propietario hace clic en correo)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id     = params.get('id')
    const action = params.get('action')
    if (id && action) {
      setAccion({ id, tipo: action })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function handleDecision(solId, decision) {
    const nuevoEstado = decision === 'autorizar' ? 'Autorizado' : 'Rechazado'
    const sol = solicitudes.find(s => s.id === solId)
    if (!sol) return
    const nuevoHistorial = [...(sol.historial || []), {
      estado: nuevoEstado,
      fecha: new Date().toLocaleString('es-CL'),
      auto: false,
    }]
    await updateEstado(solId, nuevoEstado, { historial: nuevoHistorial })
    setAccion({ id: solId, tipo: decision, done: true })
    await cargar()
  }

  const pendientes  = solicitudes.filter(s => s.estado === 'En Gestión Propietario')
  const resueltas   = solicitudes.filter(s => ['Autorizado','Rechazado'].includes(s.estado))

  return (
    <div style={{minHeight:'100vh',background:'#F5F5F5',fontFamily:"'Segoe UI',Arial,sans-serif"}}>
      <GlobalStyle/>

      {/* Modal de acción desde correo */}
      {accion && !accion.done && (
        <div style={{position:'fixed',inset:0,background:'#00000077',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:32,maxWidth:440,width:'100%',boxShadow:'0 20px 60px #0003',textAlign:'center'}}>
            {accion.tipo === 'autorizar' ? (
              <>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Confirmar autorización</div>
                <p style={{color:C.textS,fontSize:14,margin:'0 0 20px'}}>¿Confirmas que autorizas el acceso a tu sitio para esta solicitud <strong>{accion.id}</strong>?</p>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button onClick={()=>handleDecision(accion.id,'autorizar')} style={{background:C.green,color:'#fff',border:'none',borderRadius:6,padding:'11px 28px',fontWeight:700,fontSize:14,cursor:'pointer'}}>✓ Sí, autorizo el acceso</button>
                  <button onClick={()=>setAccion(null)} style={{background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:6,padding:'11px 16px',cursor:'pointer'}}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:48,marginBottom:12}}>🚫</div>
                <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Rechazar acceso</div>
                <p style={{color:C.textS,fontSize:14,margin:'0 0 20px'}}>¿Confirmas que <strong>NO autorizas</strong> el acceso para la solicitud <strong>{accion.id}</strong>?</p>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button onClick={()=>handleDecision(accion.id,'rechazar')} style={{background:C.red,color:'#fff',border:'none',borderRadius:6,padding:'11px 28px',fontWeight:700,fontSize:14,cursor:'pointer'}}>✗ No autorizo</button>
                  <button onClick={()=>setAccion(null)} style={{background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:6,padding:'11px 16px',cursor:'pointer'}}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmación */}
      {accion?.done && (
        <div style={{position:'fixed',inset:0,background:'#00000077',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:40,maxWidth:380,width:'100%',textAlign:'center',boxShadow:'0 20px 60px #0003'}}>
            <div style={{fontSize:60,marginBottom:16}}>{accion.tipo==='autorizar'?'✅':'🚫'}</div>
            <div style={{fontWeight:800,fontSize:20,color:accion.tipo==='autorizar'?C.green:C.red,marginBottom:8}}>
              {accion.tipo==='autorizar' ? 'Acceso autorizado' : 'Acceso rechazado'}
            </div>
            <p style={{color:C.textS,fontSize:14,margin:'0 0 24px'}}>
              {accion.tipo==='autorizar'
                ? 'El operador y ATP han sido notificados. Los técnicos podrán acceder en las fechas indicadas.'
                : 'El operador y ATP han sido notificados del rechazo.'}
            </p>
            <button onClick={()=>setAccion(null)} style={{background:C.red,color:'#fff',border:'none',borderRadius:6,padding:'10px 24px',fontWeight:700,cursor:'pointer'}}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:'#fff',borderBottom:`1px solid ${C.border}`,padding:'0 20px',height:52,display:'flex',alignItems:'center',gap:12,boxShadow:'0 1px 4px #0001'}}>
        <ATPLogo size={0.9}/>
        <div style={{flex:1}}/>
        <div style={{fontSize:12,color:C.textS}}>Portal Propietarios</div>
        <div style={{width:1,height:24,background:C.border}}/>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,background:'#4CAF50',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12}}>{user.avatar}</div>
          <span style={{fontSize:13,fontWeight:500}}>{user.name}</span>
        </div>
        <button onClick={onLogout} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'5px 12px',cursor:'pointer',fontSize:12,color:C.textS}}>Salir</button>
      </div>

      {/* Content */}
      <div style={{maxWidth:680,margin:'0 auto',padding:'28px 20px'}}>

        {/* Bienvenida */}
        <div style={{background:`linear-gradient(135deg, #1B5E20, #2E7D32)`,borderRadius:10,padding:'20px 24px',color:'#fff',marginBottom:24}}>
          <div style={{fontSize:13,opacity:0.8,marginBottom:4}}>Portal de Propietarios · ATP Chile</div>
          <div style={{fontWeight:800,fontSize:20,marginBottom:6}}>Bienvenido, {user.name}</div>
          <div style={{fontSize:13,opacity:0.85}}>Aquí puedes revisar y responder las solicitudes de acceso a tus sitios. Solo necesitas aprobar o rechazar — ATP se encarga del resto.</div>
        </div>

        {loading && (
          <div style={{textAlign:'center',padding:48,color:C.textS}}>
            <div style={{fontSize:32,marginBottom:10,animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</div>
            <div>Cargando solicitudes...</div>
          </div>
        )}

        {/* Pendientes */}
        {!loading && pendientes.length > 0 && (
          <div style={{marginBottom:28}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:C.orange}}/>
              <span style={{fontWeight:700,fontSize:16}}>Esperando tu respuesta ({pendientes.length})</span>
            </div>
            {pendientes.map(s => <SolCardPropietario key={s.id} s={s} onDecision={handleDecision}/>)}
          </div>
        )}

        {!loading && pendientes.length === 0 && (
          <div style={{background:C.greenL,border:`1px solid ${C.green}44`,borderRadius:8,padding:24,textAlign:'center',marginBottom:24}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            <div style={{fontWeight:700,color:C.green,fontSize:16}}>Todo al día</div>
            <div style={{color:C.textS,fontSize:13,marginTop:4}}>No tienes solicitudes pendientes de respuesta</div>
          </div>
        )}

        {/* Resueltas */}
        {!loading && resueltas.length > 0 && (
          <div>
            <div style={{fontWeight:600,fontSize:13,color:C.textS,marginBottom:10,textTransform:'uppercase',letterSpacing:0.5}}>Historial de respuestas</div>
            {resueltas.map(s => <SolCardPropietario key={s.id} s={s} resuelta/>)}
          </div>
        )}
      </div>
    </div>
  )
}

function SolCardPropietario({ s, onDecision, resuelta }) {
  const sitio = SITIOS.find(x => x.id === s.sitio)
  const desc  = TRABAJO_INFORMAL[s.trabajo] || s.trabajo

  return (
    <div style={{background:'#fff',borderRadius:10,border:`1px solid ${resuelta?C.border:C.orange+'66'}`,borderLeft:`4px solid ${resuelta?(s.estado==='Autorizado'?C.green:C.red):C.orange}`,padding:20,marginBottom:12,boxShadow:resuelta?'none':'0 2px 12px rgba(230,81,0,0.1)'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div>
          <div style={{fontFamily:'monospace',fontSize:11,color:C.textS,marginBottom:3}}>{s.id}{s.refCliente&&` · ${s.refCliente}`}</div>
          <div style={{fontWeight:700,fontSize:15}}>{s.operador}</div>
          <div style={{fontSize:12,color:C.textS,marginTop:2}}>Empresa: {s.empresaNombre||s.empresa}</div>
        </div>
        <Badge estado={s.estado}/>
      </div>

      {/* Sitio */}
      <div style={{background:C.gray1,borderRadius:6,padding:'10px 14px',marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:12,color:C.textS,marginBottom:2}}>📍 Tu sitio</div>
        <div style={{fontWeight:700,fontSize:14}}>{sitio?.nombre || s.sitio}</div>
        <div style={{fontSize:12,color:C.textS}}>{sitio?.commune||sitio?.comuna} · {sitio?.regionLabel} · {sitio?.tipo}</div>
      </div>

      {/* Fechas */}
      <div style={{display:'flex',gap:10,marginBottom:12}}>
        <div style={{flex:1,background:C.blueL,borderRadius:6,padding:'10px 14px',textAlign:'center'}}>
          <div style={{fontSize:10,color:C.blue,fontWeight:600,marginBottom:2}}>DESDE</div>
          <div style={{fontWeight:700,fontSize:15,color:C.blue}}>{s.desde}</div>
        </div>
        <div style={{flex:1,background:C.blueL,borderRadius:6,padding:'10px 14px',textAlign:'center'}}>
          <div style={{fontSize:10,color:C.blue,fontWeight:600,marginBottom:2}}>HASTA</div>
          <div style={{fontWeight:700,fontSize:15,color:C.blue}}>{s.hasta}</div>
        </div>
        <div style={{flex:1,background:C.amberL,borderRadius:6,padding:'10px 14px',textAlign:'center'}}>
          <div style={{fontSize:10,color:C.amber,fontWeight:600,marginBottom:2}}>TÉCNICOS</div>
          <div style={{fontWeight:700,fontSize:15,color:C.amber}}>{s.trabajadores?.length||1}</div>
        </div>
      </div>

      {/* Descripción informal */}
      <div style={{background:'#EDE7F6',borderRadius:6,padding:'10px 14px',marginBottom:resuelta?0:14}}>
        <div style={{fontWeight:600,fontSize:11,color:'#4A148C',marginBottom:4}}>💬 ¿Qué van a hacer?</div>
        <div style={{fontSize:13,color:'#4A148C',lineHeight:1.5}}>{desc}</div>
      </div>

      {/* Acciones */}
      {!resuelta && onDecision && (
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>onDecision(s.id,'autorizar')} style={{flex:1,background:C.green,color:'#fff',border:'none',borderRadius:6,padding:'12px 0',fontWeight:700,fontSize:14,cursor:'pointer'}}>
            ✓ Autorizo el acceso
          </button>
          <button onClick={()=>onDecision(s.id,'rechazar')} style={{flex:1,background:'transparent',color:C.red,border:`2px solid ${C.red}`,borderRadius:6,padding:'12px 0',fontWeight:700,fontSize:14,cursor:'pointer'}}>
            ✗ No autorizo
          </button>
        </div>
      )}

      {resuelta && (
        <div style={{marginTop:12,fontSize:12,color:s.estado==='Autorizado'?C.green:C.red,fontWeight:600}}>
          {s.estado==='Autorizado' ? '✅ Autorizaste este acceso' : '🚫 Rechazaste este acceso'}
        </div>
      )}
    </div>
  )
}
