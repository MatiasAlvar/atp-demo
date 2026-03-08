import { C, ESTADO_COLOR, OP_SHORT, OP_COLOR, SITIOS, daysBetween, VENTANA_MAX } from './data.js'

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

export const SolicitudCard = ({s,onHistorial,onGestionar,showAll=true}) => {
  const empresaNombre = s.empresaNombre || s.empresa
  const sitio = SITIOS.find(x=>x.id===s.sitio)
  return (
    <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.gray2}`,background:C.white,transition:'background 0.15s'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontWeight:700,fontSize:13,color:C.red}}>{s.id}</span>
          {s.refCliente&&<span style={{fontSize:11,background:'#E8EAF6',color:'#3949AB',borderRadius:3,padding:'1px 7px',fontFamily:'monospace'}}>{s.refCliente}</span>}
          <AutoPill auto={s.auto}/>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {onHistorial&&<button onClick={()=>onHistorial(s)} style={{color:C.red,background:'transparent',border:`1px solid ${C.red}`,borderRadius:3,padding:'3px 9px',fontSize:11,fontWeight:600,cursor:'pointer'}}>Ver historial</button>}
          {onGestionar&&s.estado==='Validado'&&<button onClick={()=>onGestionar(s)} style={{background:C.orange,color:'#fff',border:'none',borderRadius:3,padding:'3px 9px',fontSize:11,fontWeight:600,cursor:'pointer'}}>🏗️ Gestionar</button>}
          <Badge estado={s.estado}/>
        </div>
      </div>
      {showAll&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:6}}>
        {[['Operador',OP_SHORT[s.operador]||s.operador],['Contratista',empresaNombre||'—'],['Tipo',s.trabajo||'—'],['Técnico',s.trabajadores?.[0]?.nombre||'—']].map(([l,v])=>(
          <div key={l}><span style={{fontWeight:600,fontSize:11,color:C.textS}}>{l}: </span><span style={{fontSize:11}}>{v}</span></div>
        ))}
      </div>}
      {(s.desde||s.hasta)&&<div style={{display:'flex',gap:10,alignItems:'center',marginBottom:4}}>
        <span style={{background:C.blueL,color:C.blue,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:600}}>📅 {s.desde||'—'} → {s.hasta||'—'}</span>
        {s.desde&&s.hasta&&<span style={{fontSize:11,color:C.textS}}>{daysBetween(s.desde,s.hasta)} días · {s.trabajo}</span>}
        {sitio&&<span style={{fontSize:11,color:C.textS}}>· {sitio.nombre}</span>}
      </div>}
      <FlowTracker estado={s.estado}/>
      {s.motivo&&<div style={{fontSize:11,color:C.red,marginTop:3}}>⚠️ {s.motivo}</div>}
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
