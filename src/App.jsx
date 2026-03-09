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

  // Handle propietario action from email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const id     = params.get('id')
    if (action && id) {
      // Auto-login as propietario for email link flow
      const propUser = { username: 'merced', ...USERS['merced'] }
      handleLogin(propUser)
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
