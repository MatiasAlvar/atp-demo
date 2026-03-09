import { C, ESTADO_COLOR, OP_SHORT, OP_COLOR, SITIOS, daysBetween, VENTANA_MAX, formatDuration } from './data.js'

export const Badge = ({estado,small}) => {
  const s=ESTADO_COLOR[estado]||{bg:C.gray4,t:'#fff'}
  return <span style={{background:s.bg,color:s.t,borderRadius:3,padding:small?'2px 7px':'3px 10px',fontSize:small?10:11,fontWeight:700,letterSpacing:0.3,whiteSpace:'nowrap'}}>{estado?.toUpperCase()}</span>
}

export const KpiCard = ({icon,value,label,color=C.red,sub}) => (
  <div style={{flex:1,background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'14px 16px',borderTop:`3px solid ${color}`,minWidth:110}}>
    <div style={{fontSize:18,marginBottom:3}}>{icon}</div>
    <div style={{fontSize:22,fontWeight:800,color,fontFamily:'monospace'}}>{value}</div>
    <div style={{fontSize:10,color:C.textS,marginTop:2,textTransform:'uppercase',letterSpacing:0.3}}>{label}</div>
    {sub&&<div style={{fontSize:10,color:C.green,marginTop:2}}>{sub}</div>}
  </div>
)

export const ATPLogo = ({scale=1}) => (
  <div style={{display:'flex',alignItems:'center',gap:6*scale}}>
    <div style={{width:36*scale,height:36*scale,background:C.red,borderRadius:4*scale,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <span style={{color:'#fff',fontWeight:900,fontSize:14*scale,letterSpacing:-1}}>ATP</span>
    </div>
    <div style={{lineHeight:1.1}}>
      <div style={{fontSize:10*scale,fontWeight:700,color:C.red}}>ATP</div>
      <div style={{fontSize:8*scale,color:C.gray4}}>TORRE Y SITIOS</div>
    </div>
  </div>
)

export const AutoPill = ({auto}) => auto
  ? <span style={{background:C.amberL,color:C.amber,border:`1px solid #FFE082`,borderRadius:10,padding:'1px 8px',fontSize:10,fontWeight:700}}>⚡ AUTO</span>
  : <span style={{background:C.gray2,color:C.gray4,borderRadius:10,padding:'1px 8px',fontSize:10}}>MANUAL</span>

export const FlowTracker = ({estado}) => {
  const steps=['Enviado','En Validación','Validado','En Gestión Propietario','Autorizado']
  const idx=steps.indexOf(estado), isRech=estado==='Rechazado'
  return (
    <div style={{display:'flex',alignItems:'center',gap:0,marginTop:6}}>
      {steps.map((s,i)=>{
        const done=idx>i, active=idx===i, col=ESTADO_COLOR[s]?.bg||C.gray3
        return [
          <div key={s} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <div style={{width:18,height:18,borderRadius:'50%',background:isRech?'#eee':done||active?col:C.gray3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#fff',fontWeight:700}}>
              {isRech?'':(done&&!active)?'✓':i+1}
            </div>
            <div style={{fontSize:8,color:(done||active)&&!isRech?col:C.gray4,textAlign:'center',maxWidth:48,lineHeight:1.1}}>{s}</div>
          </div>,
          i<steps.length-1&&<div key={`l-${i}`} style={{height:2,width:10,background:done?col:C.gray3,marginBottom:12}}/>
        ]
      })}
      {isRech&&<div style={{marginLeft:6,fontSize:10,color:C.red,fontWeight:700}}>✗ RECHAZADO</div>}
    </div>
  )
}

export const Notif = ({notif}) => notif ? (
  <div style={{position:'fixed',top:64,right:20,zIndex:999,background:C.white,border:`1px solid ${notif.type==='success'?C.green:C.red}`,borderRadius:6,padding:'12px 18px',fontSize:13,color:notif.type==='success'?C.green:C.red,fontWeight:600,boxShadow:'0 4px 16px #0002',animation:'fadeIn 0.3s ease',maxWidth:440}}>
    {notif.type==='success'?'✓':'✗'} {notif.msg}
  </div>
) : null

export const GlobalStyle = () => (
  <style>{`
    *{box-sizing:border-box}
    body{margin:0;font-family:'Segoe UI',Arial,sans-serif}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    input,select,textarea{font-family:inherit;outline:none}
    button{font-family:inherit}
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-track{background:#f1f1f1}
    ::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}
  `}</style>
)

export const SolicitudCard = ({s, onDetalle, showAll=true}) => {
  const sitio = SITIOS.find(x=>x.id===s.sitio)
  return (
    <div onClick={onDetalle?()=>onDetalle(s):undefined}
      style={{padding:'12px 18px',borderBottom:`1px solid ${C.gray2}`,background:'#fff',cursor:onDetalle?'pointer':'default'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span>
          {s.refCliente&&<span style={{fontSize:11,background:'#E8EAF6',color:'#3949AB',borderRadius:3,padding:'1px 7px',fontFamily:'monospace'}}>{s.refCliente}</span>}
          <AutoPill auto={s.auto}/>
        </div>
        <Badge estado={s.estado}/>
      </div>
      {showAll&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:6,fontSize:12}}>
        <span><span style={{color:C.textS}}>Operador: </span>{s.operador}</span>
        <span><span style={{color:C.textS}}>Contratista: </span>{s.empresaNombre||s.empresa||'—'}</span>
        <span><span style={{color:C.textS}}>Trabajo: </span>{s.trabajo}</span>
        <span><span style={{color:C.textS}}>Sitio: </span>{s.sitio}</span>
      </div>}
      {(s.desde||s.hasta)&&<div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
        <span style={{background:C.blueL,color:C.blue,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:600}}>📅 {s.desde||'—'} → {s.hasta||'—'}</span>
        {s.desde&&s.hasta&&<span style={{fontSize:11,color:C.textS}}>{Math.ceil((new Date(s.hasta)-new Date(s.desde))/86400000)+1} días</span>}
        {sitio&&<span style={{fontSize:11,color:C.textS}}>· {sitio.nombre}</span>}
      </div>}
      <FlowTracker estado={s.estado}/>
      {s.motivo&&<div style={{fontSize:11,color:C.red,marginTop:3}}>⚠️ {s.motivo}</div>}
    </div>
  )
}

export const DetalleModal = ({sol, onClose}) => {
  if (!sol) return null
  const sitio = SITIOS.find(s=>s.id===sol.sitio)
  const durMs = sol.tsEnviado&&sol.tsAutorizado ? new Date(sol.tsAutorizado)-new Date(sol.tsEnviado) : null
  return (
    <div style={{position:'fixed',inset:0,background:'#00000066',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
      <div style={{background:'#fff',borderRadius:10,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 16px 48px #0003'}}>
        <div style={{background:C.red,borderRadius:'10px 10px 0 0',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:'#fff'}}>{sol.id}</div>
            {sol.refCliente&&<div style={{fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:2}}>{sol.refCliente}</div>}
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:16}}>×</button>
        </div>
        <div style={{padding:20}}>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <Badge estado={sol.estado}/>
            {sol.auto&&<span style={{background:C.amberL,color:C.amber,borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:700}}>⚡ Auto</span>}
            {durMs&&<span style={{background:C.greenL,color:C.green,borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:700}}>⏱️ {formatDuration(durMs)}</span>}
          </div>
          <FlowTracker estado={sol.estado}/>
          {sol.motivo&&<div style={{background:C.redL,borderRadius:4,padding:'8px 12px',fontSize:12,color:C.red,marginTop:10}}>⚠️ {sol.motivo}</div>}
          <div style={{height:1,background:C.border,margin:'14px 0'}}/>
          {[['Operador',sol.operador],['Empresa',sol.empresaNombre||sol.empresa||'—'],['Sitio',`${sol.sitio}${sitio?' — '+sitio.nombre:''}`],['Trabajo',sol.trabajo],['Zona',sol.zona||'—'],['Fechas',`${sol.desde||'—'} → ${sol.hasta||'—'}`],['Correo mandante',sol.correoMandante||'—'],['Correo contratista',sol.correoContratista||'—']].map(([l,v])=>(
            <div key={l} style={{display:'flex',gap:10,paddingBottom:8,borderBottom:`1px solid ${C.gray2}`,marginBottom:8,fontSize:13}}>
              <div style={{width:150,color:C.textS,flexShrink:0}}>{l}</div>
              <div style={{fontWeight:500}}>{v}</div>
            </div>
          ))}
          {sol.trabajadores?.length>0&&(
            <div style={{marginTop:12}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>👷 Personal ({sol.trabajadores.length})</div>
              {sol.trabajadores.map((t,i)=>(
                <div key={i} style={{background:C.gray1,borderRadius:4,padding:'6px 10px',marginBottom:4,fontSize:12,display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontWeight:500}}>{t.nombre||'—'}</span>
                  <span style={{fontFamily:'monospace',color:C.textS}}>{t.rut||'—'}</span>
                </div>
              ))}
            </div>
          )}
          {sol.historial?.length>0&&(
            <div style={{marginTop:14}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>📋 Historial</div>
              {sol.historial.map((h,i)=>(
                <div key={i} style={{display:'flex',gap:10,paddingBottom:8,alignItems:'center'}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:ESTADO_COLOR[h.estado]?.bg||C.gray4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1}}><Badge estado={h.estado} small/>{h.auto&&<span style={{marginLeft:4,fontSize:10,color:C.amber}}>⚡</span>}</div>
                  <div style={{fontSize:11,color:C.textS}}>{h.fecha}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:'12px 20px',borderTop:`1px solid ${C.border}`,textAlign:'right'}}>
          <button onClick={onClose} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',fontWeight:700,cursor:'pointer'}}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
