interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="login-screen">
      <div className="glass-card login-card">
        <div className="login-icon">🎵</div>
        <h1>Spicy Player</h1>
        <p>Beautiful lyrics powered by the community</p>
        <button className="login-btn" onClick={onLogin}>
          Connect Spotify
        </button>
      </div>
    </div>
  )
}
