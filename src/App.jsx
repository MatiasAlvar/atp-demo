import { useState, useEffect } from 'react'
import { USERS } from './shared/data.js'
import { GlobalStyle } from './shared/components.jsx'
import LoginPage from './LoginPage.jsx'
import ViewATP from './views/ViewATP.jsx'
import ViewOperador from './views/ViewOperador.jsx'
import ViewPropietario from './views/ViewPropietario.jsx'

const SESSION_KEY = 'atp_session'

export default function App() {
  const [user, setUser] = useState(() => {
    try { const s=sessionStorage.getItem(SESSION_KEY); return s?JSON.parse(s):null } catch { return null }
  })

  function handleLogin(userData) {
    setUser(userData)
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData)) } catch {}
  }

  function handleLogout() {
    setUser(null)
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }

  // Handle propietario action from email link (?id=SOL-001&action=autorizar|rechazar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const id     = params.get('id')
    if ((action === 'autorizar' || action === 'rechazar') && id) {
      // Buscar qué propietario tiene ese sitio
      // Lo encontramos buscando en USERS cuál tiene ese sitio
      // Por ahora usamos 'merced' como default, pero ViewPropietario
      // filtra por sitios del propietario — si no lo tiene, mostrará sin pendientes
      // En el futuro se puede expandir con más propietarios
      const propUser = { username: 'merced', ...USERS['merced'] }
      handleLogin(propUser)
      // Guardamos la acción en sessionStorage para que ViewPropietario la lea
      try { sessionStorage.setItem('atp_pending_action', JSON.stringify({ id, action })) } catch {}
    }
  }, [])

  if (!user) return <LoginPage onLogin={handleLogin}/>

  return (
    <>
      <GlobalStyle/>
      {user.role === 'atp'         && <ViewATP        user={user} onLogout={handleLogout}/>}
      {user.role === 'operador'    && <ViewOperador    user={user} onLogout={handleLogout}/>}
      {user.role === 'propietario' && <ViewPropietario user={user} onLogout={handleLogout}/>}
    </>
  )
}
