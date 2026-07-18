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
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null

  const d = data as Record<string, unknown>
  if (!Array.isArray(d.Lines) || d.Lines.length === 0) return null

  const firstLine = d.Lines[0] as Record<string, unknown>
  const rawStart = Number(firstLine?.StartTime ?? 0)
  const isSeconds = rawStart > 0 && rawStart < 10000
  const toMs = (v: unknown) => isSeconds ? Math.round(Number(v ?? 0) * 1000) : Number(v ?? 0)

  const lines: LyricLine[] = []
  for (const line of d.Lines as Array<Record<string, unknown>>) {
    const text = String(line.Text ?? '').trim()
    if (!text) continue
    lines.push({
      text,
      startMs: toMs(line.StartTime),
      endMs: toMs(line.EndTime),
      isBackground: Boolean(line.IsBackground ?? false),
      words: Array.isArray(line.Syllabes)
        ? (line.Syllabes as Array<Record<string, unknown>>).map((s) => ({
            text: String(s.Text ?? ''),
            startMs: toMs(s.StartTime),
            endMs: toMs(s.EndTime),
          }))
        : undefined,
    })
  }

  return lines.length > 0 ? lines : null
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
      // Frontend sends as x-spotify-auth; proxy forwards as SpicyLyrics-WebAuth
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
    const unpacked = packer.unpack(result.data)
    console.log('[SpicyLyrics] Type:', (unpacked as Record<string,unknown>)?.Type)
    return parseLines(unpacked)
  } catch (e) {
    console.error('[SpicyLyrics] unpack failed:', e)
    return null
  }
}
