import { useState, useEffect } from 'react'
import { supabase, getSolicitudes, upsertSolicitud, updateEstado, getAlertas, upsertAlerta, resolverAlerta, getTrabajadores, upsertTrabajador, deleteTrabajador, fromDb } from '../lib/supabase.js'
import { enviarCorreoPropietario } from '../lib/email.js'
import { SITIOS, COLOCALIZACIONES, EMPRESAS_DEFAULT, TIPOS_TRABAJO, VENTANA_MAX, ESTADOS, ESTADO_COLOR, C, OP_COLOR, OP_SHORT, OPERADORES, daysBetween, formatDuration, formatRUT, todayISO } from '../shared/data.js'
import { ATPLogo, Badge, AutoPill, FlowTracker, SolicitudCard, DetalleModal, KpiCard, Notif, GlobalStyle } from '../shared/components.jsx'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts'

export default function ViewATP({ user, onLogout }) {
  const [view, setView]           = useState('lista')
  const [solicitudes, setSolicitudes] = useState([])
  const [alertas, setAlertas]     = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [loading, setLoading]     = useState(true)
  const [notif, setNotif]         = useState(null)
  const [detalleSol, setDetalleSol] = useState(null)
  const [filterEst, setFilterEst] = useState('')
  const [filterOp, setFilterOp]   = useState('')

  function showNotif(msg,type='success'){setNotif({msg,type});setTimeout(()=>setNotif(null),5000)}

  async function cargar(){
    const [sols,alts,trabs]=await Promise.all([getSolicitudes(),getAlertas(),getTrabajadores()])
    setSolicitudes(sols.map(fromDb))
    setAlertas(alts)
    setTrabajadores(trabs)
    setLoading(false)
  }

  useEffect(()=>{
    cargar()
    const ch1=supabase.channel('atp-sol').on('postgres_changes',{event:'*',schema:'public',table:'solicitudes'},cargar).subscribe()
    const ch2=supabase.channel('atp-alt').on('postgres_changes',{event:'*',schema:'public',table:'alertas'},cargar).subscribe()
    const ch3=supabase.channel('atp-trb').on('postgres_changes',{event:'*',schema:'public',table:'trabajadores'},cargar).subscribe()
    return()=>{supabase.removeChannel(ch1);supabase.removeChannel(ch2);supabase.removeChannel(ch3)}
  },[])

  async function handleAutorizar(id){
    const sol=solicitudes.find(s=>s.id===id); if(!sol) return
    const hist=[...(sol.historial||[]),{estado:'Autorizado',fecha:new Date().toLocaleString('es-CL'),auto:false}]
    await updateEstado(id,'Autorizado',{historial:hist})
    // Enviar correo de autorización a ambos correos
    try {
      const { enviarCorreoAutorizacion } = await import('../lib/email.js')
      await enviarCorreoAutorizacion({ solicitud:{...sol,estado:'Autorizado'} })
    } catch(e){console.error('email err',e)}
    showNotif('✅ Acceso autorizado — correo enviado al operador','success')
    await cargar()
  }

  async function handleReenviarCorreo(sol){
    const sitio=SITIOS.find(s=>s.id===sol.sitio)
    if(sitio){ await enviarCorreoPropietario({solicitud:sol,sitio}); showNotif('📧 Correo reenviado al propietario','success') }
  }

  const gestPend  = solicitudes.filter(s=>['Validado','En Gestión Propietario'].includes(s.estado)).length
  const alertasAct= alertas.filter(a=>a.estado==='activo').length
  const filtradas = solicitudes.filter(s=>(!filterEst||s.estado===filterEst)&&(!filterOp||s.operador===filterOp))

  const NAV=[
    {id:'lista',     icon:'🏠',label:'Panel de Accesos'},
    {id:'propietarios',icon:'🏗️',label:'Gestión Propietarios',badge:gestPend},
    {id:'alertas',   icon:'⚠️',label:'Alertas de Sitios',badge:alertasAct,badgeColor:C.red},
    {id:'mapa',      icon:'🗺️',label:'Mapa de Chile'},
    {id:'dashboard', icon:'📊',label:'Dashboard KPIs'},
    {id:'colos',     icon:'📡',label:'Colocalizaciones'},
    {id:'reporteria',icon:'📥',label:'Reportería'},
    {id:'trabajadores',icon:'👷',label:'Trabajadores'},
    {id:'reglas',    icon:'⚙️',label:'Reglas del Motor'},
  ]

  return(
    <div style={{background:C.gray1,minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',Arial,sans-serif",color:C.text}}>
      <GlobalStyle/>
      <Notif notif={notif}/>
      <DetalleModal sol={detalleSol} onClose={()=>setDetalleSol(null)}/>

      {/* Topbar */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:52,display:'flex',alignItems:'center',padding:'0 20px',gap:12,position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px #0001'}}>
        <ATPLogo scale={0.9}/>
        <div style={{background:C.redL,color:C.red,borderRadius:10,padding:'2px 10px',fontSize:11,fontWeight:700}}>ADMIN</div>
        <div style={{flex:1}}/>
        {alertasAct>0&&<div onClick={()=>setView('alertas')} style={{background:C.redL,border:`1px solid ${C.red}44`,borderRadius:20,padding:'3px 12px',fontSize:11,color:C.red,fontWeight:700,cursor:'pointer'}}>⚠️ {alertasAct} alerta{alertasAct>1?'s':''}</div>}
        {gestPend>0&&<div onClick={()=>setView('propietarios')} style={{background:C.orangeL,border:`1px solid ${C.orange}44`,borderRadius:20,padding:'3px 12px',fontSize:11,color:C.orange,fontWeight:700,cursor:'pointer'}}>🏗️ {gestPend} en gestión</div>}
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
          {!loading&&view==='lista'&&<PanelLista solicitudes={filtradas} filterEst={filterEst} setFilterEst={setFilterEst} filterOp={filterOp} setFilterOp={setFilterOp} onDetalle={setDetalleSol}/>}
          {!loading&&view==='propietarios'&&<GestionPropietarios solicitudes={solicitudes} onAutorizar={handleAutorizar} onReenviar={handleReenviarCorreo} showNotif={showNotif}/>}
          {!loading&&view==='alertas'&&<TabAlertas alertas={alertas} setAlertas={setAlertas} showNotif={showNotif}/>}
          {!loading&&view==='mapa'&&<TabMapa solicitudes={solicitudes}/>}
          {!loading&&view==='dashboard'&&<Dashboard solicitudes={solicitudes}/>}
          {!loading&&view==='colos'&&<TabColocalizaciones/>}
          {!loading&&view==='reporteria'&&<TabReporteria solicitudes={solicitudes}/>}
          {!loading&&view==='trabajadores'&&<TabTrabajadores trabajadores={trabajadores} setTrabajadores={setTrabajadores} showNotif={showNotif}/>}
          {!loading&&view==='reglas'&&<TabReglas/>}
        </div>
      </div>
      <div style={{background:C.white,borderTop:`1px solid ${C.border}`,padding:'7px 24px',fontSize:11,color:C.gray4,textAlign:'right'}}>ATP Chile · v1.0 · <span style={{color:C.red,fontWeight:600}}>Automatizado por PrimeCorp SpA ⚡</span></div>
    </div>
  )
}

// ── PANEL LISTA ────────────────────────────────────────────────
function PanelLista({solicitudes,filterEst,setFilterEst,filterOp,setFilterOp,onDetalle}){
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Panel de Solicitudes</h2>
        <span style={{fontSize:12,color:C.textS}}>Clic en cualquier solicitud para ver detalle completo</span>
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:14,marginBottom:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10}}>
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
          :solicitudes.map(s=><SolicitudCard key={s.id} s={s} onDetalle={onDetalle}/>)}
      </div>
    </div>
  )
}

// ── GESTIÓN PROPIETARIOS ───────────────────────────────────────
function GestionPropietarios({solicitudes,onAutorizar,onReenviar}){
  const pendientes=solicitudes.filter(s=>['Validado','En Gestión Propietario'].includes(s.estado))
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Gestión con Propietarios</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Solicitudes validadas esperando confirmación del propietario.</p>
      {pendientes.length===0&&<div style={{background:C.greenL,borderRadius:8,padding:24,textAlign:'center',color:C.green,fontWeight:700}}>✅ Sin solicitudes pendientes con propietarios</div>}
      {pendientes.map(s=>{
        const sitio=SITIOS.find(x=>x.id===s.sitio)
        return(
          <div key={s.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18,marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}><span style={{fontWeight:700,fontSize:14,color:C.red}}>{s.id}</span><Badge estado={s.estado}/></div>
                <div style={{fontSize:12,color:C.textS}}>{s.operador} · {s.empresaNombre||s.empresa}</div>
              </div>
              <div style={{textAlign:'right',fontSize:12}}><div style={{fontWeight:600}}>{s.trabajo}</div><div style={{color:C.blue}}>📅 {s.desde} → {s.hasta}</div></div>
            </div>
            {sitio&&<div style={{background:C.amberL,border:'1px solid #FFE082',borderRadius:4,padding:'10px 14px',marginBottom:10,fontSize:12}}>
              <div style={{fontWeight:600,color:C.amber,marginBottom:2}}>📍 {sitio.nombre} · {sitio.propietario}</div>
              <div style={{color:C.textS}}>📞 {sitio.tel} · ✉️ {sitio.emailPropietario}</div>
              {sitio.comentario&&<div style={{marginTop:4,fontStyle:'italic',color:C.orange}}>💬 {sitio.comentario}</div>}
            </div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>onAutorizar(s.id)} style={{background:C.green,color:'#fff',border:'none',borderRadius:4,padding:'7px 18px',fontWeight:700,cursor:'pointer',fontSize:12}}>✓ Autorizar acceso</button>
              <button onClick={()=>onReenviar(s)} style={{background:'transparent',color:C.red,border:`1px solid ${C.red}`,borderRadius:4,padding:'7px 14px',fontWeight:600,cursor:'pointer',fontSize:12}}>📧 Reenviar correo</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── ALERTAS ────────────────────────────────────────────────────
function TabAlertas({alertas,setAlertas,showNotif}){
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({sitio_id:'',tipo:'contractual',titulo:'',descripcion:''})
  const activas=alertas.filter(a=>a.estado==='activo')
  const resueltas=alertas.filter(a=>a.estado==='resuelto')

  async function agregar(){
    if(!form.sitio_id||!form.titulo) return
    const alerta={...form,id:`ALT${Date.now()}`,estado:'activo',added_by:'ATP',created_at:new Date().toISOString()}
    await upsertAlerta(alerta);setAlertas(a=>[alerta,...a]);setForm({sitio_id:'',tipo:'contractual',titulo:'',descripcion:''});setShowForm(false);showNotif('⚠️ Alerta agregada','success')
  }
  async function resolver(id){
    await resolverAlerta(id);setAlertas(a=>a.map(x=>x.id===id?{...x,estado:'resuelto'}:x));showNotif('✅ Alerta resuelta','success')
  }
  const inp={width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',fontSize:12,fontFamily:'inherit'}
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Alertas de Sitios</h2>
        <button onClick={()=>setShowForm(o=>!o)} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'7px 16px',fontWeight:700,cursor:'pointer',fontSize:12}}>+ Nueva alerta</button>
      </div>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Los operadores verán un pop-up al seleccionar un sitio con alerta activa.</p>
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
        <div style={{marginBottom:14}}><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Descripción (visible para el operador)</label><textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={3} style={{...inp,resize:'vertical'}}/></div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={agregar} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',fontWeight:700,cursor:'pointer',fontSize:13}}>Agregar</button>
          <button onClick={()=>setShowForm(false)} style={{background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',cursor:'pointer',fontSize:13}}>Cancelar</button>
        </div>
      </div>}
      <div style={{fontWeight:600,fontSize:13,color:C.red,marginBottom:10}}>⚠️ Activas ({activas.length})</div>
      {activas.length===0&&<div style={{background:C.greenL,borderRadius:6,padding:16,textAlign:'center',color:C.green,fontWeight:600,marginBottom:16}}>✅ No hay alertas activas</div>}
      {activas.map(a=>{const sitio=SITIOS.find(s=>s.id===a.sitio_id);return(
        <div key={a.id} style={{background:C.white,border:`1px solid ${a.tipo==='contractual'?C.red+'44':'#FFE082'}`,borderLeft:`4px solid ${a.tipo==='contractual'?C.red:C.amber}`,borderRadius:6,padding:16,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                <span style={{fontWeight:700,fontSize:13,color:a.tipo==='contractual'?C.red:C.amber}}>{a.tipo==='contractual'?'⚠️ Contractual':'📋 Documentación'}</span>
                <span style={{fontFamily:'monospace',fontSize:11,background:C.gray1,borderRadius:3,padding:'1px 7px'}}>{a.sitio_id}</span>
              </div>
              <div style={{fontWeight:600,fontSize:14}}>{a.titulo}</div>
              <div style={{fontSize:12,color:C.textS,marginTop:3}}>{a.descripcion}</div>
            </div>
            <div style={{fontSize:11,color:C.textS,flexShrink:0,marginLeft:12}}>{sitio?.nombre}</div>
          </div>
          <button onClick={()=>resolver(a.id)} style={{background:C.green,color:'#fff',border:'none',borderRadius:3,padding:'4px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Marcar como resuelto</button>
        </div>
      )})}
      {resueltas.length>0&&<div style={{marginTop:16}}><div style={{fontWeight:600,fontSize:12,color:C.textS,marginBottom:8}}>Resueltas ({resueltas.length})</div>{resueltas.map(a=><div key={a.id} style={{background:C.gray1,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',marginBottom:4,fontSize:12,color:C.gray4,textDecoration:'line-through'}}>{a.titulo} — {a.sitio_id}</div>)}</div>}
    </div>
  )
}

// ── MAPA CHILE ─────────────────────────────────────────────────
function TabMapa({solicitudes}){
  const [hover,setHover]=useState(null)
  const stats=solicitudes.reduce((acc,s)=>{if(!acc[s.sitio])acc[s.sitio]={total:0,aut:0,pend:0};acc[s.sitio].total++;if(s.estado==='Autorizado')acc[s.sitio].aut++;if(['En Gestión Propietario','Validado'].includes(s.estado))acc[s.sitio].pend++;return acc},{})

  // Coordenadas SVG para mapa Chile (viewport 240x680)
  const toSVG=(lat,lng)=>({
    x: Math.round(((lng-(-75.5))/(-65.8-(-75.5)))*180+30),
    y: Math.round(((lat-(-17.5))/(-55.5-(-17.5)))*600+20)
  })

  // Regiones de Chile simplificadas (paths SVG)
  const REGIONES=[
    {id:'XV', name:'Arica y Parinacota', color:'#BBDEFB', path:'M 95,20 L 115,20 L 118,55 L 97,55 Z'},
    {id:'I',  name:'Tarapacá',          color:'#90CAF9', path:'M 95,55 L 118,55 L 120,95 L 96,95 Z'},
    {id:'II', name:'Antofagasta',        color:'#64B5F6', path:'M 94,95 L 120,95 L 122,155 L 93,155 Z'},
    {id:'III',name:'Atacama',            color:'#42A5F5', path:'M 93,155 L 122,155 L 123,200 L 91,200 Z'},
    {id:'IV', name:'Coquimbo',           color:'#2196F3', path:'M 91,200 L 123,200 L 122,235 L 89,235 Z'},
    {id:'V',  name:'Valparaíso',         color:'#1E88E5', path:'M 89,235 L 122,235 L 121,260 L 87,260 Z'},
    {id:'XIII',name:'Metropolitana',     color:'#1565C0', path:'M 87,260 L 121,260 L 120,285 L 85,285 Z'},
    {id:'VI', name:"O'Higgins",          color:'#1976D2', path:'M 85,285 L 120,285 L 118,310 L 83,310 Z'},
    {id:'VII',name:'Maule',              color:'#2196F3', path:'M 83,310 L 118,310 L 115,345 L 80,345 Z'},
    {id:'XVI',name:'Ñuble',              color:'#42A5F5', path:'M 80,345 L 115,345 L 112,365 L 77,365 Z'},
    {id:'VIII',name:'Biobío',            color:'#64B5F6', path:'M 77,365 L 112,365 L 108,400 L 73,400 Z'},
    {id:'IX', name:'Araucanía',          color:'#90CAF9', path:'M 73,400 L 108,400 L 103,435 L 68,435 Z'},
    {id:'XIV',name:'Los Ríos',           color:'#BBDEFB', path:'M 68,435 L 103,435 L 97,460 L 62,460 Z'},
    {id:'X',  name:'Los Lagos',          color:'#E3F2FD', path:'M 62,460 L 97,460 L 90,510 L 55,510 Z'},
    {id:'XI', name:'Aysén',              color:'#ECEFF1', path:'M 55,510 L 90,510 L 83,560 L 47,560 Z'},
    {id:'XII',name:'Magallanes',         color:'#F5F5F5', path:'M 47,560 L 83,560 L 78,620 L 40,620 Z'},
  ]

  const hSitio = hover ? SITIOS.find(s=>s.id===hover) : null
  const hStats = hover ? (stats[hover]||{total:0,aut:0,pend:0}) : null

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Mapa de Sitios Chile</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Distribución por región. Pasa el cursor sobre un sitio para ver detalles.</p>
      <div style={{display:'flex',gap:16}}>
        <div style={{width:180,flexShrink:0}}>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:12,marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Leyenda sitios</div>
            {[['#43A047','Con accesos autorizados'],['#FB8C00','Con solicitudes pendientes'],['#1565C0','Sin actividad reciente']].map(([c,l])=><div key={l} style={{display:'flex',gap:6,alignItems:'center',marginBottom:5,fontSize:11}}><div style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0}}/><span style={{color:C.textS}}>{l}</span></div>)}
          </div>
          {hSitio&&<div style={{background:C.white,border:`1px solid ${C.blue}`,borderRadius:6,padding:12,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:12,color:C.red,marginBottom:6}}>{hSitio.id}</div>
            <div style={{fontWeight:600,fontSize:12,marginBottom:4}}>{hSitio.nombre}</div>
            <div style={{fontSize:11,color:C.textS,marginBottom:2}}>{hSitio.tipo} · {hSitio.altTotal}m</div>
            <div style={{fontSize:11,color:C.textS,marginBottom:6}}>{hSitio.regionLabel}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
              {[['Total',hStats.total,C.blue],['Aut.',hStats.aut,C.green],['Pend.',hStats.pend,C.orange]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center',background:C.gray1,borderRadius:3,padding:4}}>
                  <div style={{fontWeight:800,fontSize:16,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:C.textS}}>{l}</div>
                </div>
              ))}
            </div>
          </div>}
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:12}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Resumen</div>
            {[['Total sitios',SITIOS.length],['Con actividad',Object.keys(stats).length],['Autorizados',solicitudes.filter(s=>s.estado==='Autorizado').length],['Pendientes',solicitudes.filter(s=>['En Gestión Propietario','Validado'].includes(s.estado)).length]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}><span style={{color:C.textS}}>{l}</span><strong>{v}</strong></div>
            ))}
          </div>
        </div>
        <div style={{flex:1,background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden',position:'relative'}}>
          <svg viewBox="0 0 240 650" width="100%" style={{display:'block',background:'#EEF7FF',maxHeight:640}}>
            {REGIONES.map(r=>(
              <path key={r.id} d={r.path} fill={r.color} stroke="white" strokeWidth="1.5" opacity="0.9"/>
            ))}
            {REGIONES.map(r=>{
              const pt={x:parseInt(r.path.match(/M (\d+)/)[1])+10,y:parseInt(r.path.match(/L \d+,(\d+)/)[1])-5}
              return <text key={r.id+'-t'} x={pt.x} y={pt.y+18} fontSize="7" fill="#555" fontWeight="600">{r.id}</text>
            })}
            {SITIOS.map(s=>{
              const pt=toSVG(s.lat,s.lng),st=stats[s.id]||{},isH=hover===s.id
              const color=st.aut>0?'#43A047':st.pend>0?'#FB8C00':'#1565C0'
              return(
                <g key={s.id} onMouseEnter={()=>setHover(s.id)} onMouseLeave={()=>setHover(null)} style={{cursor:'pointer'}}>
                  <circle cx={pt.x} cy={pt.y} r={isH?9:6} fill={color} stroke="white" strokeWidth={isH?2.5:1.5} opacity={0.95}/>
                  {isH&&<circle cx={pt.x} cy={pt.y} r={14} fill={color} opacity={0.15}/>}
                </g>
              )
            })}
          </svg>
        </div>
        <div style={{width:200,flexShrink:0}}>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:12,marginBottom:10}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:10}}>Sitios por región</div>
            {Object.entries(SITIOS.reduce((acc,s)=>{acc[s.regionLabel]=(acc[s.regionLabel]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).map(([r,n])=>(
              <div key={r} style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:11}}>
                <span style={{color:C.textS}}>{r}</span>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:n*14,height:6,background:C.blue,borderRadius:3,minWidth:6}}/>
                  <strong>{n}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────────────
function Dashboard({solicitudes}){
  const total=solicitudes.length||1
  const aut=solicitudes.filter(s=>s.estado==='Autorizado').length
  const rech=solicitudes.filter(s=>s.estado==='Rechazado').length
  const gestPend=solicitudes.filter(s=>['En Gestión Propietario','Validado'].includes(s.estado)).length
  const tiempos=solicitudes.filter(s=>s.tsEnviado&&s.tsAutorizado).map(s=>new Date(s.tsAutorizado)-new Date(s.tsEnviado))
  const promMs=tiempos.length?tiempos.reduce((a,b)=>a+b,0)/tiempos.length:0

  const estadoData=Object.keys(ESTADO_COLOR).map(e=>({name:e,value:solicitudes.filter(s=>s.estado===e).length,color:ESTADO_COLOR[e]?.bg||C.gray4})).filter(d=>d.value>0)
  const opData=OPERADORES.map(op=>({op:OP_SHORT[op],total:solicitudes.filter(s=>s.operador===op).length,aut:solicitudes.filter(s=>s.operador===op&&s.estado==='Autorizado').length,color:OP_COLOR[op]})).filter(d=>d.total>0)
  const tiemposPorOp=OPERADORES.map(op=>{const ts=solicitudes.filter(s=>s.operador===op&&s.tsEnviado&&s.tsAutorizado).map(s=>new Date(s.tsAutorizado)-new Date(s.tsEnviado));return{op:OP_SHORT[op],ms:ts.length?ts.reduce((a,b)=>a+b,0)/ts.length:0,color:OP_COLOR[op]}}).filter(d=>d.ms>0)
  const weeklyData=[{sem:'S1 Feb',aut:6,rech:1},{sem:'S2 Feb',aut:8,rech:2},{sem:'S3 Feb',aut:7,rech:1},{sem:'S4 Feb',aut:10,rech:2},{sem:'S1 Mar',aut:9,rech:1},{sem:'S2 Mar',aut:aut||1,rech:rech||0}]

  const TT=({active,payload,label})=>active&&payload?.length?<div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',fontSize:12}}><div style={{fontWeight:600,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color||C.text}}>{p.name}: <strong>{p.value}</strong></div>)}</div>:null

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Dashboard KPIs</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>{new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <KpiCard icon="📋" value={solicitudes.length} label="Total" color={C.blue}/>
        <KpiCard icon="✅" value={aut} label="Autorizadas" color={C.green} sub={`${Math.round(aut/total*100)}%`}/>
        <KpiCard icon="⏳" value={gestPend} label="En gestión" color={C.orange}/>
        <KpiCard icon="❌" value={rech} label="Rechazadas" color={C.red}/>
        <KpiCard icon="⚡" value={`${Math.round(solicitudes.filter(s=>s.auto).length/total*100)}%`} label="Automatizadas" color={C.purple}/>
        <KpiCard icon="⏱️" value={promMs>0?formatDuration(promMs):'—'} label="Prom. autorización" color={C.teal} sub="envío → autorizado"/>
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
          <ResponsiveContainer width="100%" height={150}><BarChart data={opData} margin={{left:-20,bottom:0,top:5,right:5}}><XAxis dataKey="op" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TT/>}/><Bar dataKey="total" name="Total" radius={[3,3,0,0]}>{opData.map((d,i)=><Cell key={i} fill={d.color+'88'}/>)}</Bar><Bar dataKey="aut" name="Autorizadas" radius={[3,3,0,0]}>{opData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar></BarChart></ResponsiveContainer>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>⏱️ Tiempo promedio de autorización</div>
          {tiemposPorOp.length>0
            ?<>{tiemposPorOp.map(d=><div key={d.op} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:60,fontSize:12,fontWeight:700,color:d.color}}>{d.op}</div>
                <div style={{flex:1,background:C.gray2,borderRadius:4,height:20,position:'relative'}}>
                  <div style={{position:'absolute',left:0,top:0,height:'100%',background:d.color,borderRadius:4,width:`${Math.min(100,d.ms/Math.max(...tiemposPorOp.map(x=>x.ms))*100)}%`}}/>
                </div>
                <div style={{width:60,fontSize:12,fontWeight:700,color:d.color,textAlign:'right'}}>{formatDuration(d.ms)}</div>
              </div>)}
            </>
            :<div style={{textAlign:'center',color:C.gray4,padding:20,fontSize:13}}>Sin datos aún — aparecerán cuando se autoricen solicitudes</div>
          }
        </div>
      </div>
    </div>
  )
}

// ── COLOCALIZACIONES ───────────────────────────────────────────
function TabColocalizaciones(){
  const [busq,setBusq]=useState('')
  const [editSitio,setEditSitio]=useState(null)
  const [sitiosData,setSitiosData]=useState(()=>{try{const s=localStorage.getItem('atp_sitios_data');return s?JSON.parse(s):null}catch{return null}})

  function getSitioData(id){return sitiosData?.[id]||{}}
  function updateSitio(id,patch){
    const nuevo={...(sitiosData||{})}
    nuevo[id]={...(nuevo[id]||{}), ...patch}
    setSitiosData(nuevo)
    try{localStorage.setItem('atp_sitios_data',JSON.stringify(nuevo))}catch{}
  }

  const filtrado=SITIOS.filter(s=>s.id.toLowerCase().includes(busq.toLowerCase())||s.nombre.toLowerCase().includes(busq.toLowerCase())||(COLOCALIZACIONES[s.id]||[]).some(op=>op.toLowerCase().includes(busq.toLowerCase())))

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      {editSitio&&<EditContactoModal sitio={editSitio} extra={getSitioData(editSitio.id)} onSave={p=>{updateSitio(editSitio.id,p);setEditSitio(null)}} onClose={()=>setEditSitio(null)}/>}
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Colocalizaciones por Sitio</h2>
      <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar por sitio, operador, región..." style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 14px',fontSize:13,marginBottom:14,fontFamily:'inherit'}}/>
      <div style={{fontSize:11,color:C.textS,marginBottom:12}}>{filtrado.length} de {SITIOS.length} sitios</div>
      {filtrado.map(s=>{
        const ops=COLOCALIZACIONES[s.id]||[]
        const extra=getSitioData(s.id)
        return(
          <div key={s.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'14px 18px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span>
                  <span style={{fontSize:11,color:C.textS,background:C.gray1,borderRadius:3,padding:'1px 7px'}}>{s.siterra}</span>
                  <span style={{fontSize:11,color:C.textS}}>{s.tipo} · {s.altTotal}m</span>
                </div>
                <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{s.nombre}</div>
                <div style={{fontSize:12,color:C.textS}}>{s.comuna} · {s.regionLabel}</div>
              </div>
              <button onClick={()=>setEditSitio(s)} style={{background:C.blue,color:'#fff',border:'none',borderRadius:4,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>✏️ Editar contacto</button>
            </div>
            {/* Propietario */}
            <div style={{background:C.amberL,border:'1px solid #FFE082',borderRadius:4,padding:'8px 12px',marginBottom:8,fontSize:12}}>
              <div style={{fontWeight:600,color:C.amber,marginBottom:3}}>🏠 Propietario</div>
              <div><strong>{extra.propietario||s.propietario}</strong></div>
              <div style={{color:C.textS,marginTop:2}}>
                📞 {extra.tel||s.tel} &nbsp;·&nbsp; ✉️ {extra.email||s.emailPropietario||'—'}
              </div>
              {(extra.comentario||s.comentario)&&<div style={{marginTop:4,fontStyle:'italic',color:C.orange}}>💬 {extra.comentario||s.comentario}</div>}
            </div>
            {/* Colocalizados */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:11,color:C.textS,fontWeight:600}}>Colocalizados:</span>
              {ops.length===0?<span style={{fontSize:11,color:C.gray4}}>Sin registros</span>
                :ops.map(op=><span key={op} style={{background:OP_COLOR[op]+'22',border:`1px solid ${OP_COLOR[op]}55`,color:OP_COLOR[op],borderRadius:10,padding:'2px 10px',fontSize:11,fontWeight:700}}>{OP_SHORT[op]||op}</span>)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EditContactoModal({sitio,extra,onSave,onClose}){
  const [form,setForm]=useState({propietario:extra.propietario||sitio.propietario||'',tel:extra.tel||sitio.tel||'',email:extra.email||sitio.emailPropietario||'',comentario:extra.comentario||sitio.comentario||''})
  const inp={width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',fontSize:13,fontFamily:'inherit'}
  return(
    <div style={{position:'fixed',inset:0,background:'#00000066',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:20}}>
      <div style={{background:'#fff',borderRadius:10,padding:28,maxWidth:440,width:'100%',boxShadow:'0 8px 32px #0003'}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>✏️ Editar contacto</div>
        <div style={{fontSize:12,color:C.textS,marginBottom:16}}>{sitio.id} — {sitio.nombre}</div>
        {[['Propietario','propietario','Nombre del propietario'],['Teléfono','tel','+56 X XXXX XXXX'],['Correo','email','correo@propietario.cl'],['Comentarios','comentario','Ej: Solo responde WhatsApp, lunes a viernes']].map(([l,k,ph])=>(
          <div key={k} style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textS,marginBottom:4}}>{l}</label>
            {k==='comentario'
              ?<textarea value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} rows={3} style={{...inp,resize:'vertical'}}/>
              :<input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={inp}/>}
          </div>
        ))}
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button onClick={()=>onSave(form)} style={{flex:1,background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'9px 0',fontWeight:700,cursor:'pointer'}}>Guardar</button>
          <button onClick={onClose} style={{flex:1,background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:4,padding:'9px 0',cursor:'pointer'}}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── REPORTERÍA ─────────────────────────────────────────────────
function TabReporteria({solicitudes}){
  function descargarCSV(){
    const h=['ID','Ref Cliente','Operador','Empresa','RUT Empresa','Trabajo','Sitio','Nombre Sitio','Desde','Hasta','Dias','Estado','Auto','T.Aut.(min)','Correo Mandante','Correo Contratista','N° Técnicos']
    const r=solicitudes.map(s=>{
      const sitio=SITIOS.find(x=>x.id===s.sitio)
      const dias=s.desde&&s.hasta?daysBetween(s.desde,s.hasta):''
      const tAut=s.tsEnviado&&s.tsAutorizado?Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/60000):''
      return[s.id,s.refCliente||'',s.operador,s.empresaNombre||s.empresa,s.empresa||'',s.trabajo,s.sitio,sitio?.nombre||'',s.desde||'',s.hasta||'',dias,s.estado,s.auto?'Sí':'No',tAut,s.correoMandante||'',s.correoContratista||'',s.trabajadores?.length||0]
    })
    const csv=[h,...r].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const bom='\uFEFF'
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bom+csv],{type:'text/csv;charset=utf-8'}));a.download=`ATP_Reporte_${todayISO()}.csv`;a.click()
  }

  function descargarJSON(){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(solicitudes,null,2)],{type:'application/json'}));a.download=`ATP_Datos_${todayISO()}.json`;a.click()
  }

  // Estadísticas rápidas para mostrar
  const total=solicitudes.length||1
  const aut=solicitudes.filter(s=>s.estado==='Autorizado').length
  const tiempos=solicitudes.filter(s=>s.tsEnviado&&s.tsAutorizado).map(s=>Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/60000))
  const promMin=tiempos.length?Math.round(tiempos.reduce((a,b)=>a+b,0)/tiempos.length):null

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Reportería y Exportación</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 20px'}}>Descarga informes del sistema.</p>
      {/* Resumen */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:16,marginBottom:16}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Resumen período</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[['Total solicitudes',solicitudes.length,C.blue],['Autorizadas',aut+' ('+Math.round(aut/total*100)+'%)',C.green],['Rechazadas',solicitudes.filter(s=>s.estado==='Rechazado').length,C.red],['T. prom. aut.',promMin!==null?promMin+' min':'—',C.teal]].map(([l,v,c])=>(
            <div key={l} style={{background:C.gray1,borderRadius:4,padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontWeight:800,fontSize:20,color:c}}>{v}</div>
              <div style={{fontSize:10,color:C.textS,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Descarga */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        {[
          {icon:'📊',label:'CSV',desc:'Compatible con Excel, Sheets, Numbers',onClick:descargarCSV,ok:true,color:C.green},
          {icon:'🔧',label:'JSON',desc:'Para integración con sistemas externos',onClick:descargarJSON,ok:true,color:C.blue},
        ].map(f=>(
          <div key={f.label} style={{background:C.white,border:`1px solid ${f.color}44`,borderRadius:6,padding:16}}>
            <div style={{fontSize:28,marginBottom:6}}>{f.icon}</div>
            <div style={{fontWeight:700,fontSize:14}}>{f.label}</div>
            <div style={{fontSize:12,color:C.textS,marginBottom:12}}>{f.desc}</div>
            <button onClick={f.onClick} style={{background:f.color,color:'#fff',border:'none',borderRadius:4,padding:'7px 20px',fontSize:12,fontWeight:700,cursor:'pointer'}}>⬇️ Descargar</button>
          </div>
        ))}
      </div>
      {/* Tabla preview */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
        <div style={{background:C.gray1,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,fontWeight:600,fontSize:13}}>Vista previa ({solicitudes.length} registros)</div>
        {solicitudes.length===0?<div style={{padding:32,textAlign:'center',color:C.textS}}>Sin solicitudes aún</div>:
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:C.gray2}}>{['ID','Operador','Trabajo','Sitio','Fechas','Estado','T.Aut.'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:C.textS,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
            <tbody>{solicitudes.map((s,i)=>{
              const ms=s.tsEnviado&&s.tsAutorizado?new Date(s.tsAutorizado)-new Date(s.tsEnviado):null
              return<tr key={s.id} style={{borderBottom:`1px solid ${C.gray2}`,background:i%2===0?C.white:C.gray1}}>
                <td style={{padding:'7px 12px',fontFamily:'monospace',fontSize:11,color:C.red,fontWeight:600}}>{s.id}</td>
                <td style={{padding:'7px 12px'}}>{OP_SHORT[s.operador]||s.operador}</td>
                <td style={{padding:'7px 12px',fontSize:11}}>{s.trabajo}</td>
                <td style={{padding:'7px 12px',fontFamily:'monospace',fontSize:11}}>{s.sitio}</td>
                <td style={{padding:'7px 12px',fontSize:11,whiteSpace:'nowrap'}}>{s.desde} → {s.hasta}</td>
                <td style={{padding:'7px 12px'}}><Badge estado={s.estado} small/></td>
                <td style={{padding:'7px 12px',fontSize:11,color:C.teal,fontWeight:600}}>{ms?formatDuration(ms):'—'}</td>
              </tr>
            })}</tbody>
          </table>
        </div>}
      </div>
    </div>
  )
}

// ── TRABAJADORES ───────────────────────────────────────────────
function TabTrabajadores({trabajadores,setTrabajadores,showNotif}){
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({rut:'',nombre:'',empresa_rut:'',empresa_nombre:'',operador:'',acreditado:true,motivo_no_acreditado:'',vencimiento:''})
  const [busq,setBusq]=useState('')
  const [editId,setEditId]=useState(null)
  const [filterAcr,setFilterAcr]=useState('')
  const today=todayISO()

  function handleRut(v){const raw=v.replace(/[^0-9kK]/gi,'');setForm(f=>({...f,rut:raw.length>=2?formatRUT(raw):raw.toUpperCase()}))}

  async function guardar(){
    if(!form.rut||!form.nombre){showNotif('RUT y nombre son obligatorios','error');return}
    const existe=trabajadores.find(t=>t.rut===form.rut&&t.id!==editId)
    if(existe){showNotif('Ya existe un trabajador con ese RUT: '+existe.nombre,'error');return}
    const t={id:editId||`TRB${Date.now()}`,rut:form.rut,nombre:form.nombre,empresa_rut:form.empresa_rut,empresa_nombre:form.empresa_nombre,operador:form.operador,acreditado:form.acreditado,motivo_no_acreditado:form.motivo_no_acreditado,vencimiento:form.vencimiento||null,updated_at:new Date().toISOString()}
    await upsertTrabajador(t)
    if(editId) setTrabajadores(ts=>ts.map(x=>x.id===editId?t:x))
    else setTrabajadores(ts=>[t,...ts])
    setShowForm(false);setEditId(null);setForm({rut:'',nombre:'',empresa_rut:'',empresa_nombre:'',operador:'',acreditado:true,motivo_no_acreditado:'',vencimiento:''})
    showNotif(editId?'✅ Trabajador actualizado':'✅ Trabajador agregado','success')
  }

  async function eliminar(id){
    if(!confirm('¿Eliminar este trabajador?')) return
    await deleteTrabajador(id);setTrabajadores(ts=>ts.filter(t=>t.id!==id));showNotif('🗑️ Trabajador eliminado','success')
  }

  function editar(t){setForm({rut:t.rut,nombre:t.nombre,empresa_rut:t.empresa_rut||'',empresa_nombre:t.empresa_nombre||'',operador:t.operador||'',acreditado:t.acreditado,motivo_no_acreditado:t.motivo_no_acreditado||'',vencimiento:t.vencimiento||''});setEditId(t.id);setShowForm(true)}

  const filtrados=trabajadores.filter(t=>(filterAcr===''||String(t.acreditado)===(filterAcr==='si'?'true':'false'))&&(!busq||t.nombre.toLowerCase().includes(busq.toLowerCase())||t.rut.includes(busq)||t.empresa_nombre?.toLowerCase().includes(busq.toLowerCase())))

  // Auto-check vencimiento
  const vencidos=trabajadores.filter(t=>t.vencimiento&&t.vencimiento<today&&t.acreditado)
  
  const inp={width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',fontSize:12,fontFamily:'inherit'}

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Trabajadores Acreditados</h2>
        <button onClick={()=>{setShowForm(o=>!o);setEditId(null);setForm({rut:'',nombre:'',empresa_rut:'',empresa_nombre:'',operador:'',acreditado:true,motivo_no_acreditado:'',vencimiento:''})}} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'7px 16px',fontWeight:700,cursor:'pointer',fontSize:12}}>+ Agregar trabajador</button>
      </div>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 12px'}}>Base de datos de técnicos. El sistema verifica automáticamente la acreditación al enviar una solicitud.</p>

      {vencidos.length>0&&<div style={{background:'#FFF3E0',border:`1px solid ${C.orange}55`,borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:12,color:C.orange}}>
        ⚠️ <strong>{vencidos.length} trabajador(es)</strong> con vencimiento pasado: {vencidos.map(t=>t.nombre).join(', ')}. Considera actualizar su estado.
      </div>}

      {showForm&&<div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:20,marginBottom:16}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>{editId?'✏️ Editar trabajador':'➕ Nuevo trabajador'}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div><label style={{fontSize:11,fontWeight:600,color:C.textS,display:'block',marginBottom:4}}>RUT <span style={{color:C.red}}>*</span></label><input value={form.rut} onChange={e=>handleRut(e.target.value)} placeholder="12.345.678-9" style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.textS,display:'block',marginBottom:4}}>Nombre completo <span style={{color:C.red}}>*</span></label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Juan Pérez" style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.textS,display:'block',marginBottom:4}}>Empresa contratista</label><input value={form.empresa_nombre} onChange={e=>setForm(f=>({...f,empresa_nombre:e.target.value}))} placeholder="Nombre empresa" style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.textS,display:'block',marginBottom:4}}>Mandante</label>
            <select value={form.operador} onChange={e=>setForm(f=>({...f,operador:e.target.value}))} style={inp}>
              <option value="">Todos los operadores</option>
              {['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.textS,display:'block',marginBottom:4}}>Vencimiento documentos</label><input type="date" value={form.vencimiento} onChange={e=>setForm(f=>({...f,vencimiento:e.target.value}))} style={inp}/></div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.textS,display:'block',marginBottom:4}}>Estado</label>
            <div style={{display:'flex',gap:10}}>
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
                <input type="radio" checked={form.acreditado} onChange={()=>setForm(f=>({...f,acreditado:true}))}/>
                <span style={{color:C.green,fontWeight:700}}>✓ Acreditado</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
                <input type="radio" checked={!form.acreditado} onChange={()=>setForm(f=>({...f,acreditado:false}))}/>
                <span style={{color:C.red,fontWeight:700}}>✗ No acreditado</span>
              </label>
            </div>
          </div>
        </div>
        {!form.acreditado&&<div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:600,color:C.textS,display:'block',marginBottom:4}}>Motivo (visible para el operador)</label><input value={form.motivo_no_acreditado} onChange={e=>setForm(f=>({...f,motivo_no_acreditado:e.target.value}))} placeholder="Ej: Documentos vencidos, certificación pendiente" style={inp}/></div>}
        <div style={{display:'flex',gap:10}}>
          <button onClick={guardar} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',fontWeight:700,cursor:'pointer',fontSize:13}}>{editId?'Actualizar':'Agregar'}</button>
          <button onClick={()=>{setShowForm(false);setEditId(null)}} style={{background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',cursor:'pointer',fontSize:13}}>Cancelar</button>
        </div>
      </div>}

      {/* Filtros */}
      <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar por nombre, RUT o empresa..." style={{flex:1,minWidth:200,border:`1px solid ${C.border}`,borderRadius:4,padding:'7px 12px',fontSize:12,fontFamily:'inherit'}}/>
        {['','si','no'].map(v=>(
          <button key={v} onClick={()=>setFilterAcr(v)} style={{background:filterAcr===v?C.red:'transparent',color:filterAcr===v?'#fff':C.textS,border:`1px solid ${filterAcr===v?C.red:C.border}`,borderRadius:20,padding:'5px 14px',fontSize:11,fontWeight:600,cursor:'pointer'}}>
            {v===''?'Todos':v==='si'?'✓ Acreditados':'✗ No acreditados'} ({v===''?trabajadores.length:trabajadores.filter(t=>String(t.acreditado)===(v==='si'?'true':'false')).length})
          </button>
        ))}
      </div>

      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
        <div style={{background:C.gray1,padding:'9px 14px',borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.textS}}>{filtrados.length} trabajadores</div>
        {filtrados.length===0?<div style={{padding:32,textAlign:'center',color:C.textS}}>No hay trabajadores que coincidan</div>:
        filtrados.map(t=>(
          <div key={t.id} style={{padding:'12px 16px',borderBottom:`1px solid ${C.gray2}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:!t.acreditado?'#FFF8F8':t.vencimiento&&t.vencimiento<today?'#FFF8E1':C.white}}>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:t.acreditado?C.greenL:C.redL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{t.acreditado?'✓':'✗'}</div>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{t.nombre}</div>
                <div style={{fontSize:11,color:C.textS,fontFamily:'monospace'}}>{t.rut}</div>
                <div style={{fontSize:11,color:C.textS}}>{t.empresa_nombre||'—'} {t.operador&&`· ${OP_SHORT[t.operador]||t.operador}`}</div>
                {t.vencimiento&&<div style={{fontSize:10,color:t.vencimiento<today?C.red:C.green}}>📅 Vence: {t.vencimiento} {t.vencimiento<today?'⚠️ VENCIDO':''}</div>}
                {!t.acreditado&&t.motivo_no_acreditado&&<div style={{fontSize:11,color:C.red,marginTop:2}}>⚠️ {t.motivo_no_acreditado}</div>}
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <span style={{background:t.acreditado?C.greenL:C.redL,color:t.acreditado?C.green:C.red,borderRadius:10,padding:'3px 10px',fontSize:11,fontWeight:700}}>{t.acreditado?'ACREDITADO':'NO ACREDITADO'}</span>
              <button onClick={()=>editar(t)} style={{background:C.blueL,color:C.blue,border:'none',borderRadius:3,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer'}}>✏️</button>
              <button onClick={()=>eliminar(t.id)} style={{background:C.redL,color:C.red,border:'none',borderRadius:3,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer'}}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── REGLAS ─────────────────────────────────────────────────────
function TabReglas(){
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Reglas del Motor de Validación</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 20px'}}>Aplicadas automáticamente por PrimeCorp en cada solicitud en menos de 1 segundo.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:C.red}}>⏱️ Ventanas máximas por trabajo</div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:C.gray1}}>{['Tipo','Días máx.'].map(h=><th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:11,color:C.textS,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{TIPOS_TRABAJO.map((t,i)=><tr key={t} style={{borderBottom:`1px solid ${C.gray2}`,background:i%2===0?C.white:C.gray1}}>
              <td style={{padding:'7px 10px',fontSize:11,fontWeight:600}}>{t}</td>
              <td style={{padding:'7px 10px',fontSize:16,fontWeight:800,color:C.red}}>{VENTANA_MAX[t]}d</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:C.red}}>📋 Validaciones automáticas</div>
          {[['📅','Fechas futuras','No se permiten fechas anteriores al día de hoy'],['🔒','Conflicto de fechas','Nadie puede reservar fechas ya tomadas en el mismo sitio'],['⏱️','Ventana máxima','Duración no puede exceder máximo por tipo de trabajo'],['👷','Acreditación','Técnico debe estar registrado y acreditado'],['📧','Correos obligatorios','Mandante + contratista son obligatorios'],['📝','Técnico obligatorio','Al menos 1 técnico con nombre y RUT'],['🏢','Sitios colocalizados','Solo aparecen sitios donde el operador está colocalizado'],['🔑','RUT formato','Formato automático XX.XXX.XXX-X']].map(([ic,t,d])=>(
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
