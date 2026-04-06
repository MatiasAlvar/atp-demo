import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase, getSolicitudes, upsertSolicitud, fromDb, getAlertas, getTrabajadores, getEmpresas, upsertEmpresa, upsertTrabajador, getSitiosConfig, getReglasSitios, getDocMensual } from '../lib/supabase.js'
import { TODOS_SITIOS, SITIOS_EXTRA, COLOCALIZACIONES, EMPRESAS_DEFAULT, TIPOS_TRABAJO, VENTANA_MAX, TRABAJO_INFORMAL, ZONAS, ESTADO_COLOR, C, OP_COLOR, OP_SHORT, validarSolicitud, daysBetween, nextId, formatRUT, validRUT } from '../shared/data.js'
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
const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function ViewOperador({ user, onLogout }) {
  const [view, setView]             = useState('lista')
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]       = useState(true)
  const [notif, setNotif]           = useState(null)
  const [detalleSol, setDetalleSol] = useState(null)
  const [chatSol, setChatSol]         = useState(null)
  const [cancelModal, setCancelModal] = useState(null)
  const [borradores, setBorradores]   = useState([])

  async function confirmarCancelacion() {
    if (!cancelModal) return
    await supabase.from('solicitudes').update({estado:'Cancelado'}).eq('id', cancelModal.id)
    setSolicitudes(p => p.map(s => s.id === cancelModal.id ? {...s, estado:'Cancelado'} : s))
    setCancelModal(null)
  }
  function eliminarBorrador(idx) {
    const next = borradores.filter((_, j) => j !== idx)
    setBorradores(next)
    localStorage.setItem('atp_borradores_' + user.operador, JSON.stringify(next))
  }
  const [preFilledData, setPreFilledData] = useState(null)
  const [apiKey, setApiKey]         = useState(() => { try { return localStorage.getItem(APIKEY_KEY)||'' } catch { return '' } })
  const [showApiKey, setShowApiKey] = useState(false)
  const [filterEst, setFilterEst]   = useState('')
  const [trabajadores, setTrabajadores] = useState([])
  const [empresas, setEmpresas]     = useState([])
  const [alertas, setAlertas]       = useState([])
  const [reglas, setReglas]         = useState({})
  const [sitiosConfig, setSitiosConfig] = useState({})

  function showNotif(msg, type='success') { setNotif({msg,type}); setTimeout(()=>setNotif(null),5000) }

  async function cargar() {
    const [data, trabs, emps, reglasData, sitiosCfg] = await Promise.all([
      getSolicitudes(), getTrabajadores(), getEmpresas(),
      getReglasSitios(), getSitiosConfig()
    ])
    setSolicitudes(data.map(fromDb).filter(s => s.operador === user.operador))
    setTrabajadores(trabs)
    setEmpresas(emps)
    setReglas(reglasData)
    setSitiosConfig(sitiosCfg)
    setLoading(false)
    try { setBorradores(JSON.parse(localStorage.getItem('atp_borradores_' + user.operador) || '[]')) } catch(e) {}
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

  const mySitios = TODOS_SITIOS.filter(s => { const cols = COLOCALIZACIONES[s.id]||[]; return cols.length===0 ? true : cols.includes(user.operador) })
  const filtradas = solicitudes.filter(s => !filterEst || s.estado === filterEst)
  const aut  = solicitudes.filter(s=>s.estado==='Autorizado').length
  const pend = solicitudes.filter(s=>['Enviado','En Validación','Validado','En Gestión Propietario'].includes(s.estado)).length

  return (
    <div style={{background:C.gray1,minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:"'Segoe UI',Arial,sans-serif",color:C.text}}>
      <GlobalStyle/>
      <Notif notif={notif}/>

      {detalleSol && <DetalleModal sol={detalleSol} onClose={()=>setDetalleSol(null)}/>}
      {chatSol && <ChatbotAsistente sol={chatSol} sitio={TODOS_SITIOS.find(s=>s.id===chatSol.sitio)} onClose={()=>setChatSol(null)} C={C}/>}
      {cancelModal && (
        <div style={{position:'fixed',inset:0,background:'#00000077',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
          <div style={{background:'#fff',borderRadius:10,padding:28,maxWidth:400,width:'100%',boxShadow:'0 16px 48px #0003'}}>
            <div style={{fontSize:28,textAlign:'center',marginBottom:10}}>🗑</div>
            <div style={{fontWeight:700,fontSize:16,textAlign:'center',marginBottom:8}}>Cancelar solicitud</div>
            <div style={{fontSize:13,color:C.textS,textAlign:'center',marginBottom:20}}>
              La solicitud <strong>{cancelModal.id}</strong> será cancelada y las fechas quedarán disponibles.
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={confirmarCancelacion} style={{flex:1,background:C.red,color:'#fff',border:'none',borderRadius:6,padding:'10px 0',fontWeight:700,cursor:'pointer'}}>
                Sí, cancelar
              </button>
              <button onClick={()=>setCancelModal(null)} style={{flex:1,background:'#F1F5F9',border:'none',borderRadius:6,padding:'10px 0',cursor:'pointer'}}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

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
                  : filtradas.map(s=>(
              <div key={s.id} style={{position:'relative'}}>
                <SolRow s={s} onClick={()=>setDetalleSol(s)}/>
                <button onClick={e=>{e.stopPropagation();setChatSol(s)}} title="Asistente" style={{position:'absolute',top:10,right:10,background:'none',border:'none',cursor:'pointer',fontSize:16}}>💬</button>
                {s.estado !== 'Autorizado' && s.estado !== 'Cancelado' && (
                  <button onClick={e=>{e.stopPropagation();setCancelModal(s)}} title="Cancelar" style={{position:'absolute',top:10,right:40,background:'none',border:'none',cursor:'pointer',fontSize:14,color:C.red}}>✕</button>
                )}
              </div>
            ))
                }
              </div>
              {borradores.length > 0 && (
                <div style={{marginTop:16}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:8}}>Borradores guardados</div>
                  {borradores.map((b, i) => (
                    <div key={i} style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:6,padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{b.sitio || 'Sin sitio'} — {b.trabajo || 'Sin trabajo'}</div>
                        <div style={{fontSize:11,color:C.textS}}>Guardado: {b._savedAt || '—'}</div>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>{setPreFilledData(b);setView('nueva')}} style={{background:'#F59E0B',color:'#fff',border:'none',borderRadius:5,padding:'6px 12px',fontWeight:700,fontSize:12,cursor:'pointer'}}>Continuar</button>
                        <button onClick={()=>eliminarBorrador(i)} style={{background:'#FEE2E2',color:C.red,border:'none',borderRadius:5,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>X</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && view==='nueva' && (
            <FormNuevaSolicitud
              user={user} solicitudes={solicitudes} setSolicitudes={setSolicitudes}
              trabajadores={trabajadores} empresas={empresas} setEmpresas={setEmpresas}
              alertas={alertas} reglas={reglas} sitiosConfig={sitiosConfig}
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

/* ─── CHATBOT RULE-BASED (sin API key) ─────────────────── */
function ChatbotAsistente({ sol, sitio, onClose, C }) {
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: `Hola, soy el asistente de ATP Chile. Puedo responder preguntas sobre la solicitud **${sol?.id || ''}**. ¿En qué le puedo ayudar?` }
  ])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function responder(q) {
    if (!sol) return 'No hay solicitud seleccionada.'
    const ql = q.toLowerCase()
    if (/estado|cómo va|resultado|aprobad|rechazad|autorizado/.test(ql))
      return `El estado actual de la solicitud ${sol.id} es **${sol.estado}**.${sol.motivoRechazo ? ` Motivo: ${sol.motivoRechazo}` : ''}`
    if (/fecha|cuándo|día|plazo/.test(ql))
      return `La solicitud contempla acceso desde el **${sol.desde || '—'}** hasta el **${sol.hasta || '—'}**.`
    if (/sitio|lugar|dónde|ubicación/.test(ql))
      return `El sitio es **${sol.sitio}**${sitio?.region ? ` (${sitio.region}, ${sitio.comuna})` : ''}. Tipo: ${sitio?.tipo || '—'}.`
    if (/trabajo|faena|qué van|qué se/.test(ql))
      return `El tipo de trabajo es: **${sol.trabajo || '—'}**.`
    if (/empresa|contratista|quién hace/.test(ql))
      return `La empresa contratista es **${sol.empresaNombre || sol.empresa || '—'}**.`
    if (/técnico|personal|trabajador|quién va|rut/.test(ql)) {
      const trab = (sol.trabajadores || []).filter(t => t.nombre)
      if (!trab.length) return 'No hay personal registrado en esta solicitud.'
      return 'Personal técnico:\n' + trab.map(t => `• ${t.nombre} — RUT: ${t.rut || '—'}`).join('\n')
    }
    if (/cuánto demora|tiempo|aprobar/.test(ql))
      return 'El proceso de aprobación depende del propietario del sitio. Habitualmente toma entre 24 y 48 horas hábiles.'
    if (/correo|email|contacto/.test(ql))
      return `Correo mandante: ${sol.correoMandante || '—'}\nCorreo contratista: ${sol.correoContratista || '—'}`
    if (/hola|buenos|buen día|buenas/.test(ql))
      return '¡Hola! Estoy aquí para ayudarle con información sobre su solicitud de acceso.'
    if (/gracias|muchas gracias/.test(ql))
      return 'Con mucho gusto. Quedo a su disposición para cualquier consulta adicional.'
    return 'Puedo responder preguntas sobre: estado, fechas, sitio, tipo de trabajo, personal técnico y empresa contratista. ¿Qué desea saber?'
  }

  function send() {
    if (!input.trim()) return
    const q = input.trim()
    setInput('')
    setMsgs(p => [...p, { from: 'user', text: q }])
    setTimeout(() => {
      setMsgs(p => [...p, { from: 'bot', text: responder(q) }])
    }, 350)
  }

  const Bubble = ({ msg }) => (
    <div style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '80%', padding: '9px 13px', borderRadius: msg.from === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px',
        background: msg.from === 'user' ? C.blue : C.gray1,
        color: msg.from === 'user' ? '#fff' : C.text,
        fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
      }}>
        {msg.text.replace(/\*\*(.*?)\*\*/g, '$1')}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 16px 48px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        <div style={{ padding: '14px 18px', background: C.blue, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>💬 Asistente ATP Chile</div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>{sol?.id} · Consultas sobre su solicitud</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
          <div ref={endRef} />
        </div>
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Escriba su consulta..."
            style={{ flex: 1, padding: '9px 12px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={send} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Enviar</button>
        </div>
      </div>
    </div>
  )
}

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


/* ─── DATE RANGE PICKER — bloquea fechas ocupadas ─────────── */
function DateRangePicker({ desde, hasta, onDesde, onHasta, fechasOcupadas, maxDias, restriccionHoraria, C }) {
  const [mes, setMes] = useState(() => {
    const d = desde ? new Date(desde + 'T12:00:00') : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const hoy = new Date().toISOString().split('T')[0]

  function isBlocked(iso) {
    return fechasOcupadas.some(r => iso >= r.desde && iso <= r.hasta)
  }
  function isPast(iso) { return iso < hoy }
  function isSelected(iso) { return iso === desde || iso === hasta }
  function isInRange(iso) { return desde && hasta && iso > desde && iso < hasta }
  function isConflict(iso) { return isInRange(iso) && isBlocked(iso) }

  const FERIADOS_RH = ['2026-01-01','2026-04-03','2026-04-04','2026-05-01','2026-05-21','2026-06-29','2026-07-16','2026-08-15','2026-09-18','2026-09-19','2026-10-12','2026-10-31','2026-11-01','2026-12-08','2026-12-25']
  const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  function isRestriccion(iso) {
    if (!restriccionHoraria?.activa) return false
    const dow = DIAS_SEMANA[new Date(iso + 'T12:00:00').getDay()]
    if (restriccionHoraria.dias?.length > 0 && !restriccionHoraria.dias.includes(dow)) return true
    if (restriccionHoraria.solo_habiles && FERIADOS_RH.includes(iso)) return true
    return false
  }

  function handleClick(iso) {
    if (isBlocked(iso) || isPast(iso) || isRestriccion(iso)) return
    if (!desde || (desde && hasta)) {
      onDesde(iso); onHasta('')
    } else {
      if (iso < desde) { onDesde(iso); onHasta('') }
      else {
        // Check no blocked dates in range
        const hasBlock = fechasOcupadas.some(r => !(iso < r.desde || desde > r.hasta))
        if (hasBlock) return
        // Check maxDias
        if (maxDias) {
          const dias = Math.ceil((new Date(iso) - new Date(desde)) / 86400000) + 1
          if (dias > maxDias) return
        }
        onHasta(iso)
      }
    }
  }

  const year = mes.getFullYear(), month = mes.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    days.push(iso)
  }

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']

  return (
    <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:'hidden',background:C.white}}>
      {/* Header mes */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:C.gray1,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={()=>setMes(new Date(year,month-1,1))} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:C.textS,padding:'2px 8px'}}>‹</button>
        <span style={{fontWeight:700,fontSize:13}}>{MESES[month]} {year}</span>
        <button onClick={()=>setMes(new Date(year,month+1,1))} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:C.textS,padding:'2px 8px'}}>›</button>
      </div>
      {/* Días semana */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',textAlign:'center',padding:'6px 8px 2px'}}>
        {DIAS.map(d=><div key={d} style={{fontSize:10,fontWeight:700,color:C.textS,padding:'2px 0'}}>{d}</div>)}
      </div>
      {/* Días */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',padding:'0 8px 10px',gap:2}}>
        {days.map((iso,i) => {
          if (!iso) return <div key={i}/>
          const blocked  = isBlocked(iso)
          const past     = isPast(iso)
          const selStart = iso === desde
          const selEnd   = iso === hasta
          const inRange  = isInRange(iso)
          const exceedsMax = maxDias && desde && !hasta && iso > desde &&
            Math.ceil((new Date(iso) - new Date(desde)) / 86400000) + 1 > maxDias
          const restriccion = isRestriccion(iso)
          const disabled = blocked || past || exceedsMax || restriccion
          const bg = selStart||selEnd ? C.red : inRange ? C.redL : blocked ? '#FFCDD2' : restriccion ? '#E5E7EB' : exceedsMax ? '#F3F4F6' : 'transparent'
          const color = selStart||selEnd ? '#fff' : blocked ? C.red : past||exceedsMax||restriccion ? C.gray3 : C.text
          const title = blocked ? 'Fecha reservada' : restriccion ? 'Día no permitido en este sitio' : ''
          return (
            <div key={iso} title={title} onClick={()=>handleClick(iso)} style={{
              textAlign:'center',padding:'5px 2px',borderRadius:4,fontSize:12,fontWeight:(selStart||selEnd)?700:400,
              background:bg,color,cursor:disabled?'not-allowed':'pointer',
              border:selStart||selEnd?`1px solid ${C.red}`:'1px solid transparent',
              position:'relative',
            }}>
              {iso.split('-')[2].replace(/^0/,'')}
              {blocked && <div style={{position:'absolute',bottom:1,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:'50%',background:C.red}}/>}
            </div>
          )
        })}
      </div>
      {/* Leyenda */}
      <div style={{padding:'6px 14px 10px',display:'flex',gap:14,fontSize:11,color:C.textS,borderTop:`1px solid ${C.border}`,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:'#FFCDD2'}}/> Bloqueado</div>
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:C.red}}/> Seleccionado</div>
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:C.redL}}/> Rango</div>
        {maxDias && <div style={{display:'flex',alignItems:'center',gap:4,color:C.orange,fontWeight:600}}>⏱ Máx. {maxDias} día{maxDias>1?'s':''} para este trabajo</div>}
        {restriccionHoraria?.activa && <div style={{display:'flex',alignItems:'center',gap:4,color:C.textS}}>
          <div style={{width:10,height:10,borderRadius:2,background:'#E5E7EB',border:'1px solid #D1D5DB'}}/> Día restringido
        </div>}
      </div>
    </div>
  )
}


/* ─── TAB EMPRESAS HABILITADAS ──────────────────────────── */
function TabEmpresasHabilitadas({ user, C, showNotif }) {
  const KEY = 'atp_empresas_' + (user.operador || 'global')
  const [lista, setLista]     = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } })
  const [loading, setLoading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      // Load SheetJS from CDN
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      const buf = await file.arrayBuffer()
      const wb  = window.XLSX.read(buf)
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const rows = window.XLSX.utils.sheet_to_json(ws, { defval: '' })
      const parsed = rows.map(r => {
        const nombre = (r['empresa contratista'] || r['Empresa Contratista'] || r['nombre'] || r['Nombre'] || Object.values(r)[0] || '').toString().trim()
        const rut    = (r['rut'] || r['RUT'] || r['Rut'] || Object.values(r)[1] || '').toString().trim()
        return { nombre, rut }
      }).filter(r => r.nombre && r.rut)
      if (!parsed.length) { showNotif('❌ Sin datos válidos. Columnas: "empresa contratista" y "rut"', 'error'); setLoading(false); return }
      setLista(parsed)
      localStorage.setItem(KEY, JSON.stringify(parsed))
      showNotif(`✅ ${parsed.length} empresas cargadas para ${user.operador}`, 'success')
    } catch(err) { showNotif('❌ Error leyendo el archivo: ' + err.message, 'error') }
    setLoading(false)
    e.target.value = ''
  }

  return (
    <div style={{padding:'20px 24px'}}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>🏢 Empresas Habilitadas</div>
      <div style={{fontSize:12,color:C.textS,marginBottom:16}}>
        Carga el Excel mensual de empresas autorizadas para <strong>{user.operador}</strong>.<br/>
        Columnas requeridas: <code style={{background:C.gray1,padding:'1px 4px',borderRadius:3}}>empresa contratista</code> y <code style={{background:C.gray1,padding:'1px 4px',borderRadius:3}}>rut</code>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:20,alignItems:'center'}}>
        <label style={{background:C.blue,color:'#fff',borderRadius:5,padding:'8px 18px',fontWeight:700,fontSize:13,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7}}>
          📂 {loading ? 'Cargando...' : 'Subir Excel (.xlsx / .csv)'}
          <input type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFile} disabled={loading}/>
        </label>
        {lista.length > 0 && (
          <button onClick={()=>{setLista([]);localStorage.removeItem(KEY);showNotif('Lista limpiada','success')}}
            style={{background:C.redL,color:C.red,border:`1px solid ${C.red}44`,borderRadius:5,padding:'8px 14px',fontWeight:600,fontSize:13,cursor:'pointer'}}>
            Limpiar ({lista.length})
          </button>
        )}
      </div>
      {lista.length === 0
        ? <div style={{background:C.gray1,borderRadius:8,padding:24,textAlign:'center',color:C.textS,fontSize:13}}>
            <div style={{fontSize:28,marginBottom:8}}>📋</div>
            Sin lista cargada — se mostrarán todas las empresas del sistema.
          </div>
        : <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',background:C.gray1,borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
              <span style={{fontWeight:700,fontSize:13}}>{lista.length} empresas habilitadas</span>
            </div>
            <div style={{maxHeight:360,overflowY:'auto'}}>
              {lista.map((e,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 16px',borderBottom:`1px solid ${C.gray2}`,fontSize:13}}>
                  <span style={{fontWeight:500}}>{e.nombre}</span>
                  <span style={{fontFamily:'monospace',color:C.textS,fontSize:12}}>{e.rut}</span>
                </div>
              ))}
            </div>
          </div>
      }
    </div>
  )
}

/* ─── SITIO SEARCHBOX — combobox con 772 sitios ─────────── */
function SitioSearchBox({ sitios, value, onChange, inp, C }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef(null)

  const selected = sitios.find(s => s.id === value)

  const filtered = useMemo(() => {
    if (!q || q.length < 1) return sitios.slice(0, 60)
    const ql = q.toLowerCase()
    return sitios.filter(s =>
      s.nombre.toLowerCase().includes(ql) ||
      s.id.toLowerCase().includes(ql) ||
      (s.region||'').toLowerCase().includes(ql) ||
      (s.comuna||'').toLowerCase().includes(ql) ||
      (s.codigo||'').toLowerCase().includes(ql)
    ).slice(0, 100)
  }, [q, sitios])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{position:'relative',maxWidth:560}}>
      <input
        value={focused ? q : (selected ? `${selected.id} — ${selected.nombre}` : q)}
        onChange={e => { setQ(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
        onFocus={() => { setFocused(true); setQ(''); setOpen(true) }}
        onBlur={() => setFocused(false)}
        placeholder="Buscar por nombre, ID, región, comuna..."
        style={{...inp, width:'100%', borderColor: value ? C.green : open ? C.blue : undefined}}
      />
      {value && !open && (
        <button onClick={() => { onChange(''); setQ(''); setOpen(true) }}
          style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.textS,fontSize:16,lineHeight:1}}>×</button>
      )}
      {open && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:`1px solid ${C.blue}`,borderRadius:6,boxShadow:'0 6px 20px #0003',zIndex:300,maxHeight:260,overflowY:'auto'}}>
          <div style={{padding:'6px 12px',fontSize:11,color:C.textS,borderBottom:`1px solid ${C.border}`,background:'#FAFAFA'}}>
            {q.length > 0 ? `${filtered.length} resultados para "${q}"` : `Mostrando ${filtered.length} de ${sitios.length} sitios — escribe para filtrar`}
          </div>
          {filtered.length === 0
            ? <div style={{padding:'12px 16px',fontSize:12,color:C.textS}}>Sin resultados</div>
            : filtered.map(s => (
              <div key={s.id} onMouseDown={() => { onChange(s.id); setQ(''); setOpen(false); setFocused(false) }}
                style={{padding:'9px 14px',cursor:'pointer',borderBottom:`1px solid ${C.gray2}`,background: s.id===value ? C.amberL : 'transparent'}}
                onMouseEnter={e => e.currentTarget.style.background = C.blueL||'#EEF2FF'}
                onMouseLeave={e => e.currentTarget.style.background = s.id===value ? C.amberL : 'transparent'}>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontFamily:'monospace',fontSize:11,color:C.amber,fontWeight:700,flexShrink:0}}>{s.id}</span>
                  <span style={{fontWeight:600,fontSize:13,color:C.text}}>{s.nombre}</span>
                </div>
                <div style={{fontSize:11,color:C.textS,marginTop:2}}>{s.region} · {s.comuna} · {s.tipo}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}


/* ─── NORMALIZAR NOMBRE DOCUMENTO ───────────────────────── */
function normalizeDocName(docTipo, fileName, rut) {
  const ext = fileName.split('.').pop().toLowerCase()
  const base = docTipo
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 40)
  const rutClean = (rut || '').replace(/[^0-9kK]/g, '')
  return rutClean ? `${base}_${rutClean}.${ext}` : `${base}.${ext}`
}

function rutInFilename(fileName, trabajadores) {
  if (!trabajadores?.length) return true // no hay técnicos aún, no bloquear
  const fileL = fileName.toLowerCase().replace(/[^0-9k]/g, '')
  return trabajadores.some(t => {
    const rut = (t.rut || '').replace(/[^0-9kK]/g, '').toLowerCase()
    return rut && rut.length > 3 && fileL.includes(rut)
  })
}

function FormNuevaSolicitud({ user, solicitudes, setSolicitudes, trabajadores, empresas, setEmpresas, alertas, reglas, sitiosConfig, showNotif, onBack, initialData }) {
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
    horaInicio: '',
    horaFin: '',
    trabajadores: initialData?.personal?.length > 0
      ? initialData.personal.map(p => ({rut: formatRUT(p.rut||''), nombre: p.nombre||''}))
      : [{rut: formatRUT(initialData?.rut_tecnico_responsable||''), nombre: initialData?.nombre_tecnico_responsable||''}],
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState(null)
  const [empresaBusq, setEmpresaBusq] = useState(initialData?.empresa_contratista || '')
  const [docsConfirmados, setDocsConfirmados] = useState([])
  const [showEmpresaDrop, setShowEmpresaDrop] = useState(false)
  const [showNuevaEmpresa, setShowNuevaEmpresa] = useState(false)
  const [nuevaEmpresa, setNuevaEmpresa] = useState({rut:'',nombre:''})
  const [alertaSitio, setAlertaSitio] = useState(null)
  const [showAlerta, setShowAlerta]   = useState(false)
  const [fechasOcupadas, setFechasOcupadas] = useState([])  // [{desde,hasta,id,estado}]
  const [loadingFechas, setLoadingFechas]   = useState(false)
  const [sitioBloquedoModal, setSitioBloquedoModal] = useState(null)
  const [docsUploaded, setDocsUploaded]             = useState({})  // {docName: filename string}
  const [docsFiles, setDocsFiles]                   = useState({})  // {docName: actual File object}
  const [docWarnings, setDocWarnings]               = useState({})  // {docName: warningMsg}
  const [docInvalid, setDocInvalid]                 = useState({})  // {docName: true if AI rejected}
  const [docValidating, setDocValidating]           = useState({})  // {docName: true while checking}

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const mySitios = TODOS_SITIOS.filter(s => { const cols = COLOCALIZACIONES[s.id]||[]; return cols.length===0 ? true : cols.includes(user.operador) })

  const [empresasOperador, setEmpresasOperador] = useState([])
  useEffect(() => {
    supabase.from('empresas_contratistas').select('nombre,rut').eq('cliente_id', user.operador)
      .then(({ data }) => { if (data && data.length) setEmpresasOperador(data) })
  }, [user.operador])

  const empresasDelOperador = useMemo(() => {
    if (empresasOperador.length > 0) return empresasOperador
    return empresas
  }, [empresas, empresasOperador])

  const empresasFiltradas = useMemo(() => {
    if (!empresaBusq || empresaBusq.length < 2) return []
    return empresasDelOperador.filter(e =>
      e.nombre.toLowerCase().includes(empresaBusq.toLowerCase()) ||
      e.rut.includes(empresaBusq)
    )
  }, [empresaBusq, empresasDelOperador])

  async function handleSitioChange(sitioId) {
    set('sitio', sitioId)
    set('desde', '')
    set('hasta', '')
    setFechasOcupadas([])
    setDocsUploaded({})
    setDocsFiles({})
    setDocInvalid({})
    setDocWarnings({})
    if (!sitioId) return
    // Verificar si sitio está bloqueado
    const cfgBloqueo = sitiosConfig[sitioId]
    if (cfgBloqueo?.bloqueado) {
      setSitioBloquedoModal({ motivo: cfgBloqueo.motivo_bloqueo || 'Este sitio está temporalmente bloqueado por ATP Chile.' })
      set('sitio', '')
      return
    }
    // Cargar fechas ocupadas desde Supabase
    setLoadingFechas(true)
    try {
      const { data } = await supabase
        .from('solicitudes')
        .select('id,desde,hasta,estado,empresa_nombre')
        .eq('sitio_id', sitioId)
        .in('estado', ['Autorizado','En Gestión Propietario','Validado','Enviado','En Validación'])
      setFechasOcupadas((data||[]).filter(r => r.desde && r.hasta))
    } catch(e) { console.error(e) }
    setLoadingFechas(false)
    // Alertas
    const alerta = alertas.find(a => a.sitio_id === sitioId && a.estado === 'activo')
    if (alerta) { setAlertaSitio(alerta); setShowAlerta(true); return }
    const cfg = sitiosConfig[sitioId]
    if (cfg?.alerta_texto) {
      setAlertaSitio({ titulo: '⚠️ Observación contractual', descripcion: cfg.alerta_texto })
      setShowAlerta(true)
    }
  }

  function hayConflictoFechas(desde, hasta) {
    if (!desde || !hasta) return null
    return fechasOcupadas.find(r => !(hasta < r.desde || desde > r.hasta))
  }

  // Validar fechas contra reglas del sitio
  function validarFechasConReglas(desde, hasta, sitioId) {
    const regla = reglas[sitioId]
    if (!regla || (!regla.no_fines_semana && !regla.solo_dias_habiles && !regla.hora_inicio)) return null

    const FERIADOS_CL_2026 = ['2026-01-01','2026-04-03','2026-04-04','2026-05-01','2026-05-21','2026-06-29','2026-07-16','2026-08-15','2026-09-18','2026-09-19','2026-10-12','2026-10-31','2026-11-01','2026-12-08','2026-12-25']

    if (regla.no_fines_semana || regla.solo_dias_habiles) {
      const d = new Date(desde + 'T12:00:00')
      const h = new Date(hasta + 'T12:00:00')
      const dias = []
      for (let dt = new Date(d); dt <= h; dt.setDate(dt.getDate()+1)) {
        dias.push(new Date(dt))
      }
      for (const dia of dias) {
        const dow = dia.getDay()
        const iso = dia.toISOString().split('T')[0]
        if (regla.no_fines_semana && (dow === 0 || dow === 6))
          return `Este sitio no permite acceso los fines de semana. Selecciona fechas de lunes a viernes.`
        if (regla.solo_dias_habiles && FERIADOS_CL_2026.includes(iso))
          return `El ${iso} es feriado. Este sitio solo permite acceso en días hábiles.`
      }
    }
    return null
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

  function guardarBorrador() {
    const borrador = {...form, _savedAt: new Date().toLocaleString('es-CL')}
    const key = 'atp_borradores_' + user.operador
    let prev = []
    try { prev = JSON.parse(localStorage.getItem(key) || '[]') } catch(e) {}
    localStorage.setItem(key, JSON.stringify([...prev, borrador]))
    showNotif('Borrador guardado', 'success')
  }

  async function validarDocConIA(docTipo, file) {
    const apiKey = localStorage.getItem('atp_apikey')
    if (!apiKey) return null // sin key, skip
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: `Eres un validador de documentos laborales. Analiza el PDF adjunto y responde SOLO con JSON sin markdown: {"valido": bool, "tipo_detectado": string, "razon": string}. El documento debe ser de tipo: "${docTipo}"` }
            ]
          }]
        })
      })
      const data = await resp.json()
      const text = data.content?.[0]?.text || '{}'
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch { return null }
  }

  async function handleSubmit() {
    const trab = form.trabajadores.filter(t => t.nombre && t.rut)
    if (trab.length === 0) { showNotif('❌ Debes indicar al menos un técnico con nombre y RUT', 'error'); return }
    // Check no-acreditado
    const noAcred = trab.find(t => acreditado(t.rut) === false)
    if (noAcred) {
      showNotif(`❌ ${noAcred.nombre || noAcred.rut} no está acreditado. No se puede enviar la solicitud.`, 'error')
      return
    }
    // Validar docs requeridos
    const docsReq = sitiosConfig[form.sitio]?.docs_requeridos || []
    const docsFaltantes = docsReq.filter(d => !docsFiles[d])
    if (docsFaltantes.length > 0) {
      showNotif(`❌ Faltan documentos: ${docsFaltantes.join(', ')}`, 'error')
      return
    }
    // Validar horas
    if (!form.horaInicio || !form.horaFin) { showNotif('❌ Ingresa la hora de ingreso y salida', 'error'); return }
    if (form.desde === form.hasta && form.horaFin <= form.horaInicio) { showNotif('❌ La hora de salida debe ser mayor a la hora de ingreso', 'error'); return }
    // Validar contra restricción horaria del sitio (sitiosConfig)
    const rh = sitiosConfig[form.sitio]?.restriccion_horaria
    if (rh?.activa && rh.hora_desde && rh.hora_hasta) {
      if (form.horaInicio < rh.hora_desde) { showNotif(`❌ Hora de ingreso fuera del rango permitido. Mínimo: ${rh.hora_desde}`, 'error'); return }
      if (form.horaFin > rh.hora_hasta) { showNotif(`❌ Hora de salida fuera del rango permitido. Máximo: ${rh.hora_hasta}`, 'error'); return }
    }
    // Bloquear si hay conflicto de fechas
    const conflicto = hayConflictoFechas(form.desde, form.hasta)
    if (conflicto) {
      showNotif(`❌ Fechas en conflicto con solicitud ${conflicto.id} (${conflicto.desde} → ${conflicto.hasta})`, 'error')
      return
    }
    // Validar reglas del sitio
    if (form.desde && form.hasta && form.sitio) {
      const reglaError = validarFechasConReglas(form.desde, form.hasta, form.sitio)
      if (reglaError) { showNotif(`❌ ${reglaError}`, 'error'); return }
    }
    // Validar documento mensual de autorización
    const docMensual = getDocMensual()
    if (docMensual && docMensual.empresasAutorizadas?.length > 0 && form.empresaNombre) {
      const mesActual = new Date().toISOString().slice(0,7)
      if (docMensual.mes === mesActual) {
        const empAuth = docMensual.empresasAutorizadas.find(e =>
          e.nombre.toLowerCase().includes(form.empresaNombre.toLowerCase()) ||
          form.empresaNombre.toLowerCase().includes(e.nombre.toLowerCase())
        )
        if (!empAuth) {
          showNotif(`❌ "${form.empresaNombre}" no está en el documento de empresas autorizadas para ${mesActual}. Contacte a ATP Chile.`, 'error')
          return
        }
        if (empAuth.tiposAutorizados && empAuth.tiposAutorizados.length > 0 && form.trabajo) {
          const workLabel = form.trabajo.split(' (máx')[0]
          if (!empAuth.tiposAutorizados.some(t => workLabel.startsWith(t) || t.startsWith(workLabel))) {
            showNotif(`❌ "${form.empresaNombre}" no está autorizada para "${workLabel}" este mes. Solo puede realizar: ${empAuth.tiposAutorizados.join(', ')}.`, 'error')
            return
          }
        }
      }
    }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    const v = validarSolicitud({...form, trabajadores: trab}, solicitudes)
    const est = 'En Gestión Propietario'
    const hist = [
      {estado:'Enviado',               fecha: new Date().toLocaleString('es-CL'), auto:false},
      {estado:'En Validación',         fecha: new Date().toLocaleString('es-CL'), auto:true},
      {estado:'Validado',              fecha: new Date().toLocaleString('es-CL'), auto:true},
      {estado:'En Gestión Propietario',fecha: new Date().toLocaleString('es-CL'), auto:true},
    ]
    const sitio = { ...TODOS_SITIOS.find(s => s.id === form.sitio), ...sitiosConfig[form.sitio] }
    const sol = {
      id: nextId(solicitudes),
      ...form,
      trabajadores: trab,
      horaInicio: form.horaInicio,
      horaFin: form.horaFin,
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
          try {
            await supabase.from('trabajadores_acreditados').upsert(
              { rut: nuevo.rut, nombre: nuevo.nombre, empresa_nombre: nuevo.empresa_nombre, operador: nuevo.operador, acreditado: null, vencimiento: '', motivo_no_acreditado: 'Pendiente revisión' },
              { onConflict: 'rut' }
            )
            getTrabajadores().then(trabs => setTrabajadores(trabs))
          } catch(err) { console.error('upsert trabajador:', err) }
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
      {/* Sitio bloqueado modal */}
      {sitioBloquedoModal && (
        <div style={{position:'fixed',inset:0,background:'#00000077',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
          <div style={{background:'#fff',borderRadius:10,padding:28,maxWidth:420,width:'100%',boxShadow:'0 16px 48px #0003'}}>
            <div style={{fontSize:32,marginBottom:10}}>🚫</div>
            <div style={{fontWeight:700,fontSize:17,color:C.red,marginBottom:8}}>Sitio bloqueado</div>
            <div style={{fontSize:14,color:C.textS,marginBottom:20,lineHeight:1.6}}>{sitioBloquedoModal.motivo}</div>
            <button onClick={()=>setSitioBloquedoModal(null)} style={{width:'100%',background:C.red,color:'#fff',border:'none',borderRadius:6,padding:'10px 0',fontWeight:700,cursor:'pointer',fontSize:14}}>Entendido</button>
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

      {/* PASO 1 — SITIO (siempre primero) */}
      <div style={{background:C.white,border:`2px solid ${form.sitio ? C.green : C.border}`,borderRadius:8,padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
          <span style={{background:form.sitio?C.green:C.blue,color:'#fff',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>1</span>
          Seleccionar Sitio <span style={{color:C.red}}>*</span>
        </div>
        <SitioSearchBox sitios={mySitios} value={form.sitio} onChange={id => handleSitioChange(id)} inp={inp} C={C}/>
        {loadingFechas && <div style={{fontSize:12,color:C.textS,marginTop:8}}>⏳ Cargando disponibilidad del sitio...</div>}
        {/* Banner restricción horaria */}
        {form.sitio && sitiosConfig[form.sitio]?.restriccion_horaria?.activa && (() => {
          const r = sitiosConfig[form.sitio].restriccion_horaria
          return (
            <div style={{marginTop:10,background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:6,padding:'10px 14px',fontSize:12,color:'#B45309'}}>
              <div style={{fontWeight:700,marginBottom:4}}>⏰ Restricción horaria en este sitio</div>
              {r.hora_desde && r.hora_hasta && <div>Horario permitido: <strong>{r.hora_desde} – {r.hora_hasta} hrs</strong></div>}
              {r.dias?.length > 0 && <div>Días permitidos: <strong>{r.dias.join(', ')}</strong></div>}
              {r.solo_habiles && <div>Solo días hábiles (sin feriados)</div>}
            </div>
          )
        })()}
        {form.sitio && (() => {
          const sitio = TODOS_SITIOS.find(s => s.id === form.sitio)
          return sitio && (
            <div style={{marginTop:10,background:C.amberL,border:'1px solid #FFE082',borderRadius:6,padding:'10px 14px',fontSize:12}}>
              <div style={{fontWeight:600,color:C.amber,marginBottom:2}}>📍 {sitio.nombre}</div>
              <div style={{color:C.textS}}>{sitio.tipo} · {sitio.alturaTotal}m · {sitio.region}</div>
            </div>
          )
        })()}
        {/* Docs requeridos por sitio */}
        {form.sitio && sitiosConfig[form.sitio]?.docs_requeridos?.length > 0 && (
          <div style={{marginTop:12,background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:6,padding:'12px 14px'}}>
            <div style={{fontWeight:700,fontSize:12,color:'#1D4ED8',marginBottom:10}}>📋 Documentos requeridos por este sitio</div>
            {sitiosConfig[form.sitio].docs_requeridos.map(doc => (
              <div key={doc} style={{marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:'#fff',borderRadius:6,border:`1px solid ${docInvalid[doc]?'#FECACA':docsUploaded[doc]?'#86EFAC':'#E5E7EB'}`}}>
                <div style={{fontSize:12,color:C.text,flex:1}}>
                  {docsUploaded[doc] ? <span style={{color:C.green}}>✓</span> : <span style={{color:C.red}}>⚠</span>} {doc}
                </div>
                <label style={{cursor:'pointer',background:docsUploaded[doc]?C.greenL:C.blueL,color:docsUploaded[doc]?C.green:C.blue,border:'none',borderRadius:4,padding:'4px 10px',fontSize:11,fontWeight:700,flexShrink:0}}>
                  {docsUploaded[doc] ? 'Cambiar' : 'Subir PDF'}
                  <input type="file" accept=".pdf" style={{display:'none'}} onChange={e=>{
                    const f=e.target.files[0]
                    if(!f) return
                    if(f.size>5*1024*1024){alert('El archivo supera 5MB');return}
                    const trab = form.trabajadores?.filter(t=>t.rut)
                    const normalized = normalizeDocName(doc, f.name, trab?.[0]?.rut||'')
                    setDocsUploaded(p=>({...p,[doc]:normalized}))
                    setDocsFiles(p=>({...p,[doc]:f}))  // guardar archivo real
                    const hasRut = rutInFilename(f.name, trab)
                    if (!hasRut && trab?.length > 0) {
                      setDocWarnings(p=>({...p,[doc]:'⚠ El archivo no contiene el RUT del técnico — renombrado automáticamente'}))
                    } else {
                      setDocWarnings(p=>({...p,[doc]:null}))
                    }
                    // Validación IA
                    if (localStorage.getItem('atp_apikey')) {
                      setDocValidating(p=>({...p,[doc]:true}))
                      validarDocConIA(doc, f).then(res => {
                        setDocValidating(p=>({...p,[doc]:false}))
                        if (res && !res.valido) {
                          setDocInvalid(p=>({...p,[doc]:`❌ IA: Documento inválido — ${res.razon} (detectado: ${res.tipo_detectado})`}))
                        } else {
                          setDocInvalid(p=>({...p,[doc]:null}))
                        }
                      }).catch(() => setDocValidating(p=>({...p,[doc]:false})))
                    }
                  }}/>
                </label>
              </div>
              {docValidating[doc] && <div style={{fontSize:11,color:'#6B7280',padding:'2px 4px'}}>⏳ Validando con IA…</div>}
              {docInvalid[doc]    && <div style={{fontSize:11,color:'#B91C1C',padding:'2px 4px',background:'#FEF2F2',borderRadius:3,marginTop:2}}>{docInvalid[doc]}</div>}
              {docWarnings[doc]   && !docInvalid[doc] && <div style={{fontSize:11,color:'#92400E',padding:'2px 4px'}}>{docWarnings[doc]}</div>}
              </div>
            ))}
            {sitiosConfig[form.sitio].docs_requeridos.some(d=>!docsUploaded[d]) && (
              <div style={{fontSize:11,color:'#1D4ED8',marginTop:4}}>Sube todos los documentos para poder enviar la solicitud.</div>
            )}
          </div>
        )}
        {fechasOcupadas.length > 0 && (
          <div style={{marginTop:10,background:'#FFF3E0',border:'1px solid #FFB74D',borderRadius:6,padding:'10px 14px'}}>
            <div style={{fontWeight:700,fontSize:12,color:'#E65100',marginBottom:6}}>📅 Fechas ya reservadas en este sitio:</div>
            {fechasOcupadas.map((r,i) => (
              <div key={i} style={{fontSize:11,color:'#92400E',marginBottom:3,display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontFamily:'monospace',background:'#FFB74D33',borderRadius:3,padding:'1px 5px'}}>{r.desde} → {r.hasta}</span>
                <span style={{color:'#B45309'}}>{r.empresa_nombre||''} · {r.estado}</span>
              </div>
            ))}
            <div style={{fontSize:11,color:'#E65100',marginTop:6,fontStyle:'italic'}}>Selecciona fechas que no se superpongan con las reservas anteriores.</div>
          </div>
        )}
      </div>

      {/* RESTO DEL FORMULARIO — solo visible si hay sitio seleccionado */}
      {form.sitio && <>

      {/* PASO 2 — TIPO DE TRABAJO */}
      <div style={{background:C.white,border:`2px solid ${form.trabajo ? C.green : C.border}`,borderRadius:8,padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
          <span style={{background:form.trabajo?C.green:C.blue,color:'#fff',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>2</span>
          Tipo de trabajo <span style={{color:C.red}}>*</span>
        </div>
        <select value={form.trabajo} onChange={e=>{set('trabajo',e.target.value);set('desde','');set('hasta','')}} style={{...inp,maxWidth:500,color:form.trabajo?C.text:C.gray4}}>
          <option value="">Seleccione tipo de trabajo...</option>
          {TIPOS_TRABAJO.map(t=><option key={t}>{t} (máx. {VENTANA_MAX[t]}d)</option>)}
        </select>
        {form.trabajo && <div style={{marginTop:8,background:'#EDE7F6',borderRadius:4,padding:'8px 12px',fontSize:12,color:'#4A148C'}}>💬 {TRABAJO_INFORMAL[form.trabajo]}</div>}
      </div>

      {/* Ref + correos */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:18,marginBottom:12}}>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Código referencia propio <span style={{color:C.gray4,fontWeight:400}}>(opcional)</span></label>
          <input value={form.refCliente} onChange={e=>set('refCliente',e.target.value)} placeholder="Ej: TEF-2026-0234" style={{...inp,maxWidth:360}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={lbl}>Correo Mandante ({OP_SHORT[user.operador]}) <span style={{color:C.red}}>*</span></label>
            <input type="email" value={form.correoMandante} onChange={e=>set('correoMandante',e.target.value)} placeholder="accesos@empresa.cl" style={{...inp,borderColor:form.correoMandante&&!isValidEmail(form.correoMandante)?C.red:C.border}}/>
            {form.correoMandante && !isValidEmail(form.correoMandante) && <div style={{fontSize:11,color:C.red,marginTop:3}}>⛔ Ingresa un correo válido (ej: nombre@empresa.cl)</div>}
          </div>
          <div>
            <label style={lbl}>Correo Contratista <span style={{color:C.red}}>*</span></label>
            <input type="email" value={form.correoContratista} onChange={e=>set('correoContratista',e.target.value)} placeholder="ops@contratista.cl" style={{...inp,borderColor:form.correoContratista&&!isValidEmail(form.correoContratista)?C.red:C.border}}/>
            {form.correoContratista && !isValidEmail(form.correoContratista) && <div style={{fontSize:11,color:C.red,marginTop:3}}>⛔ Ingresa un correo válido (ej: nombre@empresa.cl)</div>}
          </div>
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
          <div style={{marginBottom:10}}>
            <label style={lbl}>Fechas de acceso <span style={{color:C.red}}>*</span></label>
            {form.desde && form.hasta && <div style={{fontSize:12,color:C.green,marginBottom:6,fontWeight:600}}>📅 {form.desde} → {form.hasta}</div>}
            <DateRangePicker
              key={`${form.sitio}-${fechasOcupadas.length}`}
              desde={form.desde} hasta={form.hasta}
              onDesde={v=>set('desde',v)} onHasta={v=>set('hasta',v)}
              fechasOcupadas={fechasOcupadas}
              maxDias={(() => { const t = form.trabajo; if (!t) return null; const k = t.includes(' (máx') ? t.split(' (máx')[0] : t; return VENTANA_MAX[k] || null })()}
              restriccionHoraria={sitiosConfig[form.sitio]?.restriccion_horaria}
              C={C}
            />
          </div>
          {/* Horas */}
          {form.desde && form.hasta && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
              <div>
                <label style={lbl}>Hora ingreso <span style={{color:C.red}}>*</span></label>
                <input type="time" value={form.horaInicio} onChange={e=>set('horaInicio',e.target.value)} style={inp}
                  min={sitiosConfig[form.sitio]?.restriccion_horaria?.activa ? sitiosConfig[form.sitio].restriccion_horaria.hora_desde : undefined}
                  max={sitiosConfig[form.sitio]?.restriccion_horaria?.activa ? sitiosConfig[form.sitio].restriccion_horaria.hora_hasta : undefined}/>
              </div>
              <div>
                <label style={lbl}>Hora salida <span style={{color:C.red}}>*</span></label>
                <input type="time" value={form.horaFin} onChange={e=>set('horaFin',e.target.value)} style={inp}
                  min={sitiosConfig[form.sitio]?.restriccion_horaria?.activa ? sitiosConfig[form.sitio].restriccion_horaria.hora_desde : undefined}
                  max={sitiosConfig[form.sitio]?.restriccion_horaria?.activa ? sitiosConfig[form.sitio].restriccion_horaria.hora_hasta : undefined}/>
                {form.desde===form.hasta && form.horaInicio && form.horaFin && form.horaFin <= form.horaInicio && (
                  <div style={{fontSize:11,color:C.red,marginTop:3}}>⛔ Hora salida debe ser mayor a hora de ingreso</div>
                )}
              </div>
            </div>
          )}
          {/* Aviso inline de reglas del sitio */}
          {form.desde && form.hasta && form.sitio && (() => {
            const err = validarFechasConReglas(form.desde, form.hasta, form.sitio)
            const regla = reglas[form.sitio]
            return err ? (
              <div style={{background:'#FFF3E0',border:'1px solid #FFB74D',borderRadius:4,padding:'8px 12px',fontSize:12,color:'#E65100',marginBottom:10}}>
                ⛔ {err}
              </div>
            ) : regla && (regla.no_fines_semana || regla.solo_dias_habiles) ? (
              <div style={{background:'#E8F5E9',border:'1px solid #A5D6A7',borderRadius:4,padding:'8px 12px',fontSize:12,color:'#1B5E20',marginBottom:10}}>
                ✅ Fechas válidas según las reglas de este sitio
              </div>
            ) : null
          })()}
          <div><label style={lbl}>Zona</label><select value={form.zona} onChange={e=>set('zona',e.target.value)} style={{...inp,color:form.zona?C.text:C.gray4}}><option value="">Seleccione...</option>{ZONAS.map(z=><option key={z}>{z}</option>)}</select></div>
        </div>
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

      {/* Documentos obligatorios del sitio */}
      {form.sitio && (() => {
        const regla = reglas[form.sitio]
        if (!regla?.docs_requeridos?.length) return null
        const pendientes = regla.docs_requeridos.filter(d => !docsConfirmados.includes(d))
        return (
          <div style={{background: C.white, border: `2px solid ${pendientes.length > 0 ? C.orange : C.green}`, borderRadius: 6, padding: 18, marginBottom: 14}}>
            <div style={{fontWeight: 700, fontSize: 13, marginBottom: 10, color: pendientes.length > 0 ? C.orange : C.green}}>
              {pendientes.length > 0 ? `📄 Documentación obligatoria — ${pendientes.length} pendiente(s)` : '✅ Documentación confirmada'}
            </div>
            <div style={{fontSize: 12, color: C.textS, marginBottom: 10}}>Este sitio requiere que confirmes tener los siguientes documentos antes de enviar:</div>
            {regla.docs_requeridos.map(doc => (
              <label key={doc} style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',padding:'6px 10px',marginBottom:4,borderRadius:4,background:docsConfirmados.includes(doc)?C.greenL:C.gray1,border:`1px solid ${docsConfirmados.includes(doc)?C.green:C.border}`}}>
                <input type="checkbox" checked={docsConfirmados.includes(doc)} onChange={()=>setDocsConfirmados(p=>p.includes(doc)?p.filter(d=>d!==doc):[...p,doc])}/>
                <span style={{fontSize:13,fontWeight:docsConfirmados.includes(doc)?600:400,color:docsConfirmados.includes(doc)?C.green:C.text}}>{doc}</span>
                {docsConfirmados.includes(doc) && <span style={{marginLeft:'auto',color:C.green,fontSize:12}}>✓</span>}
              </label>
            ))}
            {pendientes.length > 0 && <div style={{fontSize:11,color:C.orange,marginTop:6}}>⚠️ Debes confirmar todos los documentos para enviar la solicitud.</div>}
          </div>
        )
      })()}

      </> /* fin form.sitio */}

      <div style={{display:'flex',justifyContent:'flex-end',gap:12}}>
        <button onClick={onBack} style={{background:'transparent',color:C.red,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,padding:'9px 16px'}}>Cancelar</button>
        <button onClick={guardarBorrador} style={{background:'#FEF3C7',color:'#92400E',border:'1px solid #FCD34D',borderRadius:4,padding:'9px 16px',fontWeight:700,fontSize:13,cursor:'pointer'}}>
          Guardar borrador
        </button>
        {(!isValidEmail(form.correoMandante) || !isValidEmail(form.correoContratista)) && (
          <span style={{fontSize:12,color:C.orange,alignSelf:'center'}}>⚠ Completa los correos para continuar</span>
        )}
        {(() => {
          const canSend = !!(
            form.sitio && form.trabajo && form.empresa &&
            form.desde && form.hasta &&
            form.horaInicio && form.horaFin &&
            form.trabajadores.filter(t=>t.nombre&&t.rut).length > 0 &&
            isValidEmail(form.correoMandante) && isValidEmail(form.correoContratista) &&
            !(sitiosConfig[form.sitio]?.docs_requeridos?.some(d => !docsFiles[d])) &&
            !Object.values(docInvalid).some(Boolean) &&
            !hayConflictoFechas(form.desde, form.hasta) &&
            !submitting
          )
          return (
            <button onClick={handleSubmit} disabled={!canSend}
              style={{background:canSend?C.red:C.gray3, color:canSend?'#fff':C.gray4,
                border:'none',borderRadius:4,padding:'9px 24px',fontWeight:700,
                cursor:canSend?'pointer':'not-allowed',fontSize:13,
                transition:'background .15s'}}>
              {submitting ? '⚡ Validando...' : 'Enviar Solicitud →'}
            </button>
          )
        })()}
      </div>
    </div>
  )
}

// ── TAB IA ────────────────────────────────────────────────────
const TIPOS_DOC = [
  { id: 'orden_trabajo', label: 'Orden de Trabajo / Permiso de Acceso', ext: ['pdf','png','jpg','jpeg','xlsx','xls','csv'], keywords: ['orden','trabajo','permiso','acceso','técnico','sitio','contratista'] },
  { id: 'cdt', label: 'Contrato de Trabajo (CDT)', ext: ['pdf'], keywords: ['contrato','trabajo','empleado','sueldo','remuneración','cdt','jornada'] },
  { id: 'acreditacion', label: 'Certificado de Acreditación', ext: ['pdf','png','jpg','jpeg'], keywords: ['acreditación','certificado','capacitación','altura','seguridad'] },
  { id: 'cualquiera', label: 'Cualquier documento (solo extracción)', ext: ['pdf','png','jpg','jpeg','xlsx','xls','csv'], keywords: [] },
]

function TabIA({ apiKey, onPreFill, showNotif }) {
  const [file, setFile]               = useState(null)
  const [fileType, setFileType]       = useState(null)
  const [parsing, setParsing]         = useState(false)
  const [parseStep, setParseStep]     = useState(0)
  const [parsed, setParsed]           = useState(null)
  const [error, setError]             = useState(null)
  const [tipoRequerido, setTipoRequerido] = useState('orden_trabajo')
  const [validacionDoc, setValidacionDoc] = useState(null) // {ok, tipo_detectado, mensaje}
  const fileRef = useRef()
  const steps = ['Verificando tipo de documento...','Leyendo estructura del archivo...','Identificando personal y RUTs...','Detectando empresa contratista...','Extrayendo sitio y fechas...']

  function handleFile(f) {
    if(!f) return
    setFile(f); setFileType(f.name.split('.').pop().toLowerCase())
    setParsed(null); setError(null); setValidacionDoc(null)
  }

  async function handleParse() {
    if (!file || !apiKey) { setError(!apiKey ? 'Configura tu API key (botón IA en la barra superior)' : 'Selecciona un archivo'); return }
    const tipoDoc = TIPOS_DOC.find(t => t.id === tipoRequerido)
    // Validar extensión
    if (tipoDoc && tipoDoc.id !== 'cualquiera' && !tipoDoc.ext.includes(fileType)) {
      setError(`❌ El tipo de documento "${tipoDoc.label}" no acepta archivos .${fileType}. Formatos válidos: ${tipoDoc.ext.join(', ')}`)
      return
    }
    setParsing(true); setError(null); setParsed(null); setValidacionDoc(null); setParseStep(0)
    const si = setInterval(() => setParseStep(s => Math.min(s+1, steps.length-1)), 900)
    try {
      const base64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file) })
      const sitiosInfo = SITIOS.map(s=>`${s.id}: ${s.nombre} (${s.region})`).join('\n')

      // ── PASO 1: Validar tipo de documento (si no es "cualquiera") ──
      if (tipoDoc && tipoDoc.id !== 'cualquiera') {
        const validPrompt = `Analiza este documento y responde SOLO con JSON sin markdown:
{
  "es_tipo_correcto": true/false,
  "tipo_detectado": "descripción breve de qué tipo de documento es",
  "confianza": "alta|media|baja",
  "razon": "explicación breve de por qué sí o no corresponde"
}

El documento DEBE SER: "${tipoDoc.label}"
Palabras clave esperadas: ${tipoDoc.keywords.join(', ')}

Sé estricto: si el documento claramente no corresponde al tipo requerido, devuelve es_tipo_correcto: false.`

        let valMessages
        const mt = file.type || 'application/octet-stream'
        if (['pdf'].includes(fileType)) {
          valMessages=[{role:'user',content:[{type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},{type:'text',text:validPrompt}]}]
        } else if (['png','jpg','jpeg','webp'].includes(fileType)) {
          valMessages=[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mt.startsWith('image/')?mt:'image/jpeg',data:base64}},{type:'text',text:validPrompt}]}]
        } else {
          // Para Excel/CSV, saltamos la validación de tipo
          valMessages = null
        }
        if (valMessages) {
          const valRes = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,messages:valMessages})})
          const valData = await valRes.json()
          if (!valData.error) {
            const valRaw = valData.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim()
            try {
              const valJson = JSON.parse(valRaw)
              setValidacionDoc(valJson)
              if (!valJson.es_tipo_correcto) {
                clearInterval(si); setParsing(false)
                setError(`❌ Documento incorrecto: se esperaba "${tipoDoc.label}" pero se detectó "${valJson.tipo_detectado}". ${valJson.razon}`)
                return
              }
            } catch {}
          }
        }
      }

      // ── PASO 2: Extraer datos ──
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

      {/* Selector tipo de documento requerido */}
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:14,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>📋 ¿Qué tipo de documento vas a subir?</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {TIPOS_DOC.map(t=>(
            <label key={t.id} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'6px 10px',borderRadius:4,background:tipoRequerido===t.id?'#FFF3F3':C.gray1,border:`1px solid ${tipoRequerido===t.id?C.red:C.border}`}}>
              <input type="radio" name="tipoDoc" value={t.id} checked={tipoRequerido===t.id} onChange={()=>setTipoRequerido(t.id)} style={{accentColor:C.red}}/>
              <span style={{fontSize:13,fontWeight:tipoRequerido===t.id?700:400,color:tipoRequerido===t.id?C.red:C.text}}>{t.label}</span>
              <span style={{marginLeft:'auto',fontSize:10,color:C.textS}}>{t.ext.join(', ')}</span>
            </label>
          ))}
        </div>
        {tipoRequerido !== 'cualquiera' && <div style={{marginTop:8,fontSize:11,color:C.textS,background:C.gray1,borderRadius:4,padding:'5px 10px'}}>🔍 La IA verificará que el archivo corresponda a este tipo antes de extraer los datos</div>}
      </div>
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
