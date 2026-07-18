import { useEffect, useState } from 'react'
import { handleCallback, redirectToAuth, getAccessToken } from './auth/spotify'
import Player from './components/Player'
import Login from './components/Login'
import './styles/global.css'

export default function App() {
  const [token, setToken] = useState<string | null>(getAccessToken())

  useEffect(() => {
    // Handle OAuth callback
    if (window.location.pathname === '/callback') {
      handleCallback().then((t) => {
        if (t) {
          setToken(t)
          window.history.replaceState({}, '', '/')
        }
      })
    }
  }, [])

  if (!token) {
    return <Login onLogin={redirectToAuth} />
  }

  return <Player token={token} onLogout={() => {
    localStorage.clear()
    setToken(null)
  }} />
}
