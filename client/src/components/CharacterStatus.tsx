import React from 'react'
import { useStore, type CharacterState } from '../store'

interface StatBarProps {
  value: number
  max: number
  color: string
}

function StatBar({ value, max, color }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

interface StatControlProps {
  charId: string
  stat: 'hp' | 'san'
}

function StatControl({ charId, stat }: StatControlProps) {
  const ws = useStore(s => s.ws)

  function adjust(delta: number) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'adjust_stat', charId, stat, delta }))
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => adjust(-1)}
        className="w-6 h-6 flex items-center justify-center rounded text-xs transition-all"
        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.2)'; e.currentTarget.style.color = '#f87171' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        -
      </button>
      <button
        onClick={() => adjust(1)}
        className="w-6 h-6 flex items-center justify-center rounded text-xs transition-all"
        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(74,222,128,0.2)'; e.currentTarget.style.color = '#4ade80' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        +
      </button>
    </div>
  )
}

interface CharCardProps {
  char: CharacterState
}

function CharCard({ char }: CharCardProps) {
  const borderColor = char.indefiniteInsanity
    ? 'rgba(248,113,113,0.6)'
    : char.temporaryInsanity
    ? 'rgba(251,191,36,0.6)'
    : 'var(--bg-border)'

  return (
    <div className="relative rounded-xl p-4" style={{ backgroundColor: 'var(--bg-panel)', border: `1px solid ${borderColor}` }}>
      {/* Insanity badge */}
      {char.indefiniteInsanity && (
        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full" style={{ color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' }}>광기</span>
      )}
      {!char.indefiniteInsanity && char.temporaryInsanity && (
        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full" style={{ color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)' }}>불안정</span>
      )}

      <div className="mb-3">
        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{char.name}</div>
        <div className="rounded px-2 py-0.5 text-xs inline-block mt-1" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          {char.provider}/{char.model.split('-').slice(0,2).join('-')}
        </div>
      </div>

      {/* HP */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>HP <span style={{ color: 'var(--text-primary)' }}>{char.hp}/{char.hpMax}</span></span>
          <StatControl charId={char.id} stat="hp" />
        </div>
        <StatBar value={char.hp} max={char.hpMax} color="#4ade80" />
      </div>

      {/* SAN */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>SAN <span style={{ color: 'var(--text-primary)' }}>{char.san}/{char.sanMax}</span></span>
          <StatControl charId={char.id} stat="san" />
        </div>
        <StatBar value={char.san} max={char.sanMax} color="#60a5fa" />
      </div>

      {/* MP */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>MP <span style={{ color: '#a78bfa' }}>{char.mp}/{char.mpMax}</span></span>
        </div>
        <StatBar value={char.mp} max={char.mpMax} color="#a78bfa" />
      </div>

      {/* Luck */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>LUCK <span style={{ color: '#fb923c' }}>{char.luck}</span></span>
        </div>
      </div>
    </div>
  )
}

export default function CharacterStatus() {
  const characters = useStore(s => s.characters)

  if (characters.length === 0) {
    return (
      <div className="p-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
        캐릭터 없음
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
        탐사자 현황
      </h2>
      {characters.map(char => (
        <CharCard key={char.id} char={char} />
      ))}
    </div>
  )
}
