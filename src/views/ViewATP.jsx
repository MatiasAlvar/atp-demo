import { useState, useEffect } from 'react'
import { supabase, getSolicitudes, upsertSolicitud, updateEstado, getAlertas, upsertAlerta, resolverAlerta, fromDb } from '../lib/supabase.js'
import { enviarCorreoPropietario } from '../lib/email.js'
import { SITIOS, COLOCALIZACIONES, EMPRESAS, TIPOS_TRABAJO, VENTANA_MAX, TRABAJO_INFORMAL, ESTADOS, ESTADO_COLOR, C, OP_COLOR, OP_SHORT, OPERADORES, daysBetween, formatHours } from '../shared/data.js'
import { ATPLogo, Badge, AutoPill, FlowTracker, SolicitudCard, KpiCard, Notif, GlobalStyle } from '../shared/components.jsx'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts'

export default function ViewATP({ user, onLogout }) {
  const [view, setView]         = useState('lista')
  const [solicitudes, setSolicitudes] = useState([])
  const [alertas, setAlertas]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [notif, setNotif]       = useState(null)
  const [historialSol, setHistorialSol] = useState(null)
  const [filterEst, setFilterEst] = useState('')
  const [filterOp, setFilterOp]   = useState('')

  function showNotif(msg,type='success'){setNotif({msg,type});setTimeout(()=>setNotif(null),5000)}

  async function cargar(){
    const [sols,alts] = await Promise.all([getSolicitudes(), getAlertas()])
    setSolicitudes(sols.map(fromDb))
    setAlertas(alts)
    setLoading(false)
  }

  useEffect(()=>{
    cargar()
    const ch1=supabase.channel('atp-sol').on('postgres_changes',{event:'*',schema:'public',table:'solicitudes'},cargar).subscribe()
    const ch2=supabase.channel('atp-alt').on('postgres_changes',{event:'*',schema:'public',table:'alertas'},cargar).subscribe()
    return()=>{supabase.removeChannel(ch1);supabase.removeChannel(ch2)}
  },[])

  async function handleAutorizar(id){
    const sol=solicitudes.find(s=>s.id===id)
    if(!sol) return
    const hist=[...(sol.historial||[]),{estado:'Autorizado',fecha:new Date().toLocaleString('es-CL'),auto:false}]
    await updateEstado(id,'Autorizado',{historial:hist,ts_autorizado:new Date().toISOString()})
    showNotif('✅ Acceso autorizado — correo enviado al operador','success')
    await cargar()
  }

  async function handleReenviarCorreo(sol){
    const sitio=SITIOS.find(s=>s.id===sol.sitio)
    if(sitio){
      await enviarCorreoPropietario({solicitud:sol,sitio})
      showNotif('📧 Correo reenviado al propietario','success')
    }
  }

  const gestPend=solicitudes.filter(s=>['Validado','En Gestión Propietario'].includes(s.estado)).length
  const alertasActivas=alertas.filter(a=>a.estado==='activo').length
  const filtradas=solicitudes.filter(s=>(!filterEst||s.estado===filterEst)&&(!filterOp||s.operador===filterOp))

  const NAV=[
    {id:'lista',    icon:'🏠', label:'Panel de Accesos'},
    {id:'propietarios',icon:'🏗️',label:'Gestión Propietarios',badge:gestPend},
    {id:'alertas',  icon:'⚠️', label:'Alertas de Sitios',badge:alertasActivas,badgeColor:C.red},
    {id:'mapa',     icon:'🗺️', label:'Mapa de Chile'},
    {id:'dashboard',icon:'📊', label:'Dashboard KPIs'},
    {id:'colos',    icon:'📡', label:'Colocalizaciones'},
    {id:'reporteria',icon:'📥',label:'Reportería'},
    {id:'reglas',   icon:'⚙️', label:'Reglas del Motor'},
  ]

  return(
    <div style={{background:C.gray1,minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',Arial,sans-serif",color:C.text}}>
      <GlobalStyle/>
      <Notif notif={notif}/>

      {historialSol&&<HistorialModal sol={historialSol} onClose={()=>setHistorialSol(null)}/>}

      {/* Topbar */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:52,display:'flex',alignItems:'center',padding:'0 20px',gap:12,position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px #0001'}}>
        <ATPLogo size={0.9}/>
        <div style={{background:C.redL,color:C.red,borderRadius:10,padding:'2px 10px',fontSize:11,fontWeight:700}}>ADMIN</div>
        <div style={{flex:1}}/>
        {alertasActivas>0&&<div onClick={()=>setView('alertas')} style={{background:C.redL,border:`1px solid ${C.red}44`,borderRadius:20,padding:'3px 12px',fontSize:11,color:C.red,fontWeight:700,cursor:'pointer'}}>⚠️ {alertasActivas} alerta{alertasActivas>1?'s':''}</div>}
        {gestPend>0&&<div onClick={()=>setView('propietarios')} style={{background:C.orangeL,border:`1px solid ${C.orange}44`,borderRadius:20,padding:'3px 12px',fontSize:11,color:C.orange,fontWeight:700,cursor:'pointer'}}>🏗️ {gestPend} en gestión</div>}
        <img src="https://flagcdn.com/w20/cl.png" alt="CL" style={{height:14,borderRadius:2}}/>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,background:C.red,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12}}>{user.avatar}</div>
          <span style={{fontSize:13,fontWeight:500}}>{user.name}</span>
        </div>
        <button onClick={onLogout} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'5px 12px',cursor:'pointer',fontSize:12,color:C.textS}}>Salir</button>
      </div>

      <div style={{display:'flex',flex:1}}>
        {/* Sidebar */}
        <div style={{width:210,background:C.white,borderRight:`1px solid ${C.border}`,padding:'12px 0',flexShrink:0,overflowY:'auto'}}>
          <div style={{fontSize:10,fontWeight:700,color:C.gray4,letterSpacing:1,padding:'0 14px 8px',textTransform:'uppercase'}}>Panel ATP</div>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 14px',background:view===n.id?'#FFEBEE':C.white,borderLeft:view===n.id?`3px solid ${C.red}`:'3px solid transparent',cursor:'pointer',transition:'all 0.15s'}}>
              <span style={{fontSize:13}}>{n.icon}</span>
              <span style={{fontSize:12,fontWeight:view===n.id?700:400,color:view===n.id?C.red:C.text,flex:1}}>{n.label}</span>
              {n.badge>0&&<span style={{background:n.badgeColor||C.orange,color:'#fff',borderRadius:'50%',width:17,height:17,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>{n.badge}</span>}
            </div>
          ))}
          <div style={{margin:'12px 10px 0',background:C.amberL,border:'1px solid #FFE082',borderRadius:6,padding:'8px 10px'}}>
            <div style={{fontSize:10,fontWeight:700,color:C.amber,marginBottom:2}}>⚡ MOTOR AUTOMÁTICO</div>
            <div style={{fontSize:10,color:C.textS}}>PrimeCorp v1.0 activo</div>
            <div style={{fontSize:10,color:C.green,marginTop:1}}>{solicitudes.filter(s=>s.auto).length} solicitudes procesadas</div>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,padding:22,overflowY:'auto',maxHeight:'calc(100vh - 52px)'}}>
          {loading&&<div style={{textAlign:'center',padding:48,color:C.textS}}>Cargando datos en tiempo real...</div>}

          {!loading&&view==='lista'&&<PanelLista solicitudes={filtradas} allSolicitudes={solicitudes} filterEst={filterEst} setFilterEst={setFilterEst} filterOp={filterOp} setFilterOp={setFilterOp} onHistorial={setHistorialSol}/>}
          {!loading&&view==='propietarios'&&<GestionPropietarios solicitudes={solicitudes} onAutorizar={handleAutorizar} onReenviar={handleReenviarCorreo} showNotif={showNotif}/>}
          {!loading&&view==='alertas'&&<TabAlertas alertas={alertas} setAlertas={setAlertas} showNotif={showNotif}/>}
          {!loading&&view==='mapa'&&<TabMapa solicitudes={solicitudes}/>}
          {!loading&&view==='dashboard'&&<Dashboard solicitudes={solicitudes}/>}
          {!loading&&view==='colos'&&<TabColocalizaciones/>}
          {!loading&&view==='reporteria'&&<TabReporteria solicitudes={solicitudes}/>}
          {!loading&&view==='reglas'&&<TabReglas/>}
        </div>
      </div>

      <div style={{background:C.white,borderTop:`1px solid ${C.border}`,padding:'7px 24px',fontSize:11,color:C.gray4,textAlign:'right'}}>
        ATP Chile · v1.0 · <span style={{color:C.red,fontWeight:600}}>Automatizado por PrimeCorp SpA ⚡</span>
      </div>
    </div>
  )
}

// ── HISTORIAL MODAL ───────────────────────────────────────────
function HistorialModal({sol,onClose}){
  return(
    <div style={{position:'fixed',inset:0,background:'#00000066',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:8,padding:28,width:500,maxHeight:'80vh',overflowY:'auto',boxShadow:'0 8px 32px #0002'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
          <div><div style={{fontWeight:700,fontSize:15}}>{sol.id}</div><div style={{fontSize:12,color:C.textS}}>{sol.operador} · {sol.sitio}</div></div>
          <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:20,color:C.gray4}}>×</button>
        </div>
        <div style={{height:1,background:C.border,marginBottom:14}}/>
        {sol.historial?.map((h,i)=>(
          <div key={i} style={{display:'flex',gap:12,paddingBottom:14}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:ESTADO_COLOR[h.estado]?.bg||C.gray4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:700,flexShrink:0}}>{i+1}</div>
            <div style={{paddingTop:3}}><div style={{display:'flex',gap:8,marginBottom:3}}><Badge estado={h.estado} small/><AutoPill auto={h.auto}/></div><div style={{fontSize:11,color:C.textS}}>{h.fecha}</div></div>
          </div>
        ))}
        <FlowTracker estado={sol.estado}/>
        {sol.tsEnviado&&sol.tsAutorizado&&<div style={{background:C.greenL,borderRadius:4,padding:'8px 12px',fontSize:12,marginTop:12}}>
          <strong style={{color:C.green}}>⏱️ Tiempo total:</strong> {formatHours(Math.round((new Date(sol.tsAutorizado)-new Date(sol.tsEnviado))/3600000))} desde envío hasta autorización
        </div>}
        <button onClick={onClose} style={{width:'100%',padding:'8px 0',background:C.red,color:'#fff',border:'none',borderRadius:4,fontWeight:700,cursor:'pointer',marginTop:14}}>Cerrar</button>
      </div>
    </div>
  )
}

// ── PANEL LISTA ───────────────────────────────────────────────
function PanelLista({solicitudes,allSolicitudes,filterEst,setFilterEst,filterOp,setFilterOp,onHistorial}){
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Panel de Solicitudes</h2>
        <span style={{fontSize:12,color:C.textS}}>Todas las solicitudes — tiempo real</span>
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:14,marginBottom:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Estado</label>
            <select value={filterEst} onChange={e=>setFilterEst(e.target.value)} style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'6px 10px',fontSize:12}}>
              <option value="">Todos</option>{ESTADOS.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Operador</label>
            <select value={filterOp} onChange={e=>setFilterOp(e.target.value)} style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'6px 10px',fontSize:12}}>
              <option value="">Todos</option>{OPERADORES.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{display:'flex',alignItems:'flex-end'}}><button onClick={()=>{setFilterEst('');setFilterOp('')}} style={{color:C.red,background:'transparent',border:`1px solid ${C.red}`,borderRadius:4,padding:'6px 14px',fontWeight:600,fontSize:12,cursor:'pointer'}}>✕ Limpiar</button></div>
        </div>
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
        <div style={{background:C.gray1,padding:'9px 14px',borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.textS}}>{solicitudes.length} solicitudes</div>
        {solicitudes.length===0?<div style={{padding:32,textAlign:'center',color:C.textS}}>No hay solicitudes</div>
          :solicitudes.map(s=><SolicitudCard key={s.id} s={s} onHistorial={onHistorial} showAll={true}/>)}
      </div>
    </div>
  )
}

// ── GESTIÓN PROPIETARIOS ──────────────────────────────────────
function GestionPropietarios({solicitudes,onAutorizar,onReenviar,showNotif}){
  const pendientes=solicitudes.filter(s=>['Validado','En Gestión Propietario'].includes(s.estado))
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Gestión con Propietarios</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Solicitudes validadas esperando confirmación del propietario del sitio.</p>
      {pendientes.length===0&&<div style={{background:C.greenL,borderRadius:8,padding:24,textAlign:'center',color:C.green,fontWeight:700}}>✅ Sin solicitudes pendientes con propietarios</div>}
      {pendientes.map(s=>{
        const sitio=SITIOS.find(x=>x.id===s.sitio)
        return(
          <div key={s.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18,marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}><span style={{fontWeight:700,fontSize:14}}>{s.id}</span>{s.refCliente&&<span style={{fontSize:11,color:C.textS,background:C.gray1,borderRadius:3,padding:'1px 7px'}}>{s.refCliente}</span>}<Badge estado={s.estado}/></div>
                <div style={{fontSize:12,color:C.textS}}>{s.operador} · {s.empresaNombre||s.empresa}</div>
              </div>
              <div style={{textAlign:'right',fontSize:12}}><div style={{fontWeight:600}}>{s.trabajo}</div><div style={{color:C.textS}}>📅 {s.desde} → {s.hasta}</div></div>
            </div>
            <div style={{background:C.amberL,border:'1px solid #FFE082',borderRadius:4,padding:'10px 14px',marginBottom:10,fontSize:12}}>
              <div style={{fontWeight:600,color:C.amber,marginBottom:4}}>📍 {sitio?.nombre} · {sitio?.propietario}</div>
              <div style={{color:C.textS}}>Contacto: {sitio?.contacto} · {sitio?.tel}</div>
              <div style={{color:C.textS,marginTop:4,fontStyle:'italic'}}>"{TRABAJO_INFORMAL[s.trabajo]||s.trabajo}"</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>onAutorizar(s.id)} style={{background:C.green,color:'#fff',border:'none',borderRadius:4,padding:'7px 18px',fontWeight:700,cursor:'pointer',fontSize:12}}>✓ Autorizar acceso</button>
              <button onClick={()=>onReenviar(s)} style={{background:'transparent',color:C.red,border:`1px solid ${C.red}`,borderRadius:4,padding:'7px 14px',fontWeight:600,cursor:'pointer',fontSize:12}}>📧 Reenviar correo propietario</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── ALERTAS ───────────────────────────────────────────────────
function TabAlertas({alertas,setAlertas,showNotif}){
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({sitio_id:'',tipo:'contractual',titulo:'',descripcion:''})
  const activas=alertas.filter(a=>a.estado==='activo')
  const resueltas=alertas.filter(a=>a.estado==='resuelto')

  async function agregar(){
    if(!form.sitio_id||!form.titulo) return
    const alerta={...form,id:`ALT${Date.now()}`,estado:'activo',added_by:'ATP',created_at:new Date().toISOString()}
    await upsertAlerta(alerta)
    setAlertas(a=>[alerta,...a])
    setForm({sitio_id:'',tipo:'contractual',titulo:'',descripcion:''})
    setShowForm(false)
    showNotif('⚠️ Alerta agregada','success')
  }

  async function resolver(id){
    await resolverAlerta(id)
    setAlertas(a=>a.map(x=>x.id===id?{...x,estado:'resuelto'}:x))
    showNotif('✅ Alerta marcada como resuelta','success')
  }

  const inp={width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',fontSize:12,fontFamily:'inherit'}
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Alertas de Sitios</h2>
        <button onClick={()=>setShowForm(o=>!o)} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'7px 16px',fontWeight:700,cursor:'pointer',fontSize:12}}>+ Nueva alerta</button>
      </div>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Los operadores verán estas alertas al seleccionar un sitio con problemas.</p>
      {showForm&&<div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:20,marginBottom:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Sitio</label>
            <select value={form.sitio_id} onChange={e=>setForm(f=>({...f,sitio_id:e.target.value}))} style={inp}>
              <option value="">Seleccione sitio...</option>{SITIOS.map(s=><option key={s.id} value={s.id}>{s.id} — {s.nombre}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Tipo</label>
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>
              <option value="contractual">Problema contractual</option>
              <option value="documentacion">Documentación requerida</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom:12}}><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Título</label><input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} style={inp}/></div>
        <div style={{marginBottom:14}}><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Descripción</label><textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={3} style={{...inp,resize:'vertical'}}/></div>
        <div style={{display:'flex',gap:10}}><button onClick={agregar} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',fontWeight:700,cursor:'pointer',fontSize:13}}>Agregar</button><button onClick={()=>setShowForm(false)} style={{background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',cursor:'pointer',fontSize:13}}>Cancelar</button></div>
      </div>}
      <div style={{fontWeight:600,fontSize:13,color:C.red,marginBottom:10}}>⚠️ Activas ({activas.length})</div>
      {activas.length===0&&<div style={{background:C.greenL,borderRadius:6,padding:16,textAlign:'center',color:C.green,fontWeight:600,marginBottom:16}}>✅ No hay alertas activas</div>}
      {activas.map(a=>{
        const sitio=SITIOS.find(s=>s.id===a.sitio_id)
        return(<div key={a.id} style={{background:C.white,border:`1px solid ${a.tipo==='contractual'?C.red+'44':'#FFE082'}`,borderLeft:`4px solid ${a.tipo==='contractual'?C.red:C.amber}`,borderRadius:6,padding:16,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                <span style={{fontWeight:700,fontSize:13,color:a.tipo==='contractual'?C.red:C.amber}}>{a.tipo==='contractual'?'⚠️ Contractual':'📋 Documentación'}</span>
                <span style={{fontFamily:'monospace',fontSize:11,background:C.gray1,borderRadius:3,padding:'1px 7px'}}>{a.sitio_id}</span>
              </div>
              <div style={{fontWeight:600,fontSize:14}}>{a.titulo}</div>
              <div style={{fontSize:12,color:C.textS,marginTop:3}}>{a.descripcion}</div>
            </div>
            <div style={{textAlign:'right',fontSize:11,color:C.textS,flexShrink:0,marginLeft:12}}>{sitio?.nombre}</div>
          </div>
          <button onClick={()=>resolver(a.id)} style={{background:C.green,color:'#fff',border:'none',borderRadius:3,padding:'4px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Marcar como resuelto</button>
        </div>)
      })}
      {resueltas.length>0&&<div style={{marginTop:16}}><div style={{fontWeight:600,fontSize:12,color:C.textS,marginBottom:8}}>Resueltas ({resueltas.length})</div>{resueltas.map(a=><div key={a.id} style={{background:C.gray1,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',marginBottom:4,fontSize:12,color:C.gray4,textDecoration:'line-through'}}>{a.titulo} — {a.sitio_id}</div>)}</div>}
    </div>
  )
}

// ── MAPA ──────────────────────────────────────────────────────
function TabMapa({solicitudes}){
  const [hover,setHover]=useState(null)
  const toSVG=(lat,lng)=>({x:Math.round(((lng-(-76))/(-65-(-76)))*200+20),y:Math.round(((lat-(-17))/(-56-(-17)))*520+20)})
  const stats=solicitudes.reduce((acc,s)=>{if(!acc[s.sitio])acc[s.sitio]={total:0,aut:0,pend:0};acc[s.sitio].total++;if(s.estado==='Autorizado')acc[s.sitio].aut++;if(['En Gestión Propietario','Validado'].includes(s.estado))acc[s.sitio].pend++;return acc},{})
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Mapa de Sitios ATP Chile</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Distribución geográfica de sitios y actividad por región.</p>
      <div style={{display:'flex',gap:14}}>
        <div style={{width:200,flexShrink:0}}>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:14,marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Leyenda</div>
            {[['#43A047','Con accesos autorizados'],['#FB8C00','Con solicitudes pendientes'],['#1565C0','Sin actividad reciente']].map(([c,l])=><div key={l} style={{display:'flex',gap:6,alignItems:'center',marginBottom:5,fontSize:11}}><div style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0}}/><span style={{color:C.textS}}>{l}</span></div>)}
          </div>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:14}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Resumen</div>
            {[['Total sitios',SITIOS.length],['Con actividad',Object.keys(stats).length],['Solicitudes',solicitudes.length]].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}><span style={{color:C.textS}}>{l}</span><strong>{v}</strong></div>)}
          </div>
        </div>
        <div style={{flex:1,background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden',position:'relative',minHeight:560}}>
          <svg width="100%" height="560" style={{background:'#EEF7FF'}}>
            <path d="M 115,20 L 120,50 L 125,90 L 118,130 L 122,170 L 115,210 L 110,250 L 108,300 L 105,350 L 100,400 L 95,440 L 88,480 L 80,520 L 75,540 L 70,555 L 78,555 L 90,540 L 95,520 L 100,490 L 105,450 L 110,410 L 116,360 L 118,310 L 120,260 L 125,215 L 130,175 L 135,135 L 132,95 L 128,55 L 124,25 Z" fill="#D4E8F0" stroke="#B0D0E0" strokeWidth="1"/>
            {SITIOS.map(s=>{
              const pt=toSVG(s.lat,s.lng),st=stats[s.id]||{},isH=hover===s.id
              const color=st.aut>0?'#43A047':st.pend>0?'#FB8C00':'#1565C0'
              return(<g key={s.id} onMouseEnter={()=>setHover(s.id)} onMouseLeave={()=>setHover(null)} style={{cursor:'pointer'}}>
                <circle cx={pt.x} cy={pt.y} r={isH?10:7} fill={color} stroke="white" strokeWidth={2} opacity={0.9}/>
                {isH&&<g>
                  <rect x={pt.x+12} y={pt.y-28} width={160} height={60} rx={4} fill="white" stroke={C.border} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"/>
                  <text x={pt.x+18} y={pt.y-12} fontSize={10} fontWeight="bold" fill={C.text}>{s.id}</text>
                  <text x={pt.x+18} y={pt.y+0} fontSize={9} fill={C.textS}>{s.nombre}</text>
                  <text x={pt.x+18} y={pt.y+12} fontSize={9} fill={C.textS}>{st.total||0} solicitudes · {st.aut||0} aut.</text>
                  <text x={pt.x+18} y={pt.y+24} fontSize={9} fill={C.textS}>{s.regionLabel} · {s.tipo}</text>
                </g>}
              </g>)
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({solicitudes}){
  const total=solicitudes.length||1
  const aut=solicitudes.filter(s=>s.estado==='Autorizado').length
  const rech=solicitudes.filter(s=>s.estado==='Rechazado').length
  const gestPend=solicitudes.filter(s=>['En Gestión Propietario','Validado'].includes(s.estado)).length
  const tiempos=solicitudes.filter(s=>s.tsEnviado&&s.tsAutorizado).map(s=>Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/3600000))
  const promH=tiempos.length?Math.round(tiempos.reduce((a,b)=>a+b,0)/tiempos.length):0
  const estadoData=ESTADOS.map(e=>({name:e,value:solicitudes.filter(s=>s.estado===e).length,color:ESTADO_COLOR[e]?.bg||C.gray4})).filter(d=>d.value>0)
  const opData=OPERADORES.map(op=>({op:OP_SHORT[op],n:solicitudes.filter(s=>s.operador===op).length,color:OP_COLOR[op]})).filter(d=>d.n>0)
  const weeklyData=[{sem:'S1 Feb',aut:6,rech:1},{sem:'S2 Feb',aut:8,rech:2},{sem:'S3 Feb',aut:7,rech:1},{sem:'S4 Feb',aut:10,rech:2},{sem:'S1 Mar',aut:9,rech:1},{sem:'S2 Mar',aut:aut,rech:rech}]
  const tiemposPorOp=OPERADORES.map(op=>{const ts=solicitudes.filter(s=>s.operador===op&&s.tsEnviado&&s.tsAutorizado).map(s=>Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/3600000));return{op:OP_SHORT[op],prom:ts.length?Math.round(ts.reduce((a,b)=>a+b,0)/ts.length):0,color:OP_COLOR[op]}}).filter(d=>d.prom>0)
  const TT=({active,payload,label})=>active&&payload?.length?<div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',fontSize:12}}><div style={{fontWeight:600,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color||C.text}}>{p.name}: <strong>{p.value}</strong></div>)}</div>:null
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Dashboard ATP Chile</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>{new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <KpiCard icon="📋" value={solicitudes.length} label="Total" color={C.blue}/>
        <KpiCard icon="✅" value={aut} label="Autorizadas" color={C.green} sub={`${Math.round(aut/total*100)}%`}/>
        <KpiCard icon="⏳" value={gestPend} label="En gestión" color={C.orange}/>
        <KpiCard icon="❌" value={rech} label="Rechazadas" color={C.red}/>
        <KpiCard icon="⚡" value={`${Math.round(solicitudes.filter(s=>s.auto).length/total*100)}%`} label="Automatizadas" color={C.purple}/>
        <KpiCard icon="⏱️" value={`${promH}h`} label="Prom. autorización" color={C.teal} sub="envío → autorizado"/>
        <KpiCard icon="🏗️" value={SITIOS.length} label="Sitios" color={C.blue}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Tendencia semanal</div>
          <ResponsiveContainer width="100%" height={180}><AreaChart data={weeklyData} margin={{top:5,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.gray2}/><XAxis dataKey="sem" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TT/>}/><Legend iconSize={8} wrapperStyle={{fontSize:11}}/><Area type="monotone" dataKey="aut" name="Autorizadas" stroke={C.green} fill={C.greenL}/><Area type="monotone" dataKey="rech" name="Rechazadas" stroke={C.red} fill={C.redL}/></AreaChart></ResponsiveContainer>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Por estado</div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <ResponsiveContainer width="55%" height={160}><PieChart><Pie data={estadoData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={2}>{estadoData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
            <div style={{flex:1}}>{estadoData.map(d=><div key={d.name} style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}><div style={{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0}}/><span style={{fontSize:10,color:C.textS,flex:1}}>{d.name}</span><span style={{fontSize:11,fontWeight:700}}>{d.value}</span></div>)}</div>
          </div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Solicitudes por operador</div>
          <ResponsiveContainer width="100%" height={150}><BarChart data={opData} margin={{left:-20,bottom:0,top:5,right:5}}><XAxis dataKey="op" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TT/>}/><Bar dataKey="n" name="Solicitudes" radius={[3,3,0,0]}>{opData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar></BarChart></ResponsiveContainer>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>⏱️ Tiempo prom. autorización (h)</div>
          {tiemposPorOp.length>0
            ?<ResponsiveContainer width="100%" height={150}><BarChart data={tiemposPorOp} margin={{left:-20,bottom:0,top:5,right:5}}><XAxis dataKey="op" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TT/>} formatter={v=>[`${v}h`,'Prom.']}/><Bar dataKey="prom" name="Horas" radius={[3,3,0,0]}>{tiemposPorOp.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar></BarChart></ResponsiveContainer>
            :<div style={{textAlign:'center',color:C.gray4,padding:20,fontSize:13}}>Sin datos suficientes</div>
          }
        </div>
      </div>
    </div>
  )
}

// ── COLOCALIZACIONES ──────────────────────────────────────────
function TabColocalizaciones(){
  const [busq,setBusq]=useState('')
  const filtrado=SITIOS.filter(s=>s.id.toLowerCase().includes(busq.toLowerCase())||s.nombre.toLowerCase().includes(busq.toLowerCase())||(COLOCALIZACIONES[s.id]||[]).some(op=>op.toLowerCase().includes(busq.toLowerCase())))
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Colocalizaciones por Sitio</h2>
      <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar por sitio, operador, región..." style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 14px',fontSize:13,marginBottom:14,fontFamily:'inherit'}}/>
      <div style={{fontSize:11,color:C.textS,marginBottom:12}}>{filtrado.length} de {SITIOS.length} sitios</div>
      {filtrado.map(s=>{
        const ops=COLOCALIZACIONES[s.id]||[]
        return(<div key={s.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'14px 18px',marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}><span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span><span style={{fontSize:11,color:C.textS,background:C.gray1,borderRadius:3,padding:'1px 7px'}}>{s.siterra}</span><span style={{fontSize:11,color:C.textS}}>{s.tipo}</span></div>
              <div style={{fontWeight:600}}>{s.nombre}</div>
              <div style={{fontSize:12,color:C.textS,marginTop:2}}>{s.comuna} · {s.regionLabel} · {s.altTotal}m</div>
            </div>
            <div style={{textAlign:'right',fontSize:11,color:C.textS}}><div>{s.propietario}</div><div>{s.contacto}</div></div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:11,color:C.textS,fontWeight:600}}>Colocalizados:</span>
            {ops.length===0?<span style={{fontSize:11,color:C.gray4}}>Sin registros</span>:ops.map(op=><span key={op} style={{background:OP_COLOR[op]+'22',border:`1px solid ${OP_COLOR[op]}55`,color:OP_COLOR[op],borderRadius:10,padding:'2px 10px',fontSize:11,fontWeight:700}}>{OP_SHORT[op]||op}</span>)}
          </div>
        </div>)
      })}
    </div>
  )
}

// ── REPORTERÍA ────────────────────────────────────────────────
function TabReporteria({solicitudes}){
  function descargarCSV(){
    const h=['ID','Ref Cliente','Operador','Empresa','Trabajo','Sitio','Desde','Hasta','Estado','T.Autorizacion(h)']
    const r=solicitudes.map(s=>[s.id,s.refCliente||'',s.operador,s.empresaNombre||s.empresa,s.trabajo,s.sitio,s.desde||'',s.hasta||'',s.estado,(s.tsEnviado&&s.tsAutorizado)?Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/3600000):''])
    const csv=[h,...r].map(row=>row.map(v=>`"${v}"`).join(',')).join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`ATP_Reporte_${new Date().toISOString().split('T')[0]}.csv`;a.click()
  }
  function descargarJSON(){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(solicitudes,null,2)],{type:'application/json'}));a.download=`ATP_Datos_${new Date().toISOString().split('T')[0]}.json`;a.click()
  }
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Reportería y Exportación</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 20px'}}>Descarga reportes del sistema en diferentes formatos.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
        {[{fmt:'csv',icon:'📊',label:'CSV',desc:'Compatible con Excel y Sheets',onClick:descargarCSV,ok:true},{fmt:'json',icon:'🔧',label:'JSON',desc:'Para integración con sistemas',onClick:descargarJSON,ok:true},{fmt:'xlsx',icon:'📗',label:'Excel / PDF / PPT',desc:'Versión completa del sistema',ok:false}].map(f=>(
          <div key={f.fmt} style={{background:C.white,border:`1px solid ${f.ok?C.blue:C.border}`,borderRadius:6,padding:16,opacity:f.ok?1:0.7}}>
            <div style={{fontSize:24,marginBottom:6}}>{f.icon}</div>
            <div style={{fontWeight:700,fontSize:13}}>{f.label}</div>
            <div style={{fontSize:11,color:C.textS,marginBottom:10}}>{f.desc}</div>
            <button onClick={f.onClick} disabled={!f.ok} style={{background:f.ok?C.blue:C.gray3,color:f.ok?'#fff':C.gray4,border:'none',borderRadius:3,padding:'6px 16px',fontSize:12,fontWeight:700,cursor:f.ok?'pointer':'not-allowed'}}>
              {f.ok?'⬇️ Descargar':'PRO'}
            </button>
          </div>
        ))}
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
        <div style={{background:C.gray1,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,fontWeight:600,fontSize:13}}>Vista previa ({solicitudes.length} registros)</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:C.gray2}}>{['ID','Operador','Trabajo','Sitio','Fechas','Estado'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:C.textS,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
            <tbody>{solicitudes.map((s,i)=><tr key={s.id} style={{borderBottom:`1px solid ${C.gray2}`,background:i%2===0?C.white:C.gray1}}>
              <td style={{padding:'7px 12px',fontFamily:'monospace',fontSize:11,color:C.red,fontWeight:600}}>{s.id}</td>
              <td style={{padding:'7px 12px'}}>{OP_SHORT[s.operador]||s.operador}</td>
              <td style={{padding:'7px 12px',fontSize:11}}>{s.trabajo}</td>
              <td style={{padding:'7px 12px',fontFamily:'monospace',fontSize:11}}>{s.sitio}</td>
              <td style={{padding:'7px 12px',fontSize:11}}>{s.desde} → {s.hasta}</td>
              <td style={{padding:'7px 12px'}}><Badge estado={s.estado} small/></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── REGLAS ────────────────────────────────────────────────────
function TabReglas(){
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Reglas del Motor de Validación</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 20px'}}>Aplicadas automáticamente por PrimeCorp en cada solicitud.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:C.red}}>⏱️ Ventanas por tipo de trabajo</div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:C.gray1}}>{['Tipo','Días máx.'].map(h=><th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:11,color:C.textS,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{TIPOS_TRABAJO.map((t,i)=><tr key={t} style={{borderBottom:`1px solid ${C.gray2}`,background:i%2===0?C.white:C.gray1}}><td style={{padding:'7px 10px',fontSize:11,fontWeight:600}}>{t}</td><td style={{padding:'7px 10px',fontSize:14,fontWeight:800,color:C.red}}>{VENTANA_MAX[t]}d</td></tr>)}</tbody>
          </table>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:C.red}}>📋 Validaciones automáticas</div>
          {[['🔌','Colocalización','Operador debe estar colocalizado en el sitio'],['⏱️','Ventana de trabajo','Duración máxima según tipo'],['📅','Conflicto de fechas','No dos operadores en mismo sitio y fechas'],['👷','Acreditación','Trabajadores acreditados en sistema ATP'],['📧','Correos obligatorios','Mandante + contratista para notificaciones'],['🔒','Empresa autorizada','Contratista autorizada para el sitio']].map(([ic,t,d])=>(
            <div key={t} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:`1px solid ${C.gray2}`}}>
              <span style={{fontSize:15,flexShrink:0}}>{ic}</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{t}</div><div style={{fontSize:11,color:C.textS,marginTop:1}}>{d}</div></div>
              <span style={{color:C.green,fontSize:14,alignSelf:'center'}}>✓</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
