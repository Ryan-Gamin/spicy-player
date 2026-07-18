import { useEffect, useState, useRef } from 'react'
import { useNowPlaying } from '../hooks/useNowPlaying'
import { useLyrics } from '../hooks/useLyrics'
import { extractDominantColor } from '../utils/colorExtract'
import LyricsView from './LyricsView'
import Controls from './Controls'

interface PlayerProps {
  token: string
  onLogout: () => void
}

export default function Player({ token, onLogout }: PlayerProps) {
  const { nowPlaying } = useNowPlaying(token)
  const { lyrics, loading: lyricsLoading } = useLyrics(nowPlaying?.trackId ?? null)
  const [bgColor, setBgColor] = useState('20, 20, 40')
  const prevTrackId = useRef<string | null>(null)

  useEffect(() => {
    if (nowPlaying?.albumArt && nowPlaying.trackId !== prevTrackId.current) {
      prevTrackId.current = nowPlaying.trackId
      extractDominantColor(nowPlaying.albumArt).then(setBgColor)
    }
  }, [nowPlaying?.albumArt, nowPlaying?.trackId])

  return (
    <div
      className="player-root"
      style={{
        background: `radial-gradient(ellipse at 30% 20%, rgba(${bgColor}, 0.9) 0%, rgba(10,10,20,0.98) 70%)`,
        transition: 'background 1.5s ease',
      }}
    >
      {nowPlaying?.albumArt && (
        <div
          className="bg-blur"
          style={{ backgroundImage: `url(${nowPlaying.albumArt})` }}
        />
      )}

      <button className="logout-btn" onClick={onLogout} title="Disconnect">
        ✕
      </button>

      <div className="player-layout">
        {/* Left: Player Card */}
        <div className="glass-card player-card">
          {nowPlaying ? (
            <>
              <img
                className="album-art"
                src={nowPlaying.albumArt}
                alt={nowPlaying.albumName}
              />
              <div className="track-info">
                <h2 className="track-name">{nowPlaying.trackName}</h2>
                <p className="artist-name">{nowPlaying.artistName}</p>
                <p className="album-name">{nowPlaying.albumName}</p>
              </div>
              <Controls
                token={token}
                progressMs={nowPlaying.progressMs}
                durationMs={nowPlaying.durationMs}
                isPlaying={nowPlaying.isPlaying}
              />
            </>
          ) : (
            <div className="idle-state">
              <div className="idle-icon">🎵</div>
              <p>Nothing playing</p>
              <p className="idle-sub">Open Spotify and play something</p>
            </div>
          )}
        </div>

        {/* Right: Lyrics Card */}
        <div className="glass-card lyrics-card">
          <LyricsView
            lyrics={lyrics}
            loading={lyricsLoading}
            progressMs={nowPlaying?.progressMs ?? 0}
            isPlaying={nowPlaying?.isPlaying ?? false}
          />
        </div>
      </div>
    </div>
  )
}
