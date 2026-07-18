import { useEffect, useState } from 'react'
import { parseTTML, type LyricLine } from '../utils/parseTTML'

const STORAGE_HOSTS = [
  'https://public.storage.spicylyrics.org/spicy-lyrics',
  'https://lcgateway.ps-ec1.spikerko.org/spicy-lyrics',
]

export function useLyrics(trackId: string | null) {
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trackId) {
      setLyrics(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setLyrics(null)

    async function fetchLyrics() {
      for (const host of STORAGE_HOSTS) {
        try {
          const res = await fetch(`${host}/${trackId}.ttml`)
          if (!res.ok) continue
          const ttml = await res.text()
          if (cancelled) return
          const parsed = parseTTML(ttml)
          setLyrics(parsed)
          setLoading(false)
          return
        } catch {
          continue
        }
      }
      if (!cancelled) {
        setLyrics(null)
        setLoading(false)
        setError('No community lyrics found for this track')
      }
    }

    fetchLyrics()
    return () => { cancelled = true }
  }, [trackId])

  return { lyrics, loading, error }
}
