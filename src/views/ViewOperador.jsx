import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase, getSolicitudes, upsertSolicitud, fromDb, getAlertas, getTrabajadores, getEmpresas, upsertEmpresa, upsertTrabajador } from '../lib/supabase.js'
import { SITIOS, COLOCALIZACIONES, EMPRESAS_DEFAULT, TIPOS_TRABAJO, VENTANA_MAX, TRABAJO_INFORMAL, ZONAS, ESTADO_COLOR, C, OP_COLOR, OP_SHORT, validarSolicitud, daysBetween, nextId, formatRUT, validRUT } from '../shared/data.js'
import { ATPLogo, Badge, AutoPill, FlowTracker, SolicitudCard, DetalleModal, Notif, GlobalStyle } from '../shared/components.jsx'
import { enviarCorreoPropietario } from '../lib/email.js'

// Helper inline para evitar problemas de bundling
const fmtDur = (ms) => {
  if (!ms || ms <= 0) return '—'
  const m = Math.round(ms / 60000)
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60), rm = m % 60
  if (h < 24) return rm > 0 ? h + 'h ' + rm + 'm' : h + 'h'
  return Math.floor(h / 24) + 'd'
}


const APIKEY_KEY = 'atp_apikey'

export default function ViewOperador({ user, onLogout }) {
  const [view, setView]             = useState('lista')
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]       = useState(true)
  const [notif, setNotif]           = useState(null)
  const [detalleSol, setDetalleSol] = useState(null)
  const [preFilledData, setPreFilledData] = useState(null)
  const [apiKey, setApiKey]         = useState(() => { try { return localStorage.getItem(APIKEY_KEY)||'' } catch { return '' } })
  const [showApiKey, setShowApiKey] = useState(false)
  const [filterEst, setFilterEst]   = useState('')
  const [trabajadores, setTrabajadores] = useState([])
  const [empresas, setEmpresas]     = useState([])
  const [alertas, setAlertas]       = useState([])

  function showNotif(msg, type='success') { setNotif({msg,type}); setTimeout(()=>setNotif(null),5000) }

  async function cargar() {
    const [data, trabs, emps] = await Promise.all([getSolicitudes(), getTrabajadores(), getEmpresas()])
    setSolicitudes(data.map(fromDb).filter(s => s.operador === user.operador))
    setTrabajadores(trabs)
    setEmpresas(emps)
    setLoading(false)
  }

  async function cargarAlertas() {
    try {
      const alts = await getAlertas()
      setAlertas(alts.filter(a => a.estado === 'activo'))
    } catch(e) { console.error('alertas error', e) }
  }

  useEffect(() => {
    cargar()
    cargarAlertas()
    const ch = supabase.channel('op-' + Math.random())
      .on('postgres_changes', { event:'*', schema:'public', table:'solicitudes' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const mySitios = SITIOS.filter(s => (COLOCALIZACIONES[s.id]||[]).includes(user.operador))
  const filtradas = solicitudes.filter(s => !filterEst || s.estado === filterEst)
  const aut  = solicitudes.filter(s=>s.estado==='Autorizado').length
  const pend = solicitudes.filter(s=>['Enviado','En Validación','Validado','En Gestión Propietario'].includes(s.estado)).length

  return (
    <div style={{background:C.gray1,minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',Arial,sans-serif",color:C.text}}>
      <GlobalStyle/>
      <Notif notif={notif}/>

      {detalleSol && <DetalleModal sol={detalleSol} onClose={()=>setDetalleSol(null)}/>}

      {showApiKey && (
        <div style={{position:'fixed',inset:0,background:'#00000055',display:'flex',alignItems:'center',justifyContent:'center',zIndex:600}}>
          <div style={{background:'#fff',borderRadius:8,padding:28,width:440,boxShadow:'0 8px 32px #0003'}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>⚙️ API Key — Carga con IA</div>
            <p style={{fontSize:12,color:C.textS,margin:'0 0 12px'}}>Ingresa tu API Key de Anthropic para habilitar la carga automática de formularios con IA.</p>
            <input type="password" value={apiKey} onChange={e=>{setApiKey(e.target.value);try{localStorage.setItem(APIKEY_KEY,e.target.value)}catch{}}} placeholder="sk-ant-api03-..." style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'9px 12px',fontSize:13,marginBottom:12,fontFamily:'monospace'}}/>
            <button onClick={()=>setShowApiKey(false)} style={{width:'100%',background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 0',fontWeight:700,cursor:'pointer'}}>Guardar y cerrar</button>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:52,display:'flex',alignItems:'center',padding:'0 20px',gap:12,position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px #0001'}}>
        <ATPLogo scale={0.9}/>
        <div style={{width:1,height:24,background:C.border}}/>
        <div style={{background:OP_COLOR[user.operador]+'22',color:OP_COLOR[user.operador],borderRadius:10,padding:'2px 12px',fontSize:11,fontWeight:700}}>{OP_SHORT[user.operador]||user.operador}</div>
        <div style={{flex:1}}/>
        <button onClick={()=>setShowApiKey(o=>!o)} style={{background:apiKey?C.greenL:C.redL,border:`1px solid ${apiKey?C.green:C.red}44`,borderRadius:20,padding:'3px 12px',fontSize:11,color:apiKey?C.green:C.red,fontWeight:700,cursor:'pointer'}}>⚙️ IA {apiKey?'✓':''}</button>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,background:OP_COLOR[user.operador]||C.red,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12}}>{user.avatar?.slice(0,2)}</div>
          <span style={{fontSize:13,fontWeight:500}}>{user.name}</span>
        </div>
        <button onClick={onLogout} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'5px 12px',cursor:'pointer',fontSize:12,color:C.textS}}>Salir</button>
      </div>

      <div style={{display:'flex',flex:1}}>
        {/* Sidebar */}
        <div style={{width:200,background:C.white,borderRight:`1px solid ${C.border}`,padding:'12px 0',flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:700,color:C.gray4,letterSpacing:1,padding:'0 14px 8px',textTransform:'uppercase'}}>Portal Operador</div>
          {[
            {id:'lista', icon:'📋', label:'Mis Solicitudes'},
            {id:'nueva', icon:'➕', label:'Nueva Solicitud'},
            {id:'ia',    icon:'✨', label:'Carga con IA', badge:'IA',badgeColor:C.purple},
          ].map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 14px',background:view===n.id?'#FFEBEE':C.white,borderLeft:view===n.id?`3px solid ${C.red}`:'3px solid transparent',cursor:'pointer'}}>
              <span style={{fontSize:13}}>{n.icon}</span>
              <span style={{fontSize:12,fontWeight:view===n.id?700:400,color:view===n.id?C.red:C.text,flex:1}}>{n.label}</span>
              {n.badge&&<span style={{background:n.badgeColor+'22',color:n.badgeColor,borderRadius:8,padding:'0 5px',fontSize:9,fontWeight:700}}>{n.badge}</span>}
            </div>
          ))}
          <div style={{margin:'16px 10px 0',padding:10,background:C.gray1,borderRadius:6}}>
            <div style={{fontSize:10,color:C.textS,marginBottom:6,fontWeight:600}}>Mis accesos</div>
            {[['Total',solicitudes.length,C.blue],['Autorizados',aut,C.green],['Pendientes',pend,C.orange]].map(([l,v,col])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:12}}><span style={{color:C.textS}}>{l}</span><strong style={{color:col}}>{v}</strong></div>
            ))}
            <div style={{marginTop:8,fontSize:10,color:C.textS}}>Sitios disponibles: <strong style={{color:OP_COLOR[user.operador]}}>{mySitios.length}</strong></div>
          </div>
        </div>

        <div style={{flex:1,padding:22,overflowY:'auto',maxHeight:'calc(100vh - 52px)'}}>
          {loading && <div style={{textAlign:'center',padding:48,color:C.textS}}>Cargando...</div>}

          {!loading && view==='lista' && (
            <div style={{animation:'fadeIn 0.3s ease'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div>
                  <h2 style={{margin:'0 0 2px',fontSize:18,fontWeight:700}}>Mis Solicitudes de Acceso</h2>
                  <p style={{margin:0,fontSize:13,color:C.textS}}>{OP_SHORT[user.operador]} · {solicitudes.length} solicitudes</p>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{setPreFilledData(null);setView('nueva')}} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Nueva solicitud</button>
                  <button onClick={()=>setView('ia')} style={{background:C.purpleL,color:C.purple,border:`1px solid ${C.purple}44`,borderRadius:4,padding:'8px 14px',fontWeight:700,fontSize:13,cursor:'pointer'}}>✨ Carga con IA</button>
                </div>
              </div>
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                {['','Autorizado','En Gestión Propietario','Validado','Rechazado','Enviado'].map(e=>(
                  <button key={e} onClick={()=>setFilterEst(e)} style={{background:filterEst===e?(ESTADO_COLOR[e]?.bg||C.red):'transparent',color:filterEst===e?'#fff':C.textS,border:`1px solid ${filterEst===e?(ESTADO_COLOR[e]?.bg||C.red):C.border}`,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    {e||'Todos'}{e?` (${solicitudes.filter(s=>s.estado===e).length})`:` (${solicitudes.length})`}
                  </button>
                ))}
              </div>
              <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,overflow:'hidden'}}>
                {filtradas.length===0
                  ? <div style={{padding:32,textAlign:'center',color:C.textS}}>No hay solicitudes {filterEst&&`con estado "${filterEst}"`}</div>
                  : filtradas.map(s=><SolRow key={s.id} s={s} onClick={()=>setDetalleSol(s)}/>)
                }
              </div>
            </div>
          )}

          {!loading && view==='nueva' && (
            <FormNuevaSolicitud
              user={user} solicitudes={solicitudes} setSolicitudes={setSolicitudes}
              trabajadores={trabajadores} empresas={empresas} setEmpresas={setEmpresas}
              alertas={alertas}
              showNotif={showNotif} onBack={()=>{setView('lista');setPreFilledData(null)}}
              initialData={preFilledData}
            />
          )}

          {!loading && view==='ia' && (
            <TabIA apiKey={apiKey} onPreFill={d=>{setPreFilledData(d);setView('nueva')}} showNotif={showNotif}/>
          )}
        </div>
      </div>
    </div>
  )
}

// ── FILA SOLICITUD ────────────────────────────────────────────
function SolRow({ s, onClick }) {
  const durMs = s.tsEnviado && s.tsAutorizado ? new Date(s.tsAutorizado) - new Date(s.tsEnviado) : null
  return (
    <div onClick={onClick} style={{padding:'12px 18px',borderBottom:`1px solid ${C.gray2}`,background:C.white,cursor:'pointer',transition:'background 0.1s'}}
      onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'} onMouseLeave={e=>e.currentTarget.style.background=C.white}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span>
          {s.refCliente&&<span style={{fontSize:10,background:'#E8EAF6',color:'#3949AB',borderRadius:3,padding:'1px 6px',fontFamily:'monospace'}}>{s.refCliente}</span>}
          {s.auto&&<span style={{background:C.amberL,color:C.amber,borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:700}}>⚡ AUTO</span>}
        </div>
        <Badge estado={s.estado}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6,fontSize:12}}>
        <div><span style={{color:C.textS}}>Sitio: </span><strong>{s.sitio}</strong></div>
        <div><span style={{color:C.textS}}>Trabajo: </span>{s.trabajo}</div>
        <div><span style={{color:C.textS}}>Contratista: </span>{s.empresaNombre||s.empresa||'—'}</div>
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <span style={{background:C.blueL,color:C.blue,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:600}}>📅 {s.desde||'—'} → {s.hasta||'—'}</span>
        {durMs&&<span style={{fontSize:11,color:C.green}}>⏱️ {fmtDur(durMs)}</span>}
        <span style={{fontSize:11,color:C.textS,marginLeft:'auto'}}>👁 Ver detalle</span>
      </div>
    </div>
  )
}

// ── FORMULARIO ────────────────────────────────────────────────
function FormNuevaSolicitud({ user, solicitudes, setSolicitudes, trabajadores, empresas, setEmpresas, alertas, showNotif, onBack, initialData }) {
  const [form, setForm] = useState({
    operador: user.operador,
    empresa: initialData?.rut_empresa || '',
    empresaNombre: initialData?.empresa_contratista || '',
    sitio: initialData?.sitio_id || '',
    trabajo: initialData?.tipo_trabajo || '',
    zona: initialData?.zona || '',
    desde: initialData?.fecha_desde || '',
    hasta: initialData?.fecha_hasta || '',
    correoMandante: '',
    correoContratista: '',
    refCliente: '',
    trabajadores: initialData?.personal?.length > 0
      ? initialData.personal.map(p => ({rut: formatRUT(p.rut||''), nombre: p.nombre||''}))
      : [{rut: formatRUT(initialData?.rut_tecnico_responsable||''), nombre: initialData?.nombre_tecnico_responsable||''}],
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState(null)
  const [empresaBusq, setEmpresaBusq] = useState(initialData?.empresa_contratista || '')
  const [showEmpresaDrop, setShowEmpresaDrop] = useState(false)
  const [showNuevaEmpresa, setShowNuevaEmpresa] = useState(false)
  const [nuevaEmpresa, setNuevaEmpresa] = useState({rut:'',nombre:''})
  const [alertaSitio, setAlertaSitio] = useState(null)
  const [showAlerta, setShowAlerta]   = useState(false)

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const mySitios = SITIOS.filter(s => (COLOCALIZACIONES[s.id]||[]).includes(user.operador))

  const empresasFiltradas = useMemo(() => {
    if (!empresaBusq || empresaBusq.length < 2) return []
    return empresas.filter(e =>
      e.nombre.toLowerCase().includes(empresaBusq.toLowerCase()) ||
      e.rut.includes(empresaBusq)
    )
  }, [empresaBusq, empresas])

  function handleSitioChange(sitioId) {
    set('sitio', sitioId)
    const alerta = alertas.find(a => a.sitio_id === sitioId && a.estado === 'activo')
    if (alerta) { setAlertaSitio(alerta); setShowAlerta(true) }
  }

  function handleTrabajadorRUT(i, raw) {
    const formatted = formatRUT(raw)
    const nw = [...form.trabajadores]
    nw[i] = {...nw[i], rut: formatted}
    const match = trabajadores.find(w => w.rut === formatted)
    if (match) nw[i].nombre = match.nombre
    set('trabajadores', nw)
  }

  function acreditado(rut) {
    const w = trabajadores.find(t => t.rut === rut)
    if (!w) return null
    return w.acreditado
  }

  async function crearEmpresa() {
    if (!validRUT(nuevaEmpresa.rut) || !nuevaEmpresa.nombre) return showNotif('RUT inválido o nombre vacío','error')
    await upsertEmpresa(nuevaEmpresa)
    setEmpresas(prev => [...prev.filter(e => e.rut !== nuevaEmpresa.rut), nuevaEmpresa])
    set('empresa', nuevaEmpresa.rut)
    set('empresaNombre', nuevaEmpresa.nombre)
    setEmpresaBusq(nuevaEmpresa.nombre)
    setShowNuevaEmpresa(false)
    setNuevaEmpresa({rut:'',nombre:''})
    showNotif('✅ Empresa creada','success')
  }

  async function handleSubmit() {
    const trab = form.trabajadores.filter(t => t.nombre && t.rut)
    // Check no-acreditado
    const noAcred = trab.find(t => acreditado(t.rut) === false)
    if (noAcred) {
      showNotif(`❌ ${noAcred.nombre || noAcred.rut} no está acreditado. No se puede enviar la solicitud.`, 'error')
      return
    }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    const v = validarSolicitud({...form, trabajadores: trab}, solicitudes)
    const est = v.ok ? 'En Gestión Propietario' : 'Rechazado'
    const hist = [
      {estado:'Enviado',        fecha: new Date().toLocaleString('es-CL'), auto:false},
      {estado:'En Validación',  fecha: new Date().toLocaleString('es-CL'), auto:true},
      ...(v.ok
        ? [{estado:'Validado',            fecha:new Date().toLocaleString('es-CL'),auto:true},
           {estado:'En Gestión Propietario',fecha:new Date().toLocaleString('es-CL'),auto:true}]
        : [{estado:'Rechazado',           fecha:new Date().toLocaleString('es-CL'),auto:true}]
      ),
    ]
    const sitio = SITIOS.find(s => s.id === form.sitio)
    const sol = {
      id: nextId(solicitudes),
      ...form,
      trabajadores: trab,
      estado: est, auto: true,
      historial: hist,
      motivo: v.ok ? '' : v.motivos?.[0] || '',
      tsEnviado: new Date().toISOString(),
      tsAutorizado: null,
    }
    if (v.ok && sitio) {
      try {
        const { enviarCorreoPropietario } = await import('../lib/email.js')
        await enviarCorreoPropietario({ solicitud: sol, sitio })
      } catch(e) { console.error('Email error:', e) }
    }
    // Auto-registrar trabajadores nuevos (no están en BBDD)
    try {
      for (const t of trab) {
        const yaExiste = trabajadores.some(w => w.rut === t.rut)
        if (!yaExiste && validRUT(t.rut) && t.nombre) {
          const nuevo = {
            id: 'trab-' + t.rut.replace(/[^0-9kK]/g,''),
            rut: t.rut,
            nombre: t.nombre,
            empresa_nombre: form.empresaNombre || '',
            operador: user.operador,
            acreditado: null, // pendiente de acreditación
            vencimiento: '',
            motivo_no_acreditado: 'Pendiente revisión',
          }
          await upsertTrabajador(nuevo)
          setTrabajadores(prev => {
            if (prev.some(w => w.rut === t.rut)) return prev
            return [...prev, nuevo]
          })
        }
      }
    } catch(e){ console.error('auto-register worker:', e) }

    await upsertSolicitud(sol)
    setSolicitudes(s => [sol, ...s])
    setResult(v)
    setSubmitting(false)
  }

  const inp = {width:'100%',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',fontSize:13,color:C.text,background:C.white,fontFamily:'inherit'}
  const lbl = {display:'block',fontSize:11,color:C.textS,marginBottom:5,fontWeight:600}

  if (result) return (
    <div>
      <button onClick={onBack} style={{background:'transparent',border:'none',cursor:'pointer',color:C.red,fontWeight:600,fontSize:13,marginBottom:20,padding:0}}>← Volver</button>
      <div style={{background:result.ok?C.greenL:C.redL,border:`1px solid ${result.ok?C.green:C.red}44`,borderRadius:8,padding:24,maxWidth:600}}>
        <div style={{color:result.ok?C.green:C.red,fontWeight:700,fontSize:16,marginBottom:8}}>
          {result.ok ? '✓ Solicitud enviada exitosamente' : '✗ Solicitud rechazada automáticamente'}
        </div>
        {result.ok && <p style={{color:C.textS,fontSize:13,margin:'0 0 8px'}}>Se envió correo al propietario. Recibirás respuesta en <strong>{form.correoMandante}</strong>.</p>}
        {!result.ok && result.motivos?.map((m,i)=><div key={i} style={{color:C.textS,fontSize:13,marginBottom:4}}>• {m}</div>)}
        <button onClick={onBack} style={{marginTop:14,background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',cursor:'pointer',fontWeight:700}}>Ver mis solicitudes</button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Alerta popup */}
      {showAlerta && alertaSitio && (
        <div style={{position:'fixed',inset:0,background:'#00000066',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
          <div style={{background:'#fff',borderRadius:10,padding:28,maxWidth:440,width:'100%',boxShadow:'0 16px 48px #0003'}}>
            <div style={{fontSize:32,marginBottom:10}}>⚠️</div>
            <div style={{fontWeight:700,fontSize:16,color:C.amber,marginBottom:8}}>Alerta en este sitio</div>
            <div style={{fontWeight:600,marginBottom:6}}>{alertaSitio.titulo}</div>
            <div style={{fontSize:13,color:C.textS,marginBottom:20}}>{alertaSitio.descripcion}</div>
            <button onClick={()=>setShowAlerta(false)} style={{width:'100%',background:C.amber,color:'#fff',border:'none',borderRadius:6,padding:'10px 0',fontWeight:700,cursor:'pointer'}}>Entendido, continuar</button>
          </div>
        </div>
      )}
      {/* Nueva empresa modal */}
      {showNuevaEmpresa && (
        <div style={{position:'fixed',inset:0,background:'#00000066',display:'flex',alignItems:'center',justifyContent:'center',zIndex:998,padding:16}}>
          <div style={{background:'#fff',borderRadius:10,padding:24,maxWidth:400,width:'100%',boxShadow:'0 16px 48px #0003'}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>➕ Agregar empresa contratista</div>
            <div style={{marginBottom:12}}>
              <label style={lbl}>RUT empresa <span style={{color:C.red}}>*</span></label>
              <input value={nuevaEmpresa.rut} onChange={e=>setNuevaEmpresa(n=>({...n,rut:formatRUT(e.target.value)}))} placeholder="XX.XXX.XXX-X" style={{...inp,fontFamily:'monospace'}}/>
              {nuevaEmpresa.rut.length>5&&<div style={{fontSize:11,marginTop:3,color:validRUT(nuevaEmpresa.rut)?C.green:C.red}}>{validRUT(nuevaEmpresa.rut)?'✓ RUT válido':'✗ Formato inválido'}</div>}
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Nombre empresa <span style={{color:C.red}}>*</span></label>
              <input value={nuevaEmpresa.nombre} onChange={e=>setNuevaEmpresa(n=>({...n,nombre:e.target.value}))} placeholder="Ej: TelcoServ SpA" style={inp}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={crearEmpresa} style={{flex:1,background:C.green,color:'#fff',border:'none',borderRadius:4,padding:'9px 0',fontWeight:700,cursor:'pointer'}}>Crear</button>
              <button onClick={()=>setShowNuevaEmpresa(false)} style={{flex:1,background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'9px 0',cursor:'pointer'}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={onBack} style={{width:32,height:32,background:C.red,border:'none',borderRadius:4,cursor:'pointer',color:'#fff',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Nueva Solicitud de Acceso</h2>
        <span style={{marginLeft:'auto',background:C.amberL,color:C.amber,border:'1px solid #FFE082',borderRadius:10,padding:'2px 10px',fontSize:11,fontWeight:700}}>⚡ Validación automática</span>
      </div>
      {initialData && <div style={{background:'#EDE7F6',border:'1px solid #CE93D8',borderRadius:6,padding:'10px 16px',marginBottom:14,fontSize:13}}><span style={{fontSize:18}}>✨</span><strong style={{color:'#4A148C'}}> Pre-llenado por IA</strong> — revisa los campos antes de enviar</div>}

      {/* Ref + correos */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18,marginBottom:12}}>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Código referencia propio <span style={{color:C.gray4,fontWeight:400}}>(opcional)</span></label>
          <input value={form.refCliente} onChange={e=>set('refCliente',e.target.value)} placeholder="Ej: TEF-2026-0234" style={{...inp,maxWidth:360}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={lbl}>Correo Mandante ({OP_SHORT[user.operador]}) <span style={{color:C.red}}>*</span></label><input type="email" value={form.correoMandante} onChange={e=>set('correoMandante',e.target.value)} placeholder="accesos@empresa.cl" style={{...inp,borderColor:!form.correoMandante?C.border+'':C.border}}/></div>
          <div><label style={lbl}>Correo Contratista <span style={{color:C.red}}>*</span></label><input type="email" value={form.correoContratista} onChange={e=>set('correoContratista',e.target.value)} placeholder="ops@contratista.cl" style={inp}/></div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:12}}>
        {/* Empresa */}
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>Datos del Contratista</div>
          <div style={{marginBottom:12}}><label style={lbl}>Mandante</label><div style={{...inp,background:C.gray1,display:'flex',alignItems:'center',gap:8}}><span style={{flex:1,fontSize:12}}>{user.operador}</span><span style={{background:C.greenL,color:C.green,borderRadius:8,padding:'1px 7px',fontSize:10,fontWeight:700}}>Auto</span></div></div>
          <div style={{marginBottom:4,position:'relative'}}>
            <label style={lbl}>Empresa Contratista <span style={{color:C.red}}>*</span></label>
            <input value={empresaBusq}
              onChange={e=>{setEmpresaBusq(e.target.value);set('empresa','');set('empresaNombre','');setShowEmpresaDrop(true)}}
              onFocus={()=>setShowEmpresaDrop(true)}
              placeholder="Buscar por nombre o RUT..." style={inp}/>
            {showEmpresaDrop && empresasFiltradas.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:C.white,border:`1px solid ${C.blue}`,borderRadius:4,boxShadow:'0 4px 12px #0002',zIndex:200,maxHeight:180,overflowY:'auto'}}>
                {empresasFiltradas.map(e=>(
                  <div key={e.rut} onMouseDown={()=>{
                    set('empresa',e.rut); set('empresaNombre',e.nombre)
                    setEmpresaBusq(e.nombre); setShowEmpresaDrop(false)
                  }} style={{padding:'8px 12px',cursor:'pointer',fontSize:12,borderBottom:`1px solid ${C.gray2}`}}
                  onMouseEnter={ev=>ev.currentTarget.style.background=C.blueL}
                  onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                    <div style={{fontWeight:600}}>{e.nombre}</div>
                    <div style={{color:C.textS,fontFamily:'monospace',fontSize:11}}>{e.rut}</div>
                  </div>
                ))}
              </div>
            )}
            {showEmpresaDrop && empresaBusq.length >= 2 && empresasFiltradas.length === 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:C.white,border:`1px solid ${C.border}`,borderRadius:4,padding:'10px 14px',zIndex:200,boxShadow:'0 4px 12px #0002'}}>
                <div style={{fontSize:12,color:C.textS,marginBottom:6}}>No encontrada.</div>
                <button onMouseDown={()=>{setShowEmpresaDrop(false);setShowNuevaEmpresa(true);setNuevaEmpresa({rut:'',nombre:empresaBusq})}} style={{background:C.blue,color:'#fff',border:'none',borderRadius:3,padding:'4px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Crear "{empresaBusq}"</button>
              </div>
            )}
          </div>
          {form.empresa && <div style={{fontSize:11,color:C.green,marginTop:3}}>✓ RUT: <strong style={{fontFamily:'monospace'}}>{form.empresa}</strong></div>}
        </div>

        {/* Trabajo + Fechas */}
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>Información del Requerimiento</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><label style={lbl}>Fecha inicio <span style={{color:C.red}}>*</span></label><input type="date" min={new Date().toISOString().split("T")[0]} value={form.desde} onChange={e=>set('desde',e.target.value)} style={inp}/></div>
            <div><label style={lbl}>Fecha fin <span style={{color:C.red}}>*</span></label><input type="date" min={form.desde||new Date().toISOString().split("T")[0]} value={form.hasta} onChange={e=>set('hasta',e.target.value)} style={inp}/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={lbl}>Tipo de trabajo <span style={{color:C.red}}>*</span></label>
            <select value={form.trabajo} onChange={e=>set('trabajo',e.target.value)} style={{...inp,color:form.trabajo?C.text:C.gray4}}>
              <option value="">Seleccione...</option>
              {TIPOS_TRABAJO.map(t=><option key={t}>{t} (máx. {VENTANA_MAX[t]}d)</option>)}
            </select>
          </div>
          {form.trabajo && <div style={{background:'#EDE7F6',borderRadius:4,padding:'6px 10px',fontSize:11,color:'#4A148C',marginBottom:10}}>💬 {TRABAJO_INFORMAL[form.trabajo]}</div>}
          <div><label style={lbl}>Zona</label><select value={form.zona} onChange={e=>set('zona',e.target.value)} style={{...inp,color:form.zona?C.text:C.gray4}}><option value="">Seleccione...</option>{ZONAS.map(z=><option key={z}>{z}</option>)}</select></div>
        </div>
      </div>

      {/* Sitio */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18,marginBottom:12}}>
        <label style={lbl}>Sitio ATP ({mySitios.length} disponibles para {OP_SHORT[user.operador]}) <span style={{color:C.red}}>*</span></label>
        <select value={form.sitio} onChange={e=>handleSitioChange(e.target.value)} style={{...inp,maxWidth:500,color:form.sitio?C.text:C.gray4,marginBottom:form.sitio?10:0}}>
          <option value="">Buscar sitio...</option>
          {mySitios.map(s=><option key={s.id} value={s.id}>{s.id} — {s.nombre} ({s.regionLabel})</option>)}
        </select>
        {form.sitio && (() => {
          const sitio = SITIOS.find(s => s.id === form.sitio)
          return sitio && (
            <div style={{background:C.amberL,border:'1px solid #FFE082',borderRadius:4,padding:'10px 14px',fontSize:12}}>
              <div style={{fontWeight:600,color:C.amber,marginBottom:2}}>📍 {sitio.nombre}</div>
              <div style={{color:C.textS}}>{sitio.tipo} · {sitio.altTotal}m · {sitio.propietario}</div>
            </div>
          )
        })()}
      </div>

      {/* Personal */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div>
            <div style={{fontWeight:600,fontSize:13}}>Personal técnico <span style={{color:C.red}}>*</span></div>
            <div style={{fontSize:11,color:C.textS,marginTop:2}}>Mínimo 1 persona · Nombre y RUT obligatorios · Formato RUT: XX.XXX.XXX-X</div>
          </div>
          <button onClick={()=>set('trabajadores',[...form.trabajadores,{rut:'',nombre:''}])} style={{background:C.blue,color:'#fff',border:'none',borderRadius:4,padding:'4px 12px',fontSize:12,fontWeight:600,cursor:'pointer'}}>+ Agregar</button>
        </div>
        {form.trabajadores.map((t,i)=>{
          const acc = acreditado(t.rut)
          // Sugerencias por RUT o nombre
          const sugs = trabajadores.filter(w => {
            const q = t.rut.replace(/[.\-]/g,'').toLowerCase()
            const qn = t.nombre.toLowerCase()
            if (q.length >= 3) return w.rut.replace(/[.\-]/g,'').toLowerCase().includes(q)
            if (qn.length >= 2) return w.nombre.toLowerCase().includes(qn)
            return false
          }).slice(0,5)
          const rutValido = validRUT(t.rut)
          const rutEnBBDD = trabajadores.some(w => w.rut === t.rut)
          const showSugs = sugs.length > 0 && (t.rut.length >= 3 || t.nombre.length >= 2) && !rutValido
          const showNuevo = rutValido && !rutEnBBDD && t.nombre.length >= 3

          function autocompletar(w) {
            const nw = [...form.trabajadores]
            nw[i] = { rut: w.rut, nombre: w.nombre }
            set('trabajadores', nw)
          }

          return (
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto auto',gap:8,alignItems:'start'}}>
                <div style={{position:'relative'}}>
                  <input placeholder="RUT (XX.XXX.XXX-X)" value={t.rut}
                    onChange={e=>handleTrabajadorRUT(i,e.target.value)}
                    style={{...inp,fontFamily:'monospace',borderColor:t.rut&&!validRUT(t.rut)?C.orange:validRUT(t.rut)?C.green:C.border}}/>
                  {t.rut && <div style={{fontSize:10,marginTop:2,color:validRUT(t.rut)?C.green:C.orange}}>{validRUT(t.rut)?'✓ RUT válido':'RUT incompleto...'}</div>}
                </div>
                <div style={{position:'relative'}}>
                  <input placeholder="Nombre completo *" value={t.nombre}
                    onChange={e=>{const nw=[...form.trabajadores];nw[i]={...nw[i],nombre:e.target.value};set('trabajadores',nw)}}
                    style={{...inp}}/>
                </div>
                <div style={{paddingTop:6,textAlign:'center',minWidth:90}}>
                  {t.rut && rutValido && (
                    <div style={{fontSize:10,fontWeight:700,color:rutEnBBDD?(acc?C.green:C.red):C.blue}}>
                      {!rutEnBBDD?'🆕 Nuevo':acc?'✅ Acreditado':'❌ No acreditado'}
                    </div>
                  )}
                </div>
                {i>0&&<button onClick={()=>set('trabajadores',form.trabajadores.filter((_,j)=>j!==i))} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'8px',cursor:'pointer',color:C.red,fontSize:12}}>✕</button>}
              </div>
              {/* Trabajador nuevo — RUT válido pero no en BBDD */}
              {showNuevo && (
                <div style={{background:'#E3F2FD',border:`1px solid ${C.blue}`,borderRadius:4,padding:'8px 12px',marginTop:2,fontSize:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🆕 <strong>{t.nombre}</strong> — RUT no está en la BBDD. Se registrará como pendiente de acreditación al enviar la solicitud.</span>
                  <span style={{color:C.blue,fontWeight:700,fontSize:11}}>✓ Se guardará automáticamente</span>
                </div>
              )}
              {/* Sugerencias de autocompletado */}
              {showSugs && (
                <div style={{background:C.white,border:`1px solid ${C.blue}`,borderRadius:4,boxShadow:'0 4px 12px #0002',marginTop:2,zIndex:100,position:'relative'}}>
                  <div style={{padding:'4px 10px',fontSize:10,color:C.textS,borderBottom:`1px solid ${C.gray2}`,fontWeight:600}}>
                    👷 Trabajadores acreditados encontrados — clic para autocompletar
                  </div>
                  {sugs.map(w=>(
                    <div key={w.id} onMouseDown={()=>autocompletar(w)}
                      style={{padding:'7px 12px',cursor:'pointer',fontSize:12,borderBottom:`1px solid ${C.gray2}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.blueL}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div>
                        <strong>{w.nombre}</strong>
                        <span style={{marginLeft:8,fontFamily:'monospace',fontSize:11,color:C.textS}}>{w.rut}</span>
                      </div>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        {w.empresa_nombre&&<span style={{fontSize:10,color:C.textS}}>{w.empresa_nombre}</span>}
                        <span style={{fontSize:10,fontWeight:700,color:w.acreditado?C.green:C.red}}>
                          {w.acreditado?'✅ Acred.':'❌ No acred.'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:12}}>
        <button onClick={onBack} style={{background:'transparent',color:C.red,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,padding:'9px 16px'}}>Cancelar</button>
        <button onClick={handleSubmit} disabled={submitting} style={{background:submitting?C.gray3:C.red,color:submitting?C.gray4:'#fff',border:'none',borderRadius:4,padding:'9px 24px',fontWeight:700,cursor:submitting?'not-allowed':'pointer',fontSize:13}}>
          {submitting ? '⚡ Validando...' : 'Enviar Solicitud →'}
        </button>
      </div>
    </div>
  )
}

// ── TAB IA ────────────────────────────────────────────────────
function TabIA({ apiKey, onPreFill, showNotif }) {
  const [file, setFile]         = useState(null)
  const [fileType, setFileType] = useState(null)
  const [parsing, setParsing]   = useState(false)
  const [parseStep, setParseStep] = useState(0)
  const [parsed, setParsed]     = useState(null)
  const [error, setError]       = useState(null)
  const fileRef = useRef()
  const steps = ['Leyendo estructura del archivo...','Identificando personal y RUTs...','Detectando empresa contratista...','Extrayendo sitio y fechas...','Completando campos...']

  function handleFile(f) { if(!f)return; setFile(f); setFileType(f.name.split('.').pop().toLowerCase()); setParsed(null); setError(null) }

  async function handleParse() {
    if (!file || !apiKey) { setError(!apiKey ? 'Configura tu API key (botón IA en la barra superior)' : 'Selecciona un archivo'); return }
    setParsing(true); setError(null); setParsed(null); setParseStep(0)
    const si = setInterval(() => setParseStep(s => Math.min(s+1, steps.length-1)), 900)
    try {
      const base64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file) })
      const sitiosInfo = SITIOS.map(s=>`${s.id}: ${s.nombre} (${s.regionLabel})`).join('\n')
      const prompt = `Eres un experto extractor de datos para el sistema ATP Chile de acceso a torres de telecomunicaciones.
Del archivo adjunto extrae TODOS los campos posibles. IMPORTANTE: extrae TODOS los técnicos/trabajadores que encuentres, no solo el primero.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin explicaciones:
{
  "rut_empresa": "XX.XXX.XXX-X",
  "empresa_contratista": "Nombre completo de la empresa",
  "fecha_desde": "YYYY-MM-DD",
  "fecha_hasta": "YYYY-MM-DD",
  "tipo_trabajo": "uno de: ${TIPOS_TRABAJO.join(' | ')}",
  "zona": "una de: Sala de equipos | Torre / Estructura | Área exterior | Cuarto técnico | Sala de baterías",
  "sitio_id": "ID del sitio ATP más cercano de la lista",
  "personal": [
    {"nombre": "Nombre Completo", "rut": "XX.XXX.XXX-X"},
    {"nombre": "Nombre Completo 2", "rut": "XX.XXX.XXX-X"}
  ],
  "confianza": "alta | media | baja",
  "notas": "cualquier dato relevante no capturado"
}

Reglas críticas:
- Extrae TODOS los técnicos/trabajadores que encuentres en el archivo (puede haber 5, 10, 25 o más)
- Formatea TODOS los RUTs como XX.XXX.XXX-X (con puntos y guión). Si tiene 7 dígitos en el cuerpo, agrega 0 al inicio.
- Para sitio_id busca coincidencias por nombre, código o ciudad en esta lista:\n${sitiosInfo}
- Para fecha_desde y fecha_hasta usa formato YYYY-MM-DD
- Si no encuentras un campo, déjalo vacío ("")`

      let messages
      const mt = file.type || 'application/octet-stream'
      if (['pdf'].includes(fileType)) {
        messages=[{role:'user',content:[{type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},{type:'text',text:prompt}]}]
      } else if (['png','jpg','jpeg','webp'].includes(fileType)) {
        messages=[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mt.startsWith('image/')?mt:'image/jpeg',data:base64}},{type:'text',text:prompt}]}]
      } else if (['xlsx','xls'].includes(fileType)) {
        // Para Excel: usar SheetJS extrayendo celda por celda (soporta celdas combinadas)
        const arrayBuffer = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsArrayBuffer(file)})
        await new Promise((res,rej)=>{
          if(window.XLSX){res();return}
          const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)
        })
        const wb = window.XLSX.read(arrayBuffer, {type:'array', cellText:true, cellDates:true})
        let excelText = ''
        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName]
          if (!ws || !ws['!ref']) return
          // Extraer todas las celdas con valor, fila por fila
          const range = window.XLSX.utils.decode_range(ws['!ref'])
          const rows = []
          for (let R = range.s.r; R <= range.e.r; R++) {
            const rowVals = []
            for (let C = range.s.c; C <= range.e.c; C++) {
              const cell = ws[window.XLSX.utils.encode_cell({r:R, c:C})]
              rowVals.push(cell ? String(cell.v ?? cell.w ?? '') : '')
            }
            const rowStr = rowVals.filter(v=>v.trim()).join('\t')
            if (rowStr.trim()) rows.push(rowStr)
          }
          if (rows.length > 0) {
            excelText += `\n=== HOJA: ${sheetName} ===\n` + rows.join('\n')
          }
        })
        console.log('Excel extraído, chars:', excelText.length, '\nPrimeros 500:', excelText.slice(0,500))
        messages=[{role:'user',content:`${prompt}\n\nContenido del archivo Excel (${file.name}):\n${excelText.slice(0,15000)}`}]
      } else {
        // Para CSV y otros texto
        const text = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(file,'utf-8')})
        messages=[{role:'user',content:`${prompt}\n\nContenido del archivo (${file.name}, ${fileType.toUpperCase()}):\n${text.slice(0,12000)}`}]
      }
      const res = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1500,messages})})
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const raw = data.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim()
      clearInterval(si); setParseStep(steps.length); setParsed(JSON.parse(raw))
    } catch(e) { clearInterval(si); setError('Error: '+(e.message||'No se pudo procesar.')) }
    setParsing(false)
  }

  return (
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Carga con Inteligencia Artificial</h2>
      <p style={{color:C.textS,fontSize:13,margin:'0 0 16px'}}>Sube una orden de trabajo o Excel y la IA pre-llena el formulario automáticamente.</p>
      <div onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0])}} style={{border:`2px dashed ${file?C.red:C.border}`,borderRadius:8,padding:'28px 24px',textAlign:'center',cursor:'pointer',background:file?'#FFF8F8':'#FAFAFA',marginBottom:14}}>
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
        {file ? <div><div style={{fontSize:32,marginBottom:6}}>{['xlsx','xls','csv'].includes(fileType)?'📊':fileType==='pdf'?'📄':'🖼️'}</div><div style={{color:C.red,fontWeight:700}}>{file.name}</div><div style={{fontSize:11,color:C.textS,marginTop:3}}>{(file.size/1024).toFixed(0)} KB</div></div>
          : <div><div style={{fontSize:32,marginBottom:8}}>📂</div><div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Arrastra tu archivo aquí</div><div style={{color:C.gray4,fontSize:12}}>Excel · CSV · PDF · Imagen (PNG/JPG)</div></div>}
      </div>
      {error && <div style={{background:C.redL,borderRadius:6,padding:'10px 14px',color:C.red,fontSize:13,marginBottom:14}}>⚠️ {error}</div>}
      {file && !parsed && !parsing && <button onClick={handleParse} style={{width:'100%',padding:'11px 0',background:C.red,color:'#fff',border:'none',borderRadius:4,fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:14}}>✨ Analizar con IA</button>}
      {parsing && <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:22,marginBottom:14}}>
        <div style={{textAlign:'center',marginBottom:14}}><div style={{fontSize:28,marginBottom:6}}>✨</div><div style={{color:C.purple,fontWeight:700}}>Procesando con IA...</div></div>
        {steps.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:`1px solid ${C.gray2}`}}>
            <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,background:i<parseStep?C.greenL:i===parseStep?C.purpleL:C.gray2,color:i<parseStep?C.green:i===parseStep?C.purple:C.gray4}}>{i<parseStep?'✓':i===parseStep?'●':'○'}</div>
            <span style={{fontSize:12,color:i<parseStep?C.green:C.text}}>{s}</span>
          </div>
        ))}
      </div>}
      {parsed && <div style={{animation:'fadeIn 0.4s ease'}}>
        <div style={{background:C.greenL,border:`1px solid ${C.green}44`,borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:12,color:C.green}}>
          <strong>✅ Datos extraídos con confianza: {parsed.confianza?.toUpperCase()||'MEDIA'}</strong>
          {parsed.notas&&<div style={{marginTop:4,color:C.textS}}>{parsed.notas}</div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[['Empresa',parsed.empresa_contratista],['RUT',parsed.rut_empresa],['Sitio',parsed.sitio_id],['Trabajo',parsed.tipo_trabajo],['Desde',parsed.fecha_desde],['Hasta',parsed.fecha_hasta],['Técnico',parsed.nombre_tecnico_responsable],['RUT técnico',parsed.rut_tecnico_responsable]].map(([l,v])=>(
            <div key={l} style={{background:C.white,border:`1px solid ${v?C.blue:C.border}`,borderRadius:4,padding:'8px 12px'}}>
              <div style={{fontSize:10,color:C.textS}}>{l}</div>
              <div style={{fontSize:12,fontWeight:600,color:v?C.text:C.gray4}}>{v||'—'}</div>
            </div>
          ))}
        </div>
        {parsed.personal?.length>0&&<div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:12,marginBottom:12,fontSize:12}}>
          <div style={{fontWeight:600,marginBottom:6}}>👥 {parsed.personal.length} persona(s) detectada(s)</div>
          {parsed.personal.map((p,i)=><div key={i} style={{color:C.textS,marginBottom:2}}>{p.nombre} · <span style={{fontFamily:'monospace'}}>{p.rut}</span></div>)}
        </div>}
        <button onClick={()=>onPreFill(parsed)} style={{width:'100%',padding:'12px 0',background:C.red,color:'#fff',border:'none',borderRadius:4,fontWeight:700,fontSize:14,cursor:'pointer'}}>✏️ Pre-llenar formulario →</button>
      </div>}
    </div>
  )
}
