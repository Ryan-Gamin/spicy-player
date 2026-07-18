import { useEffect, useState, useRef } from 'react'

export interface NowPlaying {
  trackId: string
  trackName: string
  artistName: string
  albumName: string
  albumArt: string
  durationMs: number
  progressMs: number
  isPlaying: boolean
  uri: string
}

export function useNowPlaying(token: string) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchNowPlaying() {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 204 || res.status === 404) {
        setNowPlaying(null)
        return
      }
      const data = await res.json()
      if (!data?.item) return

      setNowPlaying({
        trackId: data.item.id,
        trackName: data.item.name,
        artistName: data.item.artists.map((a: any) => a.name).join(', '),
        albumName: data.item.album.name,
        albumArt: data.item.album.images[0]?.url ?? '',
        durationMs: data.item.duration_ms,
        progressMs: data.progress_ms ?? 0,
        isPlaying: data.is_playing,
        uri: data.item.uri,
      })
    } catch (e) {
      setError('Failed to fetch now playing')
    }
  }

  useEffect(() => {
    fetchNowPlaying()
    intervalRef.current = setInterval(fetchNowPlaying, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [token])

  return { nowPlaying, error, refetch: fetchNowPlaying }
}
