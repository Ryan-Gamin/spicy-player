import { useEffect, useState } from 'react'
import { fetchSpicyLyrics } from '../utils/spicyLyricsApi'

export interface LyricLine {
  startMs: number
  endMs: number
  text: string
  isBackground?: boolean
  words?: LyricWord[]
}

export interface LyricWord {
  startMs: number
  endMs: number
  text: string
}

export function useLyrics(trackId: string | null, token: string | null) {
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trackId || !token) { setLyrics(null); return }

    let cancelled = false
    setLoading(true)
    setError(null)
    setLyrics(null)

    fetchSpicyLyrics(trackId, token)
      .then((lines) => {
        if (cancelled) return
        if (!lines || lines.length === 0) {
          setError('No lyrics found')
        } else {
          setLyrics(lines)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Failed to fetch lyrics'); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [trackId, token])

  return { lyrics, loading, error }
}
