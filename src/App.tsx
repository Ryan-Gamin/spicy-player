import { useEffect, useState } from 'react'
import { handleCallback, redirectToAuth, getAccessToken, getClientId } from './auth/spotify'
import Player from './components/Player'
import Login from './components/Login'
import Setup from './components/Setup'
import './styles/global.css'

type AppState = 'setup' | 'login' | 'player'

function getInitialState(): AppState {
  if (!getClientId()) return 'setup'
  if (!getAccessToken()) return 'login'
  return 'player'
}

export default function App() {
  const [state, setState] = useState<AppState>('login') // temp until effect runs
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Handle OAuth callback
    if (window.location.pathname === '/callback') {
      handleCallback().then((t) => {
        window.history.replaceState({}, '', '/')
        if (t) {
          setToken(t)
          setState('player')
        } else {
          setState('login')
        }
      })
      return
    }

    const initial = getInitialState()
    if (initial === 'player') {
      setToken(getAccessToken())
    }
    setState(initial)
  }, [])

  if (state === 'setup') {
    return (
      <Setup
        onComplete={() => setState('login')}
      />
    )
  }

  if (state === 'login') {
    return (
      <Login
        onLogin={redirectToAuth}
        onReset={() => {
          localStorage.removeItem('spotify_client_id')
          setState('setup')
        }}
      />
    )
  }

  return (
    <Player
      token={token!}
      onLogout={() => {
        localStorage.removeItem('spotify_token')
        localStorage.removeItem('spotify_token_expiry')
        setToken(null)
        setState('login')
      }}
    />
  )
}
