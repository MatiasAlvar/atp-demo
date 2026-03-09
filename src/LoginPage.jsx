import { useState } from 'react'
import { USERS, C } from './shared/data.js'
import { ATPLogo, GlobalStyle } from './shared/components.jsx'

export default function LoginPage({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      const user = USERS[usuario.toLowerCase().trim()]
      if (user && user.password === password) {
        onLogin({ username: usuario.toLowerCase().trim(), ...user })
      } else {
        setError('Usuario o contraseña incorrectos')
      }
      setLoading(false)
    }, 600)
  }

  const demoAccounts = [
    { u:'atp',        p:'atp2026',   icon:'🔴', label:'ATP Admin',   desc:'Acceso total al sistema' },
    { u:'telefonica', p:'tef2026',   icon:'🔵', label:'Telefónica',  desc:'Operador — Tarapacá / RM' },
    { u:'entel',      p:'entel2026', icon:'🟢', label:'Entel PCS',   desc:'Operador — Tarapacá / Antofagasta' },
    { u:'claro',      p:'claro2026', icon:'🟠', label:'Claro Chile', desc:'Operador — Tarapacá / RM' },
    { u:'wom',        p:'wom2026',   icon:'🟣', label:'WOM S.A.',    desc:'Operador — Tarapacá / Valparaíso' },
    { u:'merced',     p:'prop2026',  icon:'⚫', label:'Propietario', desc:'Vista propietario — autorizar accesos' },
  ]

  return (
    <div style={{minHeight:'100vh',background:`linear-gradient(135deg, #B71C1C 0%, #E53935 50%, #C62828 100%)`,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <GlobalStyle/>
      <div style={{width:'100%',maxWidth:420}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:70,height:70,background:'rgba(255,255,255,0.15)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',backdropFilter:'blur(10px)'}}>
            <span style={{color:'#fff',fontWeight:900,fontSize:28,letterSpacing:-2}}>ATP</span>
          </div>
          <div style={{color:'#fff',fontWeight:800,fontSize:22,letterSpacing:-0.5}}>Gestión de Accesos</div>
          <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,marginTop:4}}>Plataforma ATP Chile · PrimeCorp SpA</div>
        </div>

        {/* Login card */}
        <div style={{background:'#fff',borderRadius:12,padding:32,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.textS,marginBottom:6}}>USUARIO</label>
              <input value={usuario} onChange={e=>setUsuario(e.target.value)} placeholder="Ingresa tu usuario" autoComplete="username"
                style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:6,padding:'11px 14px',fontSize:14,color:C.text,transition:'border 0.2s'}}
                onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.textS,marginBottom:6}}>CONTRASEÑA</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:6,padding:'11px 14px',fontSize:14,color:C.text,transition:'border 0.2s'}}
                onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
            {error&&<div style={{background:C.redL,border:`1px solid ${C.red}44`,borderRadius:6,padding:'8px 12px',fontSize:12,color:C.red,marginBottom:16}}>⚠️ {error}</div>}
            <button type="submit" disabled={loading||!usuario||!password}
              style={{width:'100%',padding:'12px 0',background:loading?C.gray3:C.red,color:loading?C.gray4:'#fff',border:'none',borderRadius:6,fontWeight:700,fontSize:14,cursor:loading?'wait':'pointer',transition:'all 0.2s'}}>
              {loading ? '⏳ Verificando...' : 'Ingresar →'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textS,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10,textAlign:'center'}}>Cuentas demo</div>
            {demoAccounts.map(a=>(
              <button key={a.u} onClick={()=>{setUsuario(a.u);setPassword(a.p);}}
                style={{width:'100%',display:'flex',alignItems:'center',gap:10,background:usuario===a.u?'#FFF8E1':'#FAFAFA',border:`1px solid ${usuario===a.u?C.amber:C.border}`,borderRadius:6,padding:'8px 12px',cursor:'pointer',marginBottom:6,transition:'all 0.15s'}}>
                <span style={{fontSize:16}}>{a.icon}</span>
                <div style={{flex:1,textAlign:'left'}}>
                  <div style={{fontWeight:700,fontSize:12}}>{a.label}</div>
                  <div style={{fontSize:10,color:C.textS}}>{a.desc}</div>
                </div>
                <div style={{fontSize:10,fontFamily:'monospace',color:C.gray4}}>{a.u} / {a.p}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'rgba(255,255,255,0.6)'}}>
          Automatizado por <strong style={{color:'rgba(255,255,255,0.9)'}}>PrimeCorp SpA ⚡</strong>
        </div>
      </div>
    </div>
  )
}
