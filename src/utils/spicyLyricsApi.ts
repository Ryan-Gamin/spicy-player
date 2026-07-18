import { SLObjPack } from './SLObjPack'
import type { LyricLine } from '../hooks/useLyrics'

const PROXY_BASE = '/api'
const packer = new SLObjPack()

async function getVersion(): Promise<string> {
  const res = await fetch(`${PROXY_BASE}/version?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch version')
  const text = (await res.text()).trim()
  if (!text) throw new Error('Empty version')
  return text
}

function parseLines(data: unknown): LyricLine[] | null {
  if (!Array.isArray(data) || data.length === 0) return null

  const first = data[0]

  // Shape A: array of objects [{ Text, StartTime, EndTime }, ...]
  if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
    const lines = (data as Array<Record<string, unknown>>).map((line) => {
      const text = String(line.Text ?? '').trim()
      if (!text) return null
      return {
        text,
        startMs: Number(line.StartTime ?? 0),
        endMs: Number(line.EndTime ?? 0),
        isBackground: Boolean(line.IsBackground),
      } as LyricLine
    }).filter(Boolean) as LyricLine[]
    return lines.length > 0 ? lines : null
  }

  // Shape B: array of arrays [["Text","StartTime",...], [line, ms, ms], ...]
  // where data[0] is a proper header array
  if (Array.isArray(first) && first.length > 1) {
    const headers = first as string[]
    const iText = headers.indexOf('Text')
    const iStart = headers.indexOf('StartTime')
    const iEnd = headers.indexOf('EndTime')
    const iBackground = headers.indexOf('IsBackground')
    if (iText === -1) return null
    const lines: LyricLine[] = []
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      const text = String(row[iText] ?? '').trim()
      if (!text) continue
      lines.push({
        text,
        startMs: iStart !== -1 ? Number(row[iStart] ?? 0) : 0,
        endMs: iEnd !== -1 ? Number(row[iEnd] ?? 0) : 0,
        isBackground: iBackground !== -1 ? Boolean(row[iBackground]) : false,
      })
    }
    return lines.length > 0 ? lines : null
  }

  // Shape C: flat array of strings ["Text", "line1", "line2", ...]
  // data[0] is the column name string, skip it, rest are lyric lines
  if (typeof first === 'string') {
    const lines: LyricLine[] = []
    // Skip index 0 (it's the column name e.g. "Text")
    for (let i = 1; i < data.length; i++) {
      const text = String(data[i] ?? '').trim()
      if (!text) continue
      // No timing available — space lines evenly (LyricsView handles timingless display)
      lines.push({ text, startMs: 0, endMs: 0 })
    }
    return lines.length > 0 ? lines : null
  }

  return null
}

export async function fetchSpicyLyrics(
  trackId: string,
  spotifyToken: string
): Promise<LyricLine[] | null> {
  const version = await getVersion()

  const res = await fetch(`${PROXY_BASE}/lyrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-spotify-auth': `Bearer ${spotifyToken}`,
      'x-spicy-version': version,
    },
    body: JSON.stringify({
      queries: [{ operation: 'lyrics', variables: { id: trackId, auth: 'SpicyLyrics-WebAuth' } }],
      client: { version },
    }),
  })

  if (!res.ok) return null

  const json = await res.json()
  const queriesArr = json?.queries
  if (!Array.isArray(queriesArr)) return null

  const lyricsJob = queriesArr.find((q: { operationId?: string }) => q.operationId === '0') ?? queriesArr[1]
  const result = lyricsJob?.result
  if (!result || result.httpStatus !== 200) return null

  try {
    const raw = result.format === 'json' ? result.data : packer.unpack(result.data)
    return parseLines(raw)
  } catch (e) {
    console.error('[SpicyLyrics] parse failed:', e)
    return null
  }
}
