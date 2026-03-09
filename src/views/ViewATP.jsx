import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { supabase, getSolicitudes, updateEstado, getAlertas, upsertAlerta, resolverAlerta, getTrabajadores, upsertTrabajador, deleteTrabajador, getEmpresas, upsertEmpresa, getSitiosConfig, upsertSitioConfig, fromDb } from '../lib/supabase.js'
import { enviarCorreoPropietario } from '../lib/email.js'
import { SITIOS, COLOCALIZACIONES, TIPOS_TRABAJO, VENTANA_MAX, TRABAJO_INFORMAL, ESTADOS, ESTADO_COLOR, C, OP_COLOR, OP_SHORT, OPERADORES, daysBetween, formatRUT, validRUT, todayISO } from '../shared/data.js'
import { ATPLogo, Badge, AutoPill, FlowTracker, KpiCard, Notif, GlobalStyle } from '../shared/components.jsx'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts'

// Helper inline para evitar problemas de bundling
const fmtDur = (ms) => {
  if (!ms || ms <= 0) return '—'
  const m = Math.round(ms / 60000)
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60), rm = m % 60
  if (h < 24) return rm > 0 ? h + 'h ' + rm + 'm' : h + 'h'
  return Math.floor(h / 24) + 'd'
}


export default function ViewATP({ user, onLogout }) {
  const [view, setView]            = useState('lista')
  const [solicitudes, setSolicitudes] = useState([])
  const [alertas, setAlertas]      = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [empresas, setEmpresas]    = useState([])
  const [loading, setLoading]      = useState(true)
  const [notif, setNotif]          = useState(null)
  const [detalleSol, setDetalleSol] = useState(null)
  const [filterEst, setFilterEst]  = useState('')
  const [filterOp, setFilterOp]    = useState('')

  function showNotif(msg,type='success'){setNotif({msg,type});setTimeout(()=>setNotif(null),5000)}

  async function cargar() {
    const [sols, alts, trabs, emps] = await Promise.all([getSolicitudes(), getAlertas(), getTrabajadores(), getEmpresas()])
    setSolicitudes(sols.map(fromDb))
    setAlertas(alts)
    setTrabajadores(trabs)
    setEmpresas(emps)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const ch1 = supabase.channel('atp-s').on('postgres_changes',{event:'*',schema:'public',table:'solicitudes'},cargar).subscribe()
    const ch2 = supabase.channel('atp-a').on('postgres_changes',{event:'*',schema:'public',table:'alertas'},cargar).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  },[])

  async function handleAutorizar(id) {
    const sol = solicitudes.find(s=>s.id===id)
    if(!sol) return
    const hist = [...(sol.historial||[]),{estado:'Autorizado',fecha:new Date().toLocaleString('es-CL'),auto:false}]
    const tsAut = new Date().toISOString()
    // 1) Optimistic: mostrar cambio de inmediato
    setSolicitudes(prev => prev.map(s => s.id===id ? {...s,estado:'Autorizado',historial:hist,tsAutorizado:tsAut} : s))
    // 2) Guardar en DB
    const ok = await updateEstado(id,'Autorizado',{historial:hist})
    console.log('handleAutorizar - updateEstado result:', ok)
    // 3) Verificar desde DB
    const { data: dbRow, error: dbErr } = await supabase.from('solicitudes').select('estado').eq('id',id).single()
    console.log('handleAutorizar - DB estado actual:', dbRow?.estado, dbErr)
    showNotif('✅ Acceso autorizado')
  }

  const gestPend  = solicitudes.filter(s=>['Validado','En Gestión Propietario'].includes(s.estado)).length
  const altActivas = alertas.filter(a=>a.estado==='activo').length
  const filtradas = solicitudes.filter(s=>(!filterEst||s.estado===filterEst)&&(!filterOp||s.operador===filterOp))

  const NAV = [
    {id:'lista',      icon:'🏠', label:'Panel de Accesos'},
    {id:'propietarios',icon:'🏗️',label:'Gestión Propietarios', badge:gestPend},
    {id:'alertas',    icon:'⚠️', label:'Alertas de Sitios', badge:altActivas, badgeColor:C.red},
    {id:'mapa',       icon:'🗺️', label:'Mapa de Chile'},
    {id:'dashboard',  icon:'📊', label:'Dashboard KPIs'},
    {id:'colos',      icon:'📡', label:'Colocalizaciones'},
    {id:'reporteria', icon:'📥', label:'Reportería'},
    {id:'trabajadores',icon:'👷',label:'Trabajadores'},
    {id:'reglas',     icon:'⚙️', label:'Reglas del Motor'},
  ]

  return (
    <div style={{background:C.gray1,minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',Arial,sans-serif",color:C.text}}>
      <GlobalStyle/>
      <Notif notif={notif}/>
      {detalleSol && <DetalleModal sol={detalleSol} onClose={()=>setDetalleSol(null)}/>}

      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:52,display:'flex',alignItems:'center',padding:'0 20px',gap:12,position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px #0001'}}>
        <ATPLogo scale={0.9}/>
        <div style={{background:C.redL,color:C.red,borderRadius:10,padding:'2px 10px',fontSize:11,fontWeight:700}}>ADMIN</div>
        <div style={{flex:1}}/>
        {altActivas>0&&<div onClick={()=>setView('alertas')} style={{background:C.redL,border:`1px solid ${C.red}44`,borderRadius:20,padding:'3px 12px',fontSize:11,color:C.red,fontWeight:700,cursor:'pointer'}}>⚠️ {altActivas} alerta{altActivas>1?'s':''}</div>}
        {gestPend>0&&<div onClick={()=>setView('propietarios')} style={{background:C.orangeL,border:`1px solid ${C.orange}44`,borderRadius:20,padding:'3px 12px',fontSize:11,color:C.orange,fontWeight:700,cursor:'pointer'}}>🏗️ {gestPend} en gestión</div>}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,background:C.red,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12}}>AT</div>
          <span style={{fontSize:13,fontWeight:500}}>{user.name}</span>
        </div>
        <button onClick={onLogout} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'5px 12px',cursor:'pointer',fontSize:12,color:C.textS}}>Salir</button>
      </div>

      <div style={{display:'flex',flex:1}}>
        <div style={{width:215,background:C.white,borderRight:`1px solid ${C.border}`,padding:'12px 0',flexShrink:0,overflowY:'auto'}}>
          <div style={{fontSize:10,fontWeight:700,color:C.gray4,letterSpacing:1,padding:'0 14px 8px',textTransform:'uppercase'}}>Panel ATP</div>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 14px',background:view===n.id?'#FFEBEE':C.white,borderLeft:view===n.id?`3px solid ${C.red}`:'3px solid transparent',cursor:'pointer',transition:'all 0.15s'}}>
              <span style={{fontSize:13}}>{n.icon}</span>
              <span style={{fontSize:12,fontWeight:view===n.id?700:400,color:view===n.id?C.red:C.text,flex:1}}>{n.label}</span>
              {n.badge>0&&<span style={{background:n.badgeColor||C.orange,color:'#fff',borderRadius:'50%',width:17,height:17,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>{n.badge}</span>}
            </div>
          ))}
          <div style={{margin:'12px 10px 0',background:C.amberL,border:'1px solid #FFE082',borderRadius:6,padding:'8px 10px'}}>
            <div style={{fontSize:10,fontWeight:700,color:C.amber,marginBottom:2}}>⚡ MOTOR AUTO</div>
            <div style={{fontSize:10,color:C.textS}}>PrimeCorp v2.0 activo</div>
            <div style={{fontSize:10,color:C.green,marginTop:1}}>{solicitudes.filter(s=>s.auto).length} procesadas</div>
          </div>
        </div>

        <div style={{flex:1,padding:22,overflowY:'auto',maxHeight:'calc(100vh - 52px)'}}>
          {loading&&<div style={{textAlign:'center',padding:48,color:C.textS}}>Cargando datos en tiempo real...</div>}
          {!loading&&view==='lista'&&<TabLista solicitudes={filtradas} filterEst={filterEst} setFilterEst={setFilterEst} filterOp={filterOp} setFilterOp={setFilterOp} onDetalle={setDetalleSol}/>}
          {!loading&&view==='propietarios'&&<TabGestionPropietarios solicitudes={solicitudes} onAutorizar={handleAutorizar} showNotif={showNotif}/>}
          {!loading&&view==='alertas'&&<TabAlertas alertas={alertas} setAlertas={setAlertas} showNotif={showNotif}/>}
          {!loading&&view==='mapa'&&<TabMapa solicitudes={solicitudes}/>}
          {!loading&&view==='dashboard'&&<TabDashboard solicitudes={solicitudes}/>}
          {!loading&&view==='colos'&&<TabColocalizaciones/>}
          {!loading&&view==='reporteria'&&<TabReporteria solicitudes={solicitudes} trabajadores={trabajadores}/>}
          {!loading&&view==='trabajadores'&&<TabTrabajadores trabajadores={trabajadores} setTrabajadores={setTrabajadores} empresas={empresas} showNotif={showNotif}/>}
          {!loading&&view==='reglas'&&<TabReglas/>}
        </div>
      </div>
      <div style={{background:C.white,borderTop:`1px solid ${C.border}`,padding:'7px 24px',fontSize:11,color:C.gray4,textAlign:'right'}}>
        ATP Chile · v2.0 · <span style={{color:C.red,fontWeight:600}}>PrimeCorp SpA ⚡</span>
      </div>
    </div>
  )
}

function DetalleModal({sol,onClose}){
  const durMs = sol.tsEnviado&&sol.tsAutorizado ? new Date(sol.tsAutorizado)-new Date(sol.tsEnviado) : null
  const sitio = SITIOS.find(s=>s.id===sol.sitio)
  return(
    <div style={{position:'fixed',inset:0,background:'#00000066',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
      <div style={{background:'#fff',borderRadius:10,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 16px 48px #0003'}}>
        <div style={{background:C.red,borderRadius:'10px 10px 0 0',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:800,fontSize:16,color:'#fff'}}>{sol.id}</div>{sol.refCliente&&<div style={{fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:2}}>{sol.refCliente}</div>}</div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:16}}>×</button>
        </div>
        <div style={{padding:20}}>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <Badge estado={sol.estado}/>
            {sol.auto&&<span style={{background:C.amberL,color:C.amber,borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:700}}>⚡ Auto</span>}
            {durMs&&<span style={{background:C.greenL,color:C.green,borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:700}}>⏱️ {fmtDur(durMs)}</span>}
          </div>
          <FlowTracker estado={sol.estado}/>
          {sol.motivo&&<div style={{background:C.redL,borderRadius:4,padding:'8px 12px',fontSize:12,color:C.red,marginTop:10}}>⚠️ {sol.motivo}</div>}
          <div style={{height:1,background:C.border,margin:'14px 0'}}/>
          {[['Operador',sol.operador],['Empresa',sol.empresaNombre||sol.empresa||'—'],['Sitio',`${sol.sitio} — ${sitio?.nombre||''}`],['Propietario',sitio?.propietario||'—'],['Trabajo',sol.trabajo],['Zona',sol.zona||'—'],['Fechas',`${sol.desde} → ${sol.hasta}`],['Correo mandante',sol.correoMandante||'—'],['Correo contratista',sol.correoContratista||'—']].map(([l,v])=>(
            <div key={l} style={{display:'flex',gap:10,paddingBottom:8,borderBottom:`1px solid ${C.gray2}`,marginBottom:8,fontSize:13}}>
              <div style={{width:150,color:C.textS,flexShrink:0}}>{l}</div><div style={{fontWeight:500}}>{v}</div>
            </div>
          ))}
          {sol.trabajadores?.length>0&&<div style={{marginTop:12}}><div style={{fontWeight:600,fontSize:13,marginBottom:8}}>👷 Personal ({sol.trabajadores.length})</div>{sol.trabajadores.map((t,i)=><div key={i} style={{background:C.gray1,borderRadius:4,padding:'6px 10px',marginBottom:4,fontSize:12,display:'flex',justifyContent:'space-between'}}><span>{t.nombre||'—'}</span><span style={{fontFamily:'monospace',color:C.textS}}>{t.rut||'—'}</span></div>)}</div>}
          {sol.historial?.length>0&&<div style={{marginTop:14}}><div style={{fontWeight:600,fontSize:13,marginBottom:8}}>📋 Historial</div>{sol.historial.map((h,i)=><div key={i} style={{display:'flex',gap:10,paddingBottom:8,alignItems:'center'}}><div style={{width:20,height:20,borderRadius:'50%',background:ESTADO_COLOR[h.estado]?.bg||C.gray4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{flex:1}}><Badge estado={h.estado} small/>{h.auto&&<span style={{marginLeft:4,fontSize:10,color:C.amber}}>⚡</span>}</div><div style={{fontSize:11,color:C.textS}}>{h.fecha}</div></div>)}</div>}
        </div>
      </div>
    </div>
  )
}

function TabLista({solicitudes,filterEst,setFilterEst,filterOp,setFilterOp,onDetalle}){
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Panel de Solicitudes</h2>
        <span style={{fontSize:12,color:C.textS}}>Tiempo real · {solicitudes.length} solicitudes</span>
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:14,marginBottom:12,display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10}}>
        <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Estado</label><select value={filterEst} onChange={e=>setFilterEst(e.target.value)} style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'6px 10px',fontSize:12}}><option value="">Todos</option>{ESTADOS.map(e=><option key={e}>{e}</option>)}</select></div>
        <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Operador</label><select value={filterOp} onChange={e=>setFilterOp(e.target.value)} style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'6px 10px',fontSize:12}}><option value="">Todos</option>{OPERADORES.map(o=><option key={o}>{o}</option>)}</select></div>
        <div style={{display:'flex',alignItems:'flex-end'}}><button onClick={()=>{setFilterEst('');setFilterOp('')}} style={{color:C.red,background:'transparent',border:`1px solid ${C.red}`,borderRadius:4,padding:'6px 14px',fontWeight:600,fontSize:12,cursor:'pointer'}}>✕ Limpiar</button></div>
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
        {solicitudes.length===0?<div style={{padding:32,textAlign:'center',color:C.textS}}>No hay solicitudes</div>
          :solicitudes.map(s=>(
            <div key={s.id} onClick={()=>onDetalle(s)} style={{padding:'12px 18px',borderBottom:`1px solid ${C.gray2}`,cursor:'pointer',transition:'background 0.1s'}} onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'} onMouseLeave={e=>e.currentTarget.style.background=C.white}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span>
                  {s.refCliente&&<span style={{fontSize:10,background:'#E8EAF6',color:'#3949AB',borderRadius:3,padding:'1px 6px',fontFamily:'monospace'}}>{s.refCliente}</span>}
                  {s.auto&&<span style={{background:C.amberL,color:C.amber,borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:700}}>⚡</span>}
                  <span style={{fontSize:12,color:OP_COLOR[s.operador],fontWeight:600}}>{OP_SHORT[s.operador]||s.operador}</span>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {s.tsEnviado&&s.tsAutorizado&&<span style={{fontSize:10,color:C.green}}>⏱️ {fmtDur(new Date(s.tsAutorizado)-new Date(s.tsEnviado))}</span>}
                  <Badge estado={s.estado}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,fontSize:12,marginBottom:4}}>
                <div><span style={{color:C.textS}}>Sitio: </span><strong>{s.sitio}</strong></div>
                <div><span style={{color:C.textS}}>Trabajo: </span>{s.trabajo}</div>
                <div><span style={{color:C.textS}}>Empresa: </span>{s.empresaNombre||s.empresa||'—'}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{background:C.blueL,color:C.blue,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:600}}>📅 {s.desde||'—'} → {s.hasta||'—'}</span>
                <span style={{fontSize:11,color:C.textS,marginLeft:'auto'}}>👁 Ver detalle</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function TabGestionPropietarios({solicitudes,onAutorizar,showNotif}){
  const pendientes = solicitudes.filter(s=>['Validado','En Gestión Propietario'].includes(s.estado))
  async function reenviar(s){
    const sitio=SITIOS.find(x=>x.id===s.sitio)
    if(sitio){await enviarCorreoPropietario({solicitud:s,sitio});showNotif('📧 Correo reenviado','success')}
  }
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Gestión con Propietarios</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Solicitudes esperando confirmación del propietario del sitio.</p>
      {pendientes.length===0&&<div style={{background:C.greenL,borderRadius:8,padding:24,textAlign:'center',color:C.green,fontWeight:700}}>✅ Sin solicitudes pendientes</div>}
      {pendientes.map(s=>{
        const sitio=SITIOS.find(x=>x.id===s.sitio)
        return(
          <div key={s.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18,marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div><div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}><span style={{fontWeight:700,fontSize:14}}>{s.id}</span><Badge estado={s.estado}/></div><div style={{fontSize:12,color:C.textS}}>{s.operador} · {s.empresaNombre||s.empresa}</div></div>
              <div style={{textAlign:'right',fontSize:12}}><div style={{fontWeight:600}}>{s.trabajo}</div><div style={{color:C.textS}}>📅 {s.desde} → {s.hasta}</div></div>
            </div>
            <div style={{background:C.amberL,border:'1px solid #FFE082',borderRadius:4,padding:'10px 14px',marginBottom:10,fontSize:12}}>
              <div style={{fontWeight:600,color:C.amber,marginBottom:4}}>📍 {sitio?.nombre} · {sitio?.propietario}</div>
              <div style={{color:C.textS}}>Contacto: {sitio?.contacto} · {sitio?.tel}</div>
              {sitio?.email&&<div style={{color:C.textS}}>✉️ {sitio.email}</div>}
              <div style={{color:C.textS,marginTop:4,fontStyle:'italic',fontSize:11}}>{TRABAJO_INFORMAL[s.trabajo]||s.trabajo}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>onAutorizar(s.id)} style={{background:C.green,color:'#fff',border:'none',borderRadius:4,padding:'7px 18px',fontWeight:700,cursor:'pointer',fontSize:12}}>✓ Autorizar acceso</button>
              <button onClick={()=>reenviar(s)} style={{background:'transparent',color:C.red,border:`1px solid ${C.red}`,borderRadius:4,padding:'7px 14px',fontWeight:600,cursor:'pointer',fontSize:12}}>📧 Reenviar correo</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TabAlertas({alertas,setAlertas,showNotif}){
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({sitio_id:'',tipo:'contractual',titulo:'',descripcion:''})
  const activas=alertas.filter(a=>a.estado==='activo')
  const resueltas=alertas.filter(a=>a.estado==='resuelto')
  const inp={width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',fontSize:12,fontFamily:'inherit'}
  async function agregar(){
    if(!form.sitio_id||!form.titulo)return
    const a={...form,id:`ALT${Date.now()}`,estado:'activo',created_at:new Date().toISOString()}
    await upsertAlerta(a);setAlertas(prev=>[a,...prev]);setForm({sitio_id:'',tipo:'contractual',titulo:'',descripcion:''});setShowForm(false);showNotif('⚠️ Alerta agregada')
  }
  async function resolver(id){await resolverAlerta(id);setAlertas(prev=>prev.map(x=>x.id===id?{...x,estado:'resuelto'}:x));showNotif('✅ Alerta resuelta')}
  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Alertas de Sitios</h2>
        <button onClick={()=>setShowForm(o=>!o)} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'7px 16px',fontWeight:700,cursor:'pointer',fontSize:12}}>+ Nueva alerta</button>
      </div>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Visible para operadores al seleccionar un sitio con alertas activas.</p>
      {showForm&&<div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:20,marginBottom:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Sitio</label><select value={form.sitio_id} onChange={e=>setForm(f=>({...f,sitio_id:e.target.value}))} style={inp}><option value="">Seleccione...</option>{SITIOS.map(s=><option key={s.id} value={s.id}>{s.id} — {s.nombre}</option>)}</select></div>
          <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Tipo</label><select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}><option value="contractual">Problema contractual</option><option value="documentacion">Documentación requerida</option></select></div>
        </div>
        <div style={{marginBottom:12}}><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Título</label><input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} style={inp}/></div>
        <div style={{marginBottom:14}}><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:4}}>Descripción</label><textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={3} style={{...inp,resize:'vertical'}}/></div>
        <div style={{display:'flex',gap:10}}><button onClick={agregar} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',fontWeight:700,cursor:'pointer',fontSize:13}}>Agregar</button><button onClick={()=>setShowForm(false)} style={{background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',cursor:'pointer'}}>Cancelar</button></div>
      </div>}
      <div style={{fontWeight:600,fontSize:13,color:C.red,marginBottom:10}}>⚠️ Activas ({activas.length})</div>
      {activas.length===0&&<div style={{background:C.greenL,borderRadius:6,padding:16,textAlign:'center',color:C.green,fontWeight:600,marginBottom:16}}>✅ Sin alertas activas</div>}
      {activas.map(a=>{const sitio=SITIOS.find(s=>s.id===a.sitio_id);return(<div key={a.id} style={{background:C.white,border:`1px solid ${a.tipo==='contractual'?C.red+'44':'#FFE082'}`,borderLeft:`4px solid ${a.tipo==='contractual'?C.red:C.amber}`,borderRadius:6,padding:16,marginBottom:8}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div><div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}><span style={{fontWeight:700,fontSize:13,color:a.tipo==='contractual'?C.red:C.amber}}>{a.tipo==='contractual'?'⚠️ Contractual':'📋 Documentación'}</span><span style={{fontFamily:'monospace',fontSize:11,background:C.gray1,borderRadius:3,padding:'1px 7px'}}>{a.sitio_id}</span></div><div style={{fontWeight:600,fontSize:14}}>{a.titulo}</div><div style={{fontSize:12,color:C.textS}}>{a.descripcion}</div></div>
          <div style={{fontSize:11,color:C.textS,flexShrink:0,marginLeft:12}}>{sitio?.nombre}</div>
        </div>
        <button onClick={()=>resolver(a.id)} style={{background:C.green,color:'#fff',border:'none',borderRadius:3,padding:'4px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Marcar como resuelto</button>
      </div>)})}
      {resueltas.length>0&&<div style={{marginTop:16}}><div style={{fontWeight:600,fontSize:12,color:C.textS,marginBottom:8}}>Resueltas ({resueltas.length})</div>{resueltas.map(a=><div key={a.id} style={{background:C.gray1,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',marginBottom:4,fontSize:12,color:C.gray4,textDecoration:'line-through'}}>{a.titulo} — {a.sitio_id}</div>)}</div>}
    </div>
  )
}

// ── MAPA CHILE ────────────────────────────────────────────────
// Proyección: x = (lng+75)*20, y = (-lat-17)*18
const CHILE_REGIONES = [
  { id:'XV', nombre:'Arica y Parinacota', color:'#FF8A65',
    path:'M 94,6 L 124,6 L 128,14 L 126,44 L 98,44 L 94,34 Z' },
  { id:'I',  nombre:'Tarapacá',           color:'#FFB74D',
    path:'M 94,44 L 126,44 L 128,100 L 96,100 L 94,44 Z' },
  { id:'II', nombre:'Antofagasta',         color:'#FFF176',
    path:'M 92,100 L 128,100 L 134,200 L 90,200 Z' },
  { id:'III',nombre:'Atacama',             color:'#AED581',
    path:'M 86,200 L 134,200 L 138,256 L 84,256 Z' },
  { id:'IV', nombre:'Coquimbo',            color:'#4DD0E1',
    path:'M 80,256 L 138,256 L 136,306 L 78,306 Z' },
  { id:'V',  nombre:'Valparaíso',          color:'#4FC3F7',
    path:'M 68,306 L 136,306 L 132,332 L 66,332 Z' },
  { id:'XIII',nombre:'Metropolitana',      color:'#BA68C8',
    path:'M 66,332 L 132,332 L 128,360 L 64,360 Z' },
  { id:'VI', nombre:"O'Higgins",           color:'#F48FB1',
    path:'M 62,360 L 128,360 L 124,388 L 60,388 Z' },
  { id:'VII',nombre:'Maule',               color:'#80CBC4',
    path:'M 56,388 L 124,388 L 118,428 L 52,428 Z' },
  { id:'XVI',nombre:'Ñuble',               color:'#FFCC02',
    path:'M 50,428 L 118,428 L 112,452 L 46,452 Z' },
  { id:'VIII',nombre:'Biobío',             color:'#81C784',
    path:'M 42,452 L 112,452 L 106,488 L 38,488 Z' },
  { id:'IX', nombre:'Araucanía',           color:'#FF8A65',
    path:'M 36,488 L 106,488 L 98,522 L 32,522 Z' },
  { id:'XIV',nombre:'Los Ríos',            color:'#4FC3F7',
    path:'M 30,522 L 98,522 L 90,546 L 26,546 Z' },
  { id:'X',  nombre:'Los Lagos',           color:'#AED581',
    path:'M 22,546 L 90,546 L 86,604 L 16,604 Z' },
  { id:'XI', nombre:'Aysén',               color:'#80CBC4',
    path:'M 10,604 L 86,604 L 100,662 L 8,662 Z' },
  { id:'XII',nombre:'Magallanes',          color:'#CE93D8',
    path:'M 6,662 L 100,662 L 138,698 L 12,698 L 2,680 Z' },
]

function TabMapa({solicitudes}){
  const [hover,setHover] = useState(null)

  // Cuenta solicitudes por sitio
  const statsBySitio = solicitudes.reduce((acc,s)=>{
    if(!acc[s.sitio]) acc[s.sitio]={total:0,aut:0,pend:0}
    acc[s.sitio].total++
    if(s.estado==='Autorizado') acc[s.sitio].aut++
    if(['En Gestión Propietario','Validado','En Validación','Enviado'].includes(s.estado)) acc[s.sitio].pend++
    return acc
  },{})

  // Convierte lat/lng a SVG x,y
  function toSVG(lat,lng){
    return { x: Math.round((lng+75)*20), y: Math.round((-lat-17)*18) }
  }

  // Color del punto en mapa según actividad
  function puntColor(sitioId){
    const s = statsBySitio[sitioId]||{}
    if(s.aut>0)  return '#2E7D32'
    if(s.pend>0) return '#E65100'
    return '#1565C0'
  }

  const hSitio = hover ? SITIOS.find(s=>s.id===hover) : null
  const hStats = hover ? (statsBySitio[hover]||{total:0,aut:0,pend:0}) : null

  // Cuántos sitios hay por región
  const sitiosPorRegion = SITIOS.reduce((acc,s)=>{
    acc[s.regionLabel]=(acc[s.regionLabel]||0)+1; return acc
  },{})

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Mapa de Sitios — Chile</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Hover sobre un sitio para ver detalle. Verde = autorizado · Naranja = pendiente · Azul = sin actividad.</p>
      <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>

        {/* Leyenda izquierda */}
        <div style={{width:200,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:12}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Sitios</div>
            {[['#2E7D32','Con accesos autorizados'],['#E65100','Pendientes de aprobar'],['#1565C0','Sin actividad reciente']].map(([c,l])=>(
              <div key={l} style={{display:'flex',gap:6,alignItems:'center',marginBottom:5}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0,border:'1.5px solid white',boxShadow:'0 0 0 1px '+c}}/>
                <span style={{fontSize:11,color:C.textS}}>{l}</span>
              </div>
            ))}
          </div>

          {hSitio&&(
            <div style={{background:C.white,border:`2px solid ${C.blue}`,borderRadius:6,padding:12,animation:'fadeIn 0.2s ease'}}>
              <div style={{fontWeight:700,fontSize:12,color:C.red,marginBottom:4}}>{hSitio.id}</div>
              <div style={{fontWeight:600,fontSize:12,marginBottom:3}}>{hSitio.nombre}</div>
              <div style={{fontSize:11,color:C.textS,marginBottom:2}}>{hSitio.tipo} · {hSitio.altTotal}m</div>
              <div style={{fontSize:11,color:C.textS,marginBottom:8}}>{hSitio.regionLabel}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
                {[['Total',hStats.total,C.blue],['Aut.',hStats.aut,C.green],['Pend.',hStats.pend,C.orange]].map(([l,v,col])=>(
                  <div key={l} style={{textAlign:'center',background:C.gray1,borderRadius:3,padding:'4px 2px'}}>
                    <div style={{fontWeight:800,fontSize:18,color:col}}>{v}</div>
                    <div style={{fontSize:9,color:C.textS}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:12}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Resumen</div>
            {[['Sitios totales',SITIOS.length,C.blue],['Con actividad',Object.keys(statsBySitio).length,C.purple],['Autorizados',solicitudes.filter(s=>s.estado==='Autorizado').length,C.green],['Pendientes',solicitudes.filter(s=>['En Gestión Propietario','Validado'].includes(s.estado)).length,C.orange]].map(([l,v,col])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12}}>
                <span style={{color:C.textS}}>{l}</span><strong style={{color:col}}>{v}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* MAPA SVG */}
        <div style={{flex:1,background:'#EEF7FF',border:`1px solid ${C.border}`,borderRadius:8,overflow:'hidden',position:'relative'}}>
          <svg viewBox="0 0 160 710" width="100%" style={{display:'block',maxHeight:680}}>
            {/* Regiones */}
            {CHILE_REGIONES.map(r=>(
              <g key={r.id}>
                <path d={r.path} fill={r.color} stroke="white" strokeWidth="1.5" opacity="0.85"/>
                <text
                  x={parseInt(r.path.match(/M (\d+)/)[1]) + 4}
                  y={parseInt(r.path.match(/L \d+,(\d+)/)[1]) + 14}
                  fontSize="7" fill="#333" fontWeight="700" style={{pointerEvents:'none'}}>
                  {r.id}
                </text>
              </g>
            ))}

            {/* Puntos de sitios */}
            {SITIOS.map(s=>{
              const pt = toSVG(s.lat, s.lng)
              const isH = hover===s.id
              const col = puntColor(s.id)
              return(
                <g key={s.id} style={{cursor:'pointer'}}
                   onMouseEnter={()=>setHover(s.id)}
                   onMouseLeave={()=>setHover(null)}>
                  {isH&&<circle cx={pt.x} cy={pt.y} r={12} fill={col} opacity={0.2}/>}
                  <circle cx={pt.x} cy={pt.y} r={isH?7:5} fill={col} stroke="white" strokeWidth={1.5}/>
                  {isH&&(
                    <text x={pt.x+9} y={pt.y+4} fontSize="7" fill="#333" fontWeight="700"
                      style={{pointerEvents:'none',textShadow:'0 0 3px white'}}>
                      {s.id.replace('CL-TAR-','T').replace('CL','').slice(0,5)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Tabla derecha */}
        <div style={{width:190,flexShrink:0}}>
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:12}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:10}}>Sitios por región</div>
            {Object.entries(sitiosPorRegion).sort((a,b)=>b[1]-a[1]).map(([reg,n])=>(
              <div key={reg} style={{marginBottom:6}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}>
                  <span style={{color:C.textS,flex:1}}>{reg}</span>
                  <strong style={{color:C.blue}}>{n}</strong>
                </div>
                <div style={{height:4,background:C.gray2,borderRadius:2}}>
                  <div style={{height:'100%',background:C.blue,borderRadius:2,width:`${n/SITIOS.length*100}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function TabDashboard({solicitudes}){
  const total = solicitudes.length || 1
  const aut   = solicitudes.filter(s=>s.estado==='Autorizado').length
  const rech  = solicitudes.filter(s=>s.estado==='Rechazado').length
  const pend  = solicitudes.filter(s=>['En Gestión Propietario','Validado'].includes(s.estado)).length

  const tiempos = solicitudes.filter(s=>s.tsEnviado&&s.tsAutorizado)
    .map(s=>new Date(s.tsAutorizado)-new Date(s.tsEnviado))
  const promMs = tiempos.length ? tiempos.reduce((a,b)=>a+b,0)/tiempos.length : 0

  const estadoData = ESTADOS.map(e=>({name:e,value:solicitudes.filter(s=>s.estado===e).length,color:ESTADO_COLOR[e]?.bg||C.gray4})).filter(d=>d.value>0)
  const opData = OPERADORES.map(op=>({op:OP_SHORT[op],aut:solicitudes.filter(s=>s.operador===op&&s.estado==='Autorizado').length,rech:solicitudes.filter(s=>s.operador===op&&s.estado==='Rechazado').length,pend:solicitudes.filter(s=>s.operador===op&&['En Gestión Propietario','Validado'].includes(s.estado)).length,color:OP_COLOR[op]}))

  const tiemposPorOp = OPERADORES.map(op=>{
    const ts = solicitudes.filter(s=>s.operador===op&&s.tsEnviado&&s.tsAutorizado).map(s=>new Date(s.tsAutorizado)-new Date(s.tsEnviado))
    return {op:OP_SHORT[op],prom:ts.length?Math.round(ts.reduce((a,b)=>a+b,0)/ts.length/60000):0,color:OP_COLOR[op]}
  }).filter(d=>d.prom>0)

  const sitioData = SITIOS.map(s=>({id:s.id.replace('CL-TAR-','').replace('CL','').slice(-5),n:solicitudes.filter(x=>x.sitio===s.id).length})).filter(d=>d.n>0).sort((a,b)=>b.n-a.n).slice(0,8)

  const weeklyData=[{sem:'S1',aut:6,rech:1},{sem:'S2',aut:8,rech:2},{sem:'S3',aut:7,rech:1},{sem:'S4',aut:10,rech:2},{sem:'S5',aut:9,rech:1},{sem:'S6',aut:aut,rech:rech}]

  const TT=({active,payload,label})=>active&&payload?.length?<div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',fontSize:12}}><div style={{fontWeight:600,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.fill||C.text}}>{p.name||p.dataKey}: <strong>{p.value}</strong></div>)}</div>:null

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Dashboard ATP Chile</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 14px'}}>{new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <KpiCard icon="📋" value={solicitudes.length} label="Total solicitudes" color={C.blue}/>
        <KpiCard icon="✅" value={aut} label="Autorizadas" color={C.green} sub={`${Math.round(aut/total*100)}%`}/>
        <KpiCard icon="⏳" value={pend} label="En gestión" color={C.orange}/>
        <KpiCard icon="❌" value={rech} label="Rechazadas" color={C.red}/>
        <KpiCard icon="⚡" value={`${Math.round(solicitudes.filter(s=>s.auto).length/total*100)}%`} label="Automatizadas" color={C.purple}/>
        <KpiCard icon="⏱️" value={fmtDur(promMs)} label="Tiempo prom." color={C.teal} sub="envío → autorizado"/>
        <KpiCard icon="🏗️" value={SITIOS.length} label="Sitios" color={C.blue}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Tendencia semanal</div>
          <ResponsiveContainer width="100%" height={180}><AreaChart data={weeklyData} margin={{top:5,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.gray2}/><XAxis dataKey="sem" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TT/>}/><Legend iconSize={8} wrapperStyle={{fontSize:11}}/><Area type="monotone" dataKey="aut" name="Autorizadas" stroke={C.green} fill={C.greenL}/><Area type="monotone" dataKey="rech" name="Rechazadas" stroke={C.red} fill={C.redL}/></AreaChart></ResponsiveContainer>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Por estado</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <ResponsiveContainer width="50%" height={160}><PieChart><Pie data={estadoData} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" paddingAngle={2}>{estadoData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart></ResponsiveContainer>
            <div style={{flex:1}}>{estadoData.map(d=><div key={d.name} style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}><div style={{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0}}/><span style={{fontSize:10,color:C.textS,flex:1}}>{d.name}</span><span style={{fontSize:11,fontWeight:700}}>{d.value}</span></div>)}</div>
          </div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Por operador</div>
          <ResponsiveContainer width="100%" height={160}><BarChart data={opData} margin={{left:-20,bottom:0,top:5,right:5}}><XAxis dataKey="op" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TT/>}/><Bar dataKey="aut" name="Aut." stackId="a" radius={[0,0,0,0]}>{opData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar><Bar dataKey="pend" name="Pend." stackId="a" fill="#FFA726" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>⏱️ Tiempo prom. (min)</div>
          {tiemposPorOp.length>0
            ?<ResponsiveContainer width="100%" height={160}><BarChart data={tiemposPorOp} margin={{left:-20,bottom:0,top:5,right:5}}><XAxis dataKey="op" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip formatter={v=>[`${v} min`,'Prom.']}/><Bar dataKey="prom" name="Min" radius={[3,3,0,0]}>{tiemposPorOp.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar></BarChart></ResponsiveContainer>
            :<div style={{textAlign:'center',color:C.gray4,padding:20,fontSize:13}}>Sin datos aún</div>}
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Sitios más solicitados</div>
          {sitioData.length>0
            ?<ResponsiveContainer width="100%" height={160}><BarChart data={sitioData} layout="vertical" margin={{left:0,right:10,top:5,bottom:0}}><XAxis type="number" tick={{fontSize:10}}/><YAxis dataKey="id" type="category" tick={{fontSize:9}} width={55}/><Tooltip/><Bar dataKey="n" name="Solicitudes" fill={C.blue} radius={[0,3,3,0]}/></BarChart></ResponsiveContainer>
            :<div style={{textAlign:'center',color:C.gray4,padding:20,fontSize:13}}>Sin datos aún</div>}
        </div>
      </div>
    </div>
  )
}

// ── COLOCALIZACIONES ──────────────────────────────────────────
function TabColocalizaciones(){
  const [busq,setBusq]           = useState('')
  const [editSitio,setEditSitio] = useState(null)
  const [configs,setConfigs]     = useState({})
  const [editForm,setEditForm]   = useState({})
  const [saving,setSaving]       = useState(false)

  useEffect(()=>{
    getSitiosConfig().then(setConfigs).catch(e=>console.error('sitios config error:',e))
  },[])

  function startEdit(s){
    const cfg = configs[s.id] || {}
    setEditForm({
      contacto: cfg.contacto || s.contacto || '',
      tel:      cfg.tel      || s.tel      || '',
      email:    cfg.email    || s.email    || '',
      nota:     cfg.nota     || '',
    })
    setEditSitio(s.id)
  }

  async function guardar(sitioId){
    setSaving(true)
    try {
      const ok = await upsertSitioConfig({ sitio_id: sitioId, ...editForm })
      if (ok !== false) {
        setConfigs(c=>({...c,[sitioId]:{ sitio_id: sitioId, ...editForm }}))
        setEditSitio(null)
      }
    } catch(e){ console.error('guardar sitio error:',e) }
    setSaving(false)
  }

  const filtrado=SITIOS.filter(s=>
    s.id.toLowerCase().includes(busq.toLowerCase())||
    s.nombre.toLowerCase().includes(busq.toLowerCase())||
    (COLOCALIZACIONES[s.id]||[]).some(op=>op.toLowerCase().includes(busq.toLowerCase()))||
    s.propietario.toLowerCase().includes(busq.toLowerCase())
  )

  const inp={width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'7px 10px',fontSize:12,fontFamily:'inherit'}
  const lbl={display:'block',fontSize:11,fontWeight:600,color:C.textS,marginBottom:3}

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Colocalizaciones y Propietarios</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 12px'}}>Edita el correo de cada sitio para que las solicitudes lleguen al propietario correcto.</p>
      <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar por sitio, operador, propietario..." style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 14px',fontSize:13,marginBottom:14,fontFamily:'inherit'}}/>
      <div style={{fontSize:11,color:C.textS,marginBottom:12}}>{filtrado.length} de {SITIOS.length} sitios</div>
      {filtrado.map(s=>{
        const ops    = COLOCALIZACIONES[s.id]||[]
        const isEdit = editSitio===s.id
        const cfg    = configs[s.id]||{}
        const email  = cfg.email||s.email
        const tel    = cfg.tel||s.tel
        const contacto = cfg.contacto||s.contacto
        return(
          <div key={s.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'14px 18px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span>
                  <span style={{fontSize:11,color:C.textS,background:C.gray1,borderRadius:3,padding:'1px 7px'}}>{s.siterra}</span>
                  <span style={{fontSize:11,color:C.textS}}>{s.tipo}</span>
                </div>
                <div style={{fontWeight:600}}>{s.nombre}</div>
                <div style={{fontSize:12,color:C.textS,marginTop:2}}>{s.comuna} · {s.regionLabel} · {s.altTotal}m</div>
              </div>
              <button onClick={()=>isEdit?setEditSitio(null):startEdit(s)}
                style={{background:isEdit?C.red:C.blue,color:'#fff',border:'none',borderRadius:4,padding:'5px 12px',cursor:'pointer',fontSize:11,fontWeight:600}}>
                {isEdit?'✕ Cerrar':'✏️ Editar contacto'}
              </button>
            </div>

            {/* Info contacto actual */}
            {!isEdit&&(
              <div style={{background:'#FFF8E1',border:'1px solid #FFE082',borderRadius:4,padding:'8px 12px',marginBottom:8,fontSize:12}}>
                <div style={{fontWeight:600,color:C.amber,marginBottom:4}}>🏠 {s.propietario}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,color:C.textS}}>
                  <span>👤 {contacto||'—'}</span>
                  <span>📞 {tel||'—'}</span>
                  <span style={{gridColumn:'1/-1'}}>
                    ✉️ {email
                      ? <span style={{color:C.green,fontWeight:600}}>{email}</span>
                      : <span style={{color:C.red}}>Sin correo — no se enviará notificación</span>}
                  </span>
                </div>
                {cfg.nota&&<div style={{marginTop:6,color:C.textS,fontStyle:'italic'}}>📝 {cfg.nota}</div>}
              </div>
            )}

            {/* Formulario de edición */}
            {isEdit&&(
              <div style={{background:'#EEF7FF',border:`1px solid ${C.blue}33`,borderRadius:6,padding:14,marginBottom:8}}>
                <div style={{fontWeight:600,fontSize:12,color:C.blue,marginBottom:12}}>✏️ Editar información de contacto del propietario</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <label style={lbl}>Nombre contacto</label>
                    <input value={editForm.contacto} onChange={e=>setEditForm(f=>({...f,contacto:e.target.value}))} style={inp} placeholder="Nombre del contacto"/>
                  </div>
                  <div>
                    <label style={lbl}>Teléfono</label>
                    <input value={editForm.tel} onChange={e=>setEditForm(f=>({...f,tel:e.target.value}))} style={inp} placeholder="+56 9 1234 5678"/>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={lbl}>Correo electrónico <span style={{color:C.red}}>*</span> — las solicitudes se enviarán a este correo</label>
                    <input type="email" value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} style={{...inp,borderColor:editForm.email?C.green:C.orange,fontWeight:editForm.email?600:'normal'}} placeholder="propietario@correo.cl"/>
                    {editForm.email&&<div style={{fontSize:10,color:C.green,marginTop:2}}>✓ Las solicitudes se enviarán a este correo</div>}
                    {!editForm.email&&<div style={{fontSize:10,color:C.orange,marginTop:2}}>⚠️ Sin correo: no se notificará al propietario</div>}
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={lbl}>Notas / instrucciones de contacto</label>
                    <textarea rows={2} value={editForm.nota} onChange={e=>setEditForm(f=>({...f,nota:e.target.value}))} style={{...inp,resize:'vertical'}} placeholder="Ej: Solo contrata llamadas · Disponible L-V 9-18h · Requiere aviso 48h antes..."/>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>guardar(s.id)} disabled={saving}
                    style={{background:saving?C.gray3:C.green,color:saving?C.gray4:'#fff',border:'none',borderRadius:4,padding:'7px 18px',fontWeight:700,cursor:saving?'wait':'pointer',fontSize:12}}>
                    {saving?'⏳ Guardando...':'💾 Guardar cambios'}
                  </button>
                  <button onClick={()=>setEditSitio(null)}
                    style={{background:'transparent',color:C.textS,border:`1px solid ${C.border}`,borderRadius:4,padding:'7px 14px',cursor:'pointer',fontSize:12}}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:11,color:C.textS,fontWeight:600}}>Colocalizados ({ops.length}):</span>
              {ops.map(op=>(
                <span key={op} style={{background:OP_COLOR[op]+'22',border:`1px solid ${OP_COLOR[op]}55`,color:OP_COLOR[op],borderRadius:10,padding:'2px 10px',fontSize:11,fontWeight:700}}>
                  {OP_SHORT[op]||op}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── REPORTERÍA ─────────────────────────────────────────────────
function TabReporteria({solicitudes, trabajadores}){
  const [generando, setGenerando] = useState(false)

  async function descargarExcel(){
    setGenerando(true)
    try {
      // Carga SheetJS dinámicamente
      await new Promise((res,rej)=>{
        if(window.XLSX){ res(); return }
        const s=document.createElement('script')
        s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
        s.onload=res; s.onerror=rej
        document.head.appendChild(s)
      })
      const XLSX = window.XLSX
      const wb = XLSX.utils.book_new()

      // ── HOJA 1: Solicitudes ──────────────────────────────────
      const h1 = ['ID','Ref Cliente','Operador','Empresa Contratista','RUT Empresa','Tipo Trabajo','Sitio','Nombre Sitio','Región','Desde','Hasta','Días','Estado','Automático','T.Aut.(min)','Correo Mandante','Correo Contratista','N° Técnicos','Técnicos']
      const r1 = solicitudes.map(s=>{
        const sitio = SITIOS.find(x=>x.id===s.sitio)
        const dias  = s.desde&&s.hasta ? Math.ceil((new Date(s.hasta)-new Date(s.desde))/86400000)+1 : ''
        const tMin  = s.tsEnviado&&s.tsAutorizado ? Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/60000) : ''
        const tecns = (s.trabajadores||[]).map(t=>`${t.nombre}(${t.rut})`).join(' | ')
        return [s.id, s.refCliente||'', s.operador, s.empresaNombre||s.empresa, s.empresa||'', s.trabajo, s.sitio, sitio?.nombre||'', sitio?.regionLabel||'', s.desde||'', s.hasta||'', dias, s.estado, s.auto?'Sí':'No', tMin, s.correoMandante||'', s.correoContratista||'', s.trabajadores?.length||0, tecns]
      })
      const ws1 = XLSX.utils.aoa_to_sheet([h1,...r1])
      ws1['!cols'] = h1.map((_,i)=>({wch: [10,12,22,28,14,26,10,24,14,12,12,6,22,10,14,28,28,8,40][i]||14}))
      XLSX.utils.book_append_sheet(wb, ws1, 'Solicitudes')

      // ── HOJA 2: Resumen por Operador ─────────────────────────
      const ops = ['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.']
      const h2  = ['Operador','Total','Autorizadas','Rechazadas','En Gestión','% Aprobación','T.Prom.Aut.(min)']
      const r2  = ops.map(op=>{
        const mias = solicitudes.filter(s=>s.operador===op)
        const aut  = mias.filter(s=>s.estado==='Autorizado')
        const ts   = aut.filter(s=>s.tsEnviado&&s.tsAutorizado).map(s=>Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/60000))
        const prom = ts.length ? Math.round(ts.reduce((a,b)=>a+b,0)/ts.length) : '—'
        return [op, mias.length, aut.length, mias.filter(s=>s.estado==='Rechazado').length, mias.filter(s=>['En Gestión Propietario','Validado'].includes(s.estado)).length, mias.length?`${Math.round(aut.length/mias.length*100)}%`:'0%', prom]
      })
      const ws2 = XLSX.utils.aoa_to_sheet([h2,...r2])
      ws2['!cols'] = [{wch:30},{wch:8},{wch:12},{wch:12},{wch:12},{wch:14},{wch:18}]
      XLSX.utils.book_append_sheet(wb, ws2, 'Por Operador')

      // ── HOJA 3: Resumen por Estado ───────────────────────────
      const estados = ['Borrador','Enviado','En Validación','Validado','En Gestión Propietario','Autorizado','Rechazado']
      const h3 = ['Estado','Cantidad','%']
      const r3 = estados.map(e=>{
        const n = solicitudes.filter(s=>s.estado===e).length
        return [e, n, solicitudes.length ? `${Math.round(n/solicitudes.length*100)}%` : '0%']
      })
      const ws3 = XLSX.utils.aoa_to_sheet([h3,...r3])
      ws3['!cols'] = [{wch:28},{wch:10},{wch:8}]
      XLSX.utils.book_append_sheet(wb, ws3, 'Por Estado')

      // ── HOJA 4: Resumen por Sitio ────────────────────────────
      const h4 = ['Sitio ID','Nombre','Región','Tipo','Total Sol.','Autorizadas','Pendientes','Rechazadas']
      const r4 = SITIOS.map(s=>{
        const mias = solicitudes.filter(x=>x.sitio===s.id)
        return [s.id, s.nombre, s.regionLabel, s.tipo, mias.length, mias.filter(x=>x.estado==='Autorizado').length, mias.filter(x=>['En Gestión Propietario','Validado'].includes(x.estado)).length, mias.filter(x=>x.estado==='Rechazado').length]
      }).filter(r=>r[4]>0)
      const ws4 = XLSX.utils.aoa_to_sheet([h4,...r4])
      ws4['!cols'] = [{wch:14},{wch:26},{wch:16},{wch:20},{wch:10},{wch:12},{wch:12},{wch:12}]
      XLSX.utils.book_append_sheet(wb, ws4, 'Por Sitio')

      // ── HOJA 5: Tiempos de Respuesta ─────────────────────────
      const autorizadas = solicitudes.filter(s=>s.estado==='Autorizado'&&s.tsEnviado&&s.tsAutorizado)
      const h5 = ['ID Solicitud','Operador','Sitio','Trabajo','T.Aut.(min)','T.Aut.(horas)','Enviado','Autorizado']
      const r5 = autorizadas.map(s=>{
        const minutos = Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/60000)
        return [s.id, s.operador, s.sitio, s.trabajo, minutos, Math.round(minutos/60*10)/10, new Date(s.tsEnviado).toLocaleString('es-CL'), new Date(s.tsAutorizado).toLocaleString('es-CL')]
      })
      const ws5 = XLSX.utils.aoa_to_sheet([h5,...r5])
      ws5['!cols'] = [{wch:16},{wch:24},{wch:12},{wch:26},{wch:12},{wch:14},{wch:20},{wch:20}]
      XLSX.utils.book_append_sheet(wb, ws5, 'Tiempos Respuesta')

      // ── HOJA 6: Trabajadores ─────────────────────────────────
      if(trabajadores?.length){
        const h6 = ['RUT','Nombre','Empresa','Mandante','Acreditado','Vencimiento','Motivo']
        const r6 = trabajadores.map(t=>[t.rut, t.nombre, t.empresa_nombre||'', t.operador||'', t.acreditado?'Sí':'No', t.vencimiento||'', t.motivo_no_acreditado||''])
        const ws6 = XLSX.utils.aoa_to_sheet([h6,...r6])
        ws6['!cols'] = [{wch:14},{wch:28},{wch:28},{wch:26},{wch:10},{wch:14},{wch:30}]
        XLSX.utils.book_append_sheet(wb, ws6, 'Trabajadores')
      }

      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `ATP_Reporte_${fecha}.xlsx`)
    } catch(e){
      console.error(e)
      alert('Error generando Excel: '+e.message)
    }
    setGenerando(false)
  }

  function descargarCSV(){
    const h=['ID','Operador','Empresa','Trabajo','Sitio','Desde','Hasta','Estado','T.Aut.(min)']
    const r=solicitudes.map(s=>{
      const t=s.tsEnviado&&s.tsAutorizado?Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/60000):''
      return[s.id,s.operador,s.empresaNombre||s.empresa,s.trabajo,s.sitio,s.desde||'',s.hasta||'',s.estado,t]
    })
    const csv=[h,...r].map(row=>row.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));a.download=`ATP_${new Date().toISOString().split('T')[0]}.csv`;a.click()
  }

  const total=solicitudes.length||1
  const aut=solicitudes.filter(s=>s.estado==='Autorizado').length
  const tiempos=solicitudes.filter(s=>s.tsEnviado&&s.tsAutorizado).map(s=>Math.round((new Date(s.tsAutorizado)-new Date(s.tsEnviado))/60000))
  const promMin=tiempos.length?Math.round(tiempos.reduce((a,b)=>a+b,0)/tiempos.length):null

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Reportería y Exportación</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 20px'}}>Descarga informes del sistema en distintos formatos.</p>

      {/* KPIs rápidos */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[['Total',solicitudes.length,C.blue],['Autorizadas',`${aut} (${Math.round(aut/total*100)}%)`,C.green],['Rechazadas',solicitudes.filter(s=>s.estado==='Rechazado').length,C.red],['T.Prom.Aut.',promMin!=null?promMin+' min':'—',C.teal]].map(([l,v,col])=>(
          <div key={l} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'12px 16px',textAlign:'center',borderTop:`3px solid ${col}`}}>
            <div style={{fontWeight:800,fontSize:22,color:col}}>{v}</div>
            <div style={{fontSize:11,color:C.textS,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Botones descarga */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:24}}>
        <div style={{background:C.white,border:`2px solid ${C.green}55`,borderRadius:8,padding:20}}>
          <div style={{fontSize:36,marginBottom:8}}>📊</div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Excel (.xlsx)</div>
          <div style={{fontSize:12,color:C.textS,marginBottom:4}}>6 hojas: Solicitudes · Por Operador · Por Estado · Por Sitio · Tiempos de Respuesta · Trabajadores</div>
          <div style={{fontSize:11,color:C.green,marginBottom:14}}>✓ Compatible con Excel, Google Sheets, Numbers</div>
          <button onClick={descargarExcel} disabled={generando}
            style={{background:generando?C.gray3:C.green,color:generando?C.gray4:'#fff',border:'none',borderRadius:4,padding:'9px 22px',fontWeight:700,cursor:generando?'not-allowed':'pointer',fontSize:13}}>
            {generando?'⏳ Generando...':'⬇️ Descargar Excel'}
          </button>
        </div>
        <div style={{background:C.white,border:`2px solid ${C.blue}55`,borderRadius:8,padding:20}}>
          <div style={{fontSize:36,marginBottom:8}}>📄</div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>CSV (.csv)</div>
          <div style={{fontSize:12,color:C.textS,marginBottom:4}}>Datos básicos de solicitudes. Compatible con cualquier programa.</div>
          <div style={{fontSize:11,color:C.blue,marginBottom:14}}>✓ Apertura inmediata, sin macros</div>
          <button onClick={descargarCSV}
            style={{background:C.blue,color:'#fff',border:'none',borderRadius:4,padding:'9px 22px',fontWeight:700,cursor:'pointer',fontSize:13}}>
            ⬇️ Descargar CSV
          </button>
        </div>
      </div>

      {/* Vista previa */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
        <div style={{background:C.gray1,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,fontWeight:600,fontSize:13}}>
          Vista previa — {solicitudes.length} registros
        </div>
        {solicitudes.length===0
          ?<div style={{padding:32,textAlign:'center',color:C.textS}}>No hay solicitudes aún</div>
          :<div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:C.gray2}}>
                {['ID','Operador','Trabajo','Sitio','Fechas','Estado','T.Aut.'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:C.textS,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>)}
              </tr></thead>
              <tbody>{solicitudes.map((s,i)=>{
                const ms=s.tsEnviado&&s.tsAutorizado?new Date(s.tsAutorizado)-new Date(s.tsEnviado):null
                const mins=ms?Math.round(ms/60000):null
                return<tr key={s.id} style={{borderBottom:`1px solid ${C.gray2}`,background:i%2===0?C.white:C.gray1}}>
                  <td style={{padding:'7px 12px',fontFamily:'monospace',fontSize:11,color:C.red,fontWeight:600}}>{s.id}</td>
                  <td style={{padding:'7px 12px'}}>{OP_SHORT[s.operador]||s.operador}</td>
                  <td style={{padding:'7px 12px',fontSize:11}}>{s.trabajo}</td>
                  <td style={{padding:'7px 12px',fontFamily:'monospace',fontSize:11}}>{s.sitio}</td>
                  <td style={{padding:'7px 12px',fontSize:11,whiteSpace:'nowrap'}}>{s.desde} → {s.hasta}</td>
                  <td style={{padding:'7px 12px'}}><Badge estado={s.estado} small/></td>
                  <td style={{padding:'7px 12px',fontSize:11,color:C.teal,fontWeight:600}}>{mins!=null?mins+' min':'—'}</td>
                </tr>
              })}</tbody>
            </table>
          </div>
        }
      </div>
    </div>
  )
}

function TabTrabajadores({trabajadores,setTrabajadores,empresas,showNotif}){
  const [busq,setBusq]=useState('')
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({id:'',rut:'',nombre:'',empresa_rut:'',empresa_nombre:'',mandante:'',acreditado:true,vencimiento:'',notas:''})
  const [editId,setEditId]=useState(null)

  const filtrados=trabajadores.filter(t=>t.nombre?.toLowerCase().includes(busq.toLowerCase())||t.rut?.includes(busq)||t.empresa_nombre?.toLowerCase().includes(busq.toLowerCase()))
  const acred=trabajadores.filter(t=>t.acreditado).length
  const noAcred=trabajadores.filter(t=>!t.acreditado).length

  function handleEdit(t){setForm({...t});setEditId(t.id);setShowForm(true)}
  function handleNew(){setForm({id:`W${Date.now()}`,rut:'',nombre:'',empresa_rut:'',empresa_nombre:'',mandante:'',acreditado:true,vencimiento:'',notas:''});setEditId(null);setShowForm(true)}

  async function handleSave(){
    if(!form.rut||!form.nombre){showNotif('RUT y nombre requeridos','error');return}
    if(!validRUT(form.rut)){showNotif('RUT inválido — usa XX.XXX.XXX-X','error');return}
    await upsertTrabajador(form)
    setTrabajadores(prev=>{const f=prev.filter(t=>t.id!==form.id);return [...f,form].sort((a,b)=>a.nombre.localeCompare(b.nombre))})
    setShowForm(false)
    showNotif(editId?'✅ Trabajador actualizado':'✅ Trabajador agregado')
  }

  async function handleDelete(id){
    await deleteTrabajador(id)
    setTrabajadores(prev=>prev.filter(t=>t.id!==id))
    showNotif('✅ Trabajador eliminado')
  }

  const inp={width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'7px 10px',fontSize:12,fontFamily:'inherit'}

  return(
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Trabajadores Acreditados</h2>
        <button onClick={handleNew} style={{background:C.green,color:'#fff',border:'none',borderRadius:4,padding:'7px 16px',fontWeight:700,cursor:'pointer',fontSize:12}}>+ Agregar trabajador</button>
      </div>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 14px'}}>Si un trabajador no está acreditado, el operador no podrá enviarlo en una solicitud.</p>
      <div style={{display:'flex',gap:10,marginBottom:14}}>
        <div style={{background:C.greenL,borderRadius:4,padding:'8px 14px',fontSize:13}}><strong style={{color:C.green}}>{acred}</strong> <span style={{color:C.textS}}>acreditados</span></div>
        <div style={{background:C.redL,borderRadius:4,padding:'8px 14px',fontSize:13}}><strong style={{color:C.red}}>{noAcred}</strong> <span style={{color:C.textS}}>no acreditados</span></div>
      </div>

      {showForm&&(
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>{editId?'Editar':'Agregar'} Trabajador</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>RUT *</label><input value={form.rut} onChange={e=>setForm(f=>({...f,rut:formatRUT(e.target.value)}))} placeholder="XX.XXX.XXX-X" style={{...inp,fontFamily:'monospace'}}/>{form.rut&&<div style={{fontSize:10,marginTop:2,color:validRUT(form.rut)?C.green:C.red}}>{validRUT(form.rut)?'✓':'✗ Inválido'}</div>}</div>
            <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Nombre *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre completo" style={inp}/></div>
            <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Empresa contratista</label>
              <select value={form.empresa_rut} onChange={e=>{const emp=empresas.find(x=>x.rut===e.target.value);setForm(f=>({...f,empresa_rut:e.target.value,empresa_nombre:emp?.nombre||''}))}} style={inp}>
                <option value="">Seleccione...</option>{empresas.map(e=><option key={e.rut} value={e.rut}>{e.nombre}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Mandante</label>
              <select value={form.mandante} onChange={e=>setForm(f=>({...f,mandante:e.target.value}))} style={inp}>
                <option value="">Todos / Sin asignar</option>{['Telefónica Móviles Chile S.A.','Entel PCS','Claro Chile S.A.','WOM S.A.'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Vencimiento acreditación</label><input type="date" value={form.vencimiento} onChange={e=>setForm(f=>({...f,vencimiento:e.target.value}))} style={inp}/></div>
            <div style={{display:'flex',alignItems:'center',gap:12,paddingTop:16}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
                <input type="checkbox" checked={form.acreditado} onChange={e=>setForm(f=>({...f,acreditado:e.target.checked}))} style={{width:16,height:16,cursor:'pointer'}}/>
                <span style={{fontWeight:600,color:form.acreditado?C.green:C.red}}>
                  {form.acreditado?'✓ Acreditado':'✗ No acreditado'}
                </span>
              </label>
            </div>
          </div>
          <div style={{marginBottom:14}}><label style={{fontSize:11,color:C.textS,display:'block',marginBottom:3}}>Notas</label><input value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Ej: Documentos vencidos, pendiente renovación..." style={inp}/></div>
          <div style={{display:'flex',gap:8}}><button onClick={handleSave} style={{background:C.green,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',fontWeight:700,cursor:'pointer',fontSize:13}}>💾 Guardar</button><button onClick={()=>setShowForm(false)} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 14px',cursor:'pointer',fontSize:13}}>Cancelar</button></div>
        </div>
      )}

      <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar por nombre, RUT o empresa..." style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:6,padding:'9px 14px',fontSize:13,marginBottom:12,fontFamily:'inherit'}}/>

      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
        <div style={{background:C.gray1,padding:'8px 16px',borderBottom:`1px solid ${C.border}`,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:8,fontSize:11,fontWeight:600,color:C.textS}}>
          <div>RUT</div><div>Nombre</div><div>Empresa</div><div>Estado</div><div></div>
        </div>
        {filtrados.length===0&&<div style={{padding:24,textAlign:'center',color:C.textS}}>No hay trabajadores registrados</div>}
        {filtrados.map(t=>{
          const venc=t.vencimiento&&new Date(t.vencimiento)<new Date()
          return(
            <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:8,padding:'10px 16px',borderBottom:`1px solid ${C.gray2}`,alignItems:'center',background:!t.acreditado?'#FFF8F8':C.white}}>
              <div style={{fontFamily:'monospace',fontSize:12,color:C.textS}}>{t.rut}</div>
              <div style={{fontWeight:600,fontSize:13}}>{t.nombre}</div>
              <div style={{fontSize:12,color:C.textS}}>{t.empresa_nombre||'—'}</div>
              <div>
                <span style={{background:t.acreditado?C.greenL:C.redL,color:t.acreditado?C.green:C.red,borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:700}}>{t.acreditado?'✓ Acreditado':'✗ No acreditado'}</span>
                {venc&&<div style={{fontSize:9,color:C.red,marginTop:2}}>⚠️ Vence: {t.vencimiento}</div>}
                {t.notas&&<div style={{fontSize:10,color:C.textS,marginTop:2}}>{t.notas}</div>}
              </div>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>handleEdit(t)} style={{background:C.blueL,color:C.blue,border:'none',borderRadius:3,padding:'4px 8px',cursor:'pointer',fontSize:11}}>✏️</button>
                <button onClick={()=>handleDelete(t.id)} style={{background:C.redL,color:C.red,border:'none',borderRadius:3,padding:'4px 8px',cursor:'pointer',fontSize:11}}>✕</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
          {[['🔌','Colocalización','Operador debe estar colocalizado en el sitio'],['⏱️','Ventana de trabajo','Duración máxima según tipo de trabajo'],['📅','Conflicto de fechas','Nadie puede tomar fechas ya reservadas en el mismo sitio'],['👷','Acreditación','Trabajadores deben estar acreditados y vigentes'],['📧','Correos obligatorios','Mandante + contratista requeridos'],['📋','RUT formato','XX.XXX.XXX-X obligatorio para empresa y técnicos'],['✅','Nombres obligatorios','Nombre completo requerido para cada técnico']].map(([ic,t,d])=>(
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
