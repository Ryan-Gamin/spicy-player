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

function timeToMs(time: string): number {
  if (!time) return 0
  // Format: HH:MM:SS.mmm or MM:SS.mmm or SS.mmm
  const parts = time.split(':')
  let seconds = 0
  if (parts.length === 3) {
    seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  } else if (parts.length === 2) {
    seconds = Number(parts[0]) * 60 + Number(parts[1])
  } else {
    seconds = Number(parts[0])
  }
  return Math.round(seconds * 1000)
}

export function parseTTML(ttmlString: string): LyricLine[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(ttmlString, 'application/xml')
  const lines: LyricLine[] = []

  const pElements = doc.querySelectorAll('p')

  pElements.forEach((p) => {
    const begin = p.getAttribute('begin') ?? ''
    const end = p.getAttribute('end') ?? ''
    const agent = p.getAttribute('ttm:agent') ?? ''
    const isBackground = agent.toLowerCase().includes('back')

    // Check for word-level timing (span children)
    const spans = p.querySelectorAll('span[begin]')
    const words: LyricWord[] = []

    spans.forEach((span) => {
      const wBegin = span.getAttribute('begin') ?? ''
      const wEnd = span.getAttribute('end') ?? ''
      const wText = span.textContent?.trim() ?? ''
      if (wText) {
        words.push({
          startMs: timeToMs(wBegin),
          endMs: timeToMs(wEnd),
          text: wText,
        })
      }
    })

    const fullText = p.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    if (!fullText) return

    lines.push({
      startMs: timeToMs(begin),
      endMs: timeToMs(end),
      text: fullText,
      isBackground,
      words: words.length > 0 ? words : undefined,
    })
  })

  return lines.sort((a, b) => a.startMs - b.startMs)
}
