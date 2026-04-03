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
    <div className="h-2 bg-coc-bg rounded-full overflow-hidden">
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
        className="w-5 h-5 flex items-center justify-center rounded text-xs bg-coc-bg hover:bg-coc-danger/20 text-coc-muted hover:text-coc-danger transition-all"
      >
        −
      </button>
      <button
        onClick={() => adjust(1)}
        className="w-5 h-5 flex items-center justify-center rounded text-xs bg-coc-bg hover:bg-coc-hp/20 text-coc-muted hover:text-coc-hp transition-all"
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
  const sanPct = Math.round((char.san / char.sanMax) * 100)
  const hpPct = Math.round((char.hp / char.hpMax) * 100)

  return (
    <div className={`bg-coc-panel border rounded-lg p-3 ${
      char.indefiniteInsanity
        ? 'border-coc-danger/60'
        : char.temporaryInsanity
        ? 'border-yellow-500/60'
        : 'border-coc-border'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-coc-text text-sm">{char.name}</div>
          <div className="text-coc-muted text-xs">{char.provider}/{char.model.split('-').slice(0,2).join('-')}</div>
        </div>
        {char.indefiniteInsanity && (
          <span className="text-xs text-coc-danger bg-coc-danger/10 px-1.5 py-0.5 rounded">광기</span>
        )}
        {!char.indefiniteInsanity && char.temporaryInsanity && (
          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">불안정</span>
        )}
      </div>

      {/* HP */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-coc-muted">HP {char.hp}/{char.hpMax}</span>
          <StatControl charId={char.id} stat="hp" />
        </div>
        <StatBar value={char.hp} max={char.hpMax} color="#5a9e5a" />
      </div>

      {/* SAN */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-coc-muted">SAN {char.san}/{char.sanMax} ({sanPct}%)</span>
          <StatControl charId={char.id} stat="san" />
        </div>
        <StatBar value={char.san} max={char.sanMax} color="#4a90c4" />
      </div>
    </div>
  )
}

export default function CharacterStatus() {
  const characters = useStore(s => s.characters)

  if (characters.length === 0) {
    return (
      <div className="p-4 text-coc-muted text-sm text-center">
        캐릭터 없음
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <h2 className="text-coc-muted text-xs font-semibold uppercase tracking-wider px-1">
        탐사자 현황
      </h2>
      {characters.map(char => (
        <CharCard key={char.id} char={char} />
      ))}
    </div>
  )
}
