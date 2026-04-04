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
    <div className="h-1.5 bg-coc-bg rounded-full overflow-hidden">
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
        className="w-6 h-6 flex items-center justify-center rounded text-xs bg-coc-bg hover:bg-coc-danger/20 text-coc-muted hover:text-coc-danger transition-all"
      >
        −
      </button>
      <button
        onClick={() => adjust(1)}
        className="w-6 h-6 flex items-center justify-center rounded text-xs bg-coc-bg hover:bg-coc-hp/20 text-coc-muted hover:text-coc-hp transition-all"
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
  return (
    <div className={`relative bg-coc-panel border rounded-xl p-4 ${
      char.indefiniteInsanity
        ? 'border-coc-danger/60'
        : char.temporaryInsanity
        ? 'border-yellow-500/60'
        : 'border-coc-border'
    }`}>
      {/* Insanity badge — top-right */}
      {char.indefiniteInsanity && (
        <span className="absolute top-2 right-2 text-xs text-coc-danger bg-coc-danger/10 px-2 py-0.5 rounded-full">광기</span>
      )}
      {!char.indefiniteInsanity && char.temporaryInsanity && (
        <span className="absolute top-2 right-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">불안정</span>
      )}

      <div className="mb-3">
        <div className="text-sm font-semibold text-coc-text">{char.name}</div>
        <div className="bg-coc-panel2 rounded px-2 py-0.5 text-xs text-coc-muted inline-block mt-1">
          {char.provider}/{char.model.split('-').slice(0,2).join('-')}
        </div>
      </div>

      {/* HP */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-coc-muted">HP <span className="text-coc-text">{char.hp}/{char.hpMax}</span></span>
          <StatControl charId={char.id} stat="hp" />
        </div>
        <StatBar value={char.hp} max={char.hpMax} color="#22c55e" />
      </div>

      {/* SAN */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-coc-muted">SAN <span className="text-coc-text">{char.san}/{char.sanMax}</span></span>
          <StatControl charId={char.id} stat="san" />
        </div>
        <StatBar value={char.san} max={char.sanMax} color="#60a5fa" />
      </div>

      {/* MP */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-coc-muted">MP <span className="text-coc-mp">{char.mp}/{char.mpMax}</span></span>
        </div>
        <StatBar value={char.mp} max={char.mpMax} color="#a78bfa" />
      </div>

      {/* Luck */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-coc-muted">LUCK <span className="text-coc-luck">{char.luck}</span></span>
        </div>
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
