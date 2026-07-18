import { useRef } from 'react'

interface ControlsProps {
  token: string
  progressMs: number
  durationMs: number
  isPlaying: boolean
}

function msToTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

async function spotifyAction(token: string, endpoint: string, method = 'POST') {
  await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
}

export default function Controls({ token, progressMs, durationMs, isPlaying }: ControlsProps) {
  const seekRef = useRef<HTMLInputElement>(null)
  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0

  return (
    <div className="controls">
      <div className="progress-bar-wrap">
        <span className="time">{msToTime(progressMs)}</span>
        <input
          ref={seekRef}
          type="range"
          min={0}
          max={100}
          value={progress}
          className="progress-bar"
          onChange={async (e) => {
            const pos = Math.floor((Number(e.target.value) / 100) * durationMs)
            await spotifyAction(token, `seek?position_ms=${pos}`, 'PUT')
          }}
        />
        <span className="time">{msToTime(durationMs)}</span>
      </div>
      <div className="control-buttons">
        <button onClick={() => spotifyAction(token, 'previous')}>⏮</button>
        <button
          className="play-pause"
          onClick={() => spotifyAction(token, isPlaying ? 'pause' : 'play')}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={() => spotifyAction(token, 'next')}>⏭</button>
      </div>
    </div>
  )
}
