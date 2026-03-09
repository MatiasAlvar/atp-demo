import { C, ESTADO_COLOR, OP_SHORT, OP_COLOR, SITIOS, daysBetween, formatDuration } from './data.js'

export const Badge = ({estado,small}) => {
  const s=ESTADO_COLOR[estado]||{bg:C.gray4,t:'#fff'}
  return <span style={{background:s.bg,color:s.t,borderRadius:3,padding:small?'2px 7px':'3px 10px',fontSize:small?10:11,fontWeight:700,letterSpacing:0.3,whiteSpace:'nowrap'}}>{estado?.toUpperCase()}</span>
}

export const KpiCard = ({icon,value,label,color=C.red,sub}) => (
  <div style={{flex:1,background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'14px 16px',borderTop:`3px solid ${color}`,minWidth:110}}>
    <div style={{fontSize:18,marginBottom:3}}>{icon}</div>
    <div style={{fontSize:24,fontWeight:800,color,fontFamily:'monospace'}}>{value}</div>
    <div style={{fontSize:10,color:C.textS,marginTop:2,textTransform:'uppercase',letterSpacing:0.3}}>{label}</div>
    {sub&&<div style={{fontSize:10,color:C.green,marginTop:2}}>{sub}</div>}
  </div>
)

export const ATPLogo = ({size=1}) => (
  <div style={{display:'flex',alignItems:'center',gap:6*size}}>
    <div style={{width:36*size,height:36*size,background:C.red,borderRadius:4*size,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <span style={{color:'#fff',fontWeight:900,fontSize:14*size,letterSpacing:-1}}>ATP</span>
    </div>
    <div style={{lineHeight:1.1}}>
      <div style={{fontSize:10*size,fontWeight:700,color:C.red}}>ATP</div>
      <div style={{fontSize:8*size,color:C.gray4}}>TORRE Y SITIOS</div>
    </div>
  </div>
)

export const AutoPill = ({auto}) => auto
  ? <span style={{background:C.amberL,color:C.amber,border:`1px solid #FFE082`,borderRadius:10,padding:'1px 8px',fontSize:10,fontWeight:700}}>⚡ AUTO</span>
  : <span style={{background:C.gray2,color:C.gray4,borderRadius:10,padding:'1px 8px',fontSize:10}}>MANUAL</span>

export const FlowTracker = ({estado}) => {
  const steps=['Enviado','En Validación','Validado','En Gestión Propietario','Autorizado']
  const idx=steps.indexOf(estado),isRech=estado==='Rechazado'
  return (
    <div style={{display:'flex',alignItems:'center',gap:0,marginTop:6}}>
      {steps.map((s,i)=>{
        const done=idx>i,active=idx===i,col=ESTADO_COLOR[s]?.bg||C.gray3
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

export const SolicitudCard = ({s,onHistorial,onGestionar,onDetalle,showAll=true}) => {
  const sitio=SITIOS.find(x=>x.id===s.sitio)
  return (
    <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.gray2}`,background:C.white,cursor:onDetalle?'pointer':'default'}} onClick={onDetalle?()=>onDetalle(s):undefined}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span>
          {s.refCliente&&<span style={{fontSize:11,background:'#E8EAF6',color:'#3949AB',borderRadius:3,padding:'1px 7px',fontFamily:'monospace'}}>{s.refCliente}</span>}
          <AutoPill auto={s.auto}/>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
          {onHistorial&&<button onClick={()=>onHistorial(s)} style={{color:C.red,background:'transparent',border:`1px solid ${C.red}`,borderRadius:3,padding:'3px 9px',fontSize:11,fontWeight:600,cursor:'pointer'}}>Historial</button>}
          {onGestionar&&s.estado==='Validado'&&<button onClick={()=>onGestionar(s)} style={{background:C.orange,color:'#fff',border:'none',borderRadius:3,padding:'3px 9px',fontSize:11,fontWeight:600,cursor:'pointer'}}>🏗️ Gestionar</button>}
          <Badge estado={s.estado}/>
        </div>
      </div>
      {showAll&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:6}}>
        {[['Operador',OP_SHORT[s.operador]||s.operador],['Contratista',s.empresaNombre||s.empresa||'—'],['Tipo',s.trabajo||'—'],['Técnico',s.trabajadores?.[0]?.nombre||'—']].map(([l,v])=>(
          <div key={l}><span style={{fontWeight:600,fontSize:11,color:C.textS}}>{l}: </span><span style={{fontSize:11}}>{v}</span></div>
        ))}
      </div>}
      {(s.desde||s.hasta)&&<div style={{display:'flex',gap:10,alignItems:'center',marginBottom:4}}>
        <span style={{background:C.blueL,color:C.blue,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:600}}>📅 {s.desde||'—'} → {s.hasta||'—'}</span>
        {s.desde&&s.hasta&&<span style={{fontSize:11,color:C.textS}}>{daysBetween(s.desde,s.hasta)} días</span>}
        {sitio&&<span style={{fontSize:11,color:C.textS}}>· {sitio.nombre}</span>}
      </div>}
      <FlowTracker estado={s.estado}/>
      {s.motivo&&<div style={{fontSize:11,color:C.red,marginTop:3}}>⚠️ {s.motivo}</div>}
    </div>
  )
}

export const DetalleModal = ({sol,onClose}) => {
  if (!sol) return null
  const sitio = SITIOS.find(s=>s.id===sol.sitio)
  return (
    <div style={{position:'fixed',inset:0,background:'#00000077',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div style={{background:'#fff',borderRadius:8,width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 8px 32px #0003'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff',zIndex:1}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:C.red}}>{sol.id}</div>
            {sol.refCliente&&<div style={{fontSize:12,color:C.textS,fontFamily:'monospace'}}>Ref: {sol.refCliente}</div>}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Badge estado={sol.estado}/>
            <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:22,color:C.gray4}}>×</button>
          </div>
        </div>
        <div style={{padding:20}}>
          <FlowTracker estado={sol.estado}/>
          <div style={{height:1,background:C.border,margin:'16px 0'}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            {[
              ['Operador',OP_SHORT[sol.operador]||sol.operador],
              ['Empresa contratista',sol.empresaNombre||sol.empresa||'—'],
              ['RUT empresa',sol.empresa||'—'],
              ['Tipo de trabajo',sol.trabajo||'—'],
              ['Sitio',sol.sitio+(sitio?` — ${sitio.nombre}`:'')],
              ['Zona',sol.zona||'—'],
              ['Desde',sol.desde||'—'],
              ['Hasta',sol.hasta||'—'],
              ['Correo mandante',sol.correoMandante||'—'],
              ['Correo contratista',sol.correoContratista||'—'],
            ].map(([l,v])=>(
              <div key={l} style={{background:C.gray1,borderRadius:4,padding:'8px 12px'}}>
                <div style={{fontSize:10,color:C.textS,fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div>
                <div style={{fontSize:12,fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
          {sitio&&<div style={{background:C.amberL,border:'1px solid #FFE082',borderRadius:6,padding:'10px 14px',marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:12,color:C.amber,marginBottom:4}}>📍 Información del sitio</div>
            <div style={{fontSize:12,color:C.textS}}>Propietario: <strong>{sitio.propietario}</strong> · Contacto: {sitio.contacto} · {sitio.tel}</div>
            {sitio.comentario&&<div style={{fontSize:11,color:C.textS,marginTop:4,fontStyle:'italic'}}>💬 {sitio.comentario}</div>}
          </div>}
          {sol.trabajadores?.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>👷 Personal técnico ({sol.trabajadores.length})</div>
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:4,overflow:'hidden'}}>
              {sol.trabajadores.map((t,i)=>(
                <div key={i} style={{padding:'8px 12px',borderBottom:i<sol.trabajadores.length-1?`1px solid ${C.gray2}`:'none',fontSize:12,display:'flex',gap:10}}>
                  <span style={{fontWeight:600}}>{t.nombre||'Sin nombre'}</span>
                  <span style={{color:C.textS,fontFamily:'monospace'}}>{t.rut||'—'}</span>
                </div>
              ))}
            </div>
          </div>}
          {sol.historial?.length>0&&<div>
            <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>📋 Historial</div>
            {sol.historial.map((h,i)=>(
              <div key={i} style={{display:'flex',gap:10,paddingBottom:10}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:ESTADO_COLOR[h.estado]?.bg||C.gray4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700,flexShrink:0}}>{i+1}</div>
                <div style={{paddingTop:2}}>
                  <div style={{display:'flex',gap:6,marginBottom:2}}><Badge estado={h.estado} small/><AutoPill auto={h.auto}/></div>
                  <div style={{fontSize:11,color:C.textS}}>{h.fecha}</div>
                </div>
              </div>
            ))}
          </div>}
          {sol.tsEnviado&&sol.tsAutorizado&&<div style={{background:C.greenL,borderRadius:4,padding:'8px 12px',fontSize:12,marginTop:10}}>
            ⏱️ <strong style={{color:C.green}}>Tiempo total:</strong> {formatDuration(new Date(sol.tsAutorizado)-new Date(sol.tsEnviado))} desde envío hasta autorización
          </div>}
        </div>
        <div style={{padding:'12px 20px',borderTop:`1px solid ${C.border}`,textAlign:'right'}}>
          <button onClick={onClose} style={{background:C.red,color:'#fff',border:'none',borderRadius:4,padding:'8px 20px',fontWeight:700,cursor:'pointer'}}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export const Notif = ({notif}) => notif ? (
  <div style={{position:'fixed',top:64,right:20,zIndex:999,background:C.white,border:`1px solid ${notif.type==='success'?C.green:C.red}`,borderRadius:6,padding:'12px 18px',fontSize:13,color:notif.type==='success'?C.green:C.red,fontWeight:600,boxShadow:'0 4px 16px #0002',maxWidth:440}}>
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
