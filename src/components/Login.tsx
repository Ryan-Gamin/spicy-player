interface LoginProps {
  onLogin: () => void
  onReset: () => void
}

export default function Login({ onLogin, onReset }: LoginProps) {
  return (
    <div className="login-screen">
      <div className="glass-card login-card">
        <div className="login-icon">🎵</div>
        <h1>Spicy Player</h1>
        <p>Beautiful lyrics powered by the community</p>
        <button className="login-btn" onClick={onLogin}>
          Connect Spotify
        </button>
        <button className="reset-btn" onClick={onReset}>
          Change Client ID
        </button>
      </div>
    </div>
  )
}
