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
  if (!Array.isArray(data) || data.length < 2) {
    console.warn('[SpicyLyrics] data is not an array or too short:', data)
    return null
  }

  const header = data[0] as unknown[]
  console.log('[SpicyLyrics] header row:', JSON.stringify(header))
  console.log('[SpicyLyrics] first data row:', JSON.stringify(data[1]))

  // Object array: [{ Text, StartTime, EndTime }, ...]
  if (!Array.isArray(header)) {
    return (data as Array<Record<string, unknown>>).map((line) => {
      const text = String(line.Text ?? '').trim()
      if (!text) return null
      return {
        text,
        startMs: Number(line.StartTime ?? 0),
        endMs: Number(line.EndTime ?? 0),
        isBackground: Boolean(line.IsBackground),
      } as LyricLine
    }).filter(Boolean) as LyricLine[]
  }

  // Array-of-arrays: first row is column headers
  const headers = header as string[]
  const col = (name: string) => headers.indexOf(name)
  const iText = col('Text')
  const iStart = col('StartTime')
  const iEnd = col('EndTime')
  const iBackground = col('IsBackground')

  console.log('[SpicyLyrics] column indices - Text:', iText, 'StartTime:', iStart, 'EndTime:', iEnd)

  if (iText === -1) {
    console.warn('[SpicyLyrics] Text column not found in header. All columns:', headers)
    return null
  }

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

export async function fetchSpicyLyrics(
  trackId: string,
  spotifyToken: string
): Promise<LyricLine[] | null> {
  const version = await getVersion()
  console.log('[SpicyLyrics] using version:', version)

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

  if (!res.ok) {
    console.warn('[SpicyLyrics] proxy error:', res.status)
    return null
  }

  const json = await res.json()
  const queriesArr = json?.queries
  if (!Array.isArray(queriesArr)) return null

  const lyricsJob = queriesArr.find((q: { operationId?: string }) => q.operationId === '0') ?? queriesArr[1]
  const result = lyricsJob?.result
  console.log('[SpicyLyrics] httpStatus:', result?.httpStatus, 'format:', result?.format)

  if (!result || result.httpStatus !== 200) return null

  try {
    const raw = result.format === 'json' ? result.data : packer.unpack(result.data)
    return parseLines(raw)
  } catch (e) {
    console.error('[SpicyLyrics] parse failed:', e)
    return null
  }
}
