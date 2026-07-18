import { useState } from 'react'
import { saveClientId, getRedirectUri } from '../auth/spotify'

interface SetupProps {
  onComplete: () => void
}

export default function Setup({ onComplete }: SetupProps) {
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState('')
  const redirectUri = getRedirectUri()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = clientId.trim()
    if (!trimmed || trimmed.length < 20) {
      setError('That doesn\'t look like a valid Client ID.')
      return
    }
    saveClientId(trimmed)
    onComplete()
  }

  return (
    <div className="login-screen">
      <div className="glass-card setup-card">
        <div className="login-icon">🎵</div>
        <h1>Setup Spicy Player</h1>
        <p className="setup-subtitle">You only need to do this once.</p>

        <div className="setup-steps">
          <div className="setup-step">
            <span className="step-num">1</span>
            <span>
              Go to{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
                developer.spotify.com/dashboard
              </a>
              {' '}and create a new app.
            </span>
          </div>
          <div className="setup-step">
            <span className="step-num">2</span>
            <span>
              In your app settings, add this exact Redirect URI:
              <div className="redirect-uri-box">{redirectUri}</div>
            </span>
          </div>
          <div className="setup-step">
            <span className="step-num">3</span>
            <span>Paste your <strong>Client ID</strong> below.</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <input
            className="setup-input"
            type="text"
            placeholder="Spotify Client ID"
            value={clientId}
            onChange={(e) => { setClientId(e.target.value); setError('') }}
            spellCheck={false}
            autoComplete="off"
          />
          {error && <p className="setup-error">{error}</p>}
          <button className="login-btn" type="submit">
            Continue →
          </button>
        </form>
      </div>
    </div>
  )
}
