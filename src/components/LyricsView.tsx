import { useEffect, useRef } from 'react'
import type { LyricLine } from '../hooks/useLyrics'

interface LyricsViewProps {
  lyrics: LyricLine[] | null
  loading: boolean
  progressMs: number
  isPlaying: boolean
}

export default function LyricsView({ lyrics, loading, progressMs }: LyricsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  const isStatic = !lyrics || lyrics.every((l) => l.startMs === 0 && l.endMs === 0)

  const activeIndex = (!isStatic && lyrics)
    ? lyrics.findIndex(
        (line, i) =>
          progressMs >= line.startMs &&
          (i === lyrics.length - 1 || progressMs < lyrics[i + 1].startMs)
      )
    : -1

  // Log progressMs and first line startMs every time progressMs changes
  if (lyrics && lyrics.length > 0) {
    console.log(`[LyricsView] progressMs: ${progressMs} | line[0].startMs: ${lyrics[0].startMs} | activeIndex: ${activeIndex}`)
  }

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex])

  if (loading) {
    return (
      <div className="lyrics-state">
        <div className="lyrics-spinner" />
        <p>Loading lyrics...</p>
      </div>
    )
  }

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="lyrics-state">
        <p className="no-lyrics-icon">🎵</p>
        <p>No community lyrics for this track</p>
        <a href="https://discord.com/invite/uqgXU5wh8j" target="_blank" rel="noreferrer" className="contribute-link">
          Contribute on Discord →
        </a>
      </div>
    )
  }

  return (
    <div className="lyrics-scroll" ref={containerRef}>
      {lyrics.map((line, i) => {
        const isActive = !isStatic && i === activeIndex
        const isPast = !isStatic && i < activeIndex
        return (
          <div
            key={i}
            ref={isActive ? activeRef : null}
            className={['lyric-line', isActive ? 'active' : '', isPast ? 'past' : '', line.isBackground ? 'background-vocal' : ''].filter(Boolean).join(' ')}
          >
            {line.words
              ? line.words.map((word, wi) => (
                  <span key={wi} className={isActive && progressMs >= word.startMs && progressMs < word.endMs ? 'word-active' : ''}>
                    {word.text}{' '}
                  </span>
                ))
              : line.text}
          </div>
        )
      })}
    </div>
  )
}
