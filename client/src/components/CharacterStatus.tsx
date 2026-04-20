import React, { useState } from 'react'
import { useStore, type CharacterState } from '../store'

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
    <span style={{ display: 'inline-flex', gap: '2px', marginLeft: '4px' }}>
      <button
        onClick={() => adjust(-1)}
        style={{ width: '18px', height: '18px', fontSize: '11px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171', lineHeight: 1, padding: 0 }}
      >−</button>
      <button
        onClick={() => adjust(1)}
        style={{ width: '18px', height: '18px', fontSize: '11px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', lineHeight: 1, padding: 0 }}
      >+</button>
    </span>
  )
}

function Row({ label, children, trailing }: { label: string; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)', textAlign: 'right', marginLeft: '4px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{children}</span>
        {trailing}
      </span>
    </div>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-elevated)', marginBottom: '6px' }}>
      <div style={{ height: '100%', borderRadius: '3px', backgroundColor: color, width: `${pct}%`, transition: 'width 0.3s' }} />
    </div>
  )
}

function CharCard({ char }: { char: CharacterState }) {
  const [showEquip, setShowEquip] = useState(false)

  const insanityBorderColor = char.indefiniteInsanity
    ? 'rgba(248,113,113,0.55)'
    : char.temporaryInsanity
    ? 'rgba(251,191,36,0.45)'
    : 'var(--bg-border)'

  return (
    <div style={{
      margin: '0.5rem',
      padding: '0.75rem',
      borderRadius: '0.875rem',
      border: `1px solid ${insanityBorderColor}`,
      backgroundColor: 'var(--bg-elevated)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Name + status badge */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {char.name}
          {char.indefiniteInsanity && <span style={{ fontSize: '0.58rem', color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', padding: '1px 5px', borderRadius: '999px' }}>광기</span>}
          {!char.indefiniteInsanity && char.temporaryInsanity && <span style={{ fontSize: '0.58rem', color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)', padding: '1px 5px', borderRadius: '999px' }}>불안정</span>}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--teal)', opacity: 0.8, marginTop: '1px' }}>
          {char.provider} · {char.model.length > 18 ? char.model.slice(0, 16) + '…' : char.model}
        </div>
      </div>

      {/* Info rows */}
      <Row label="나이">{char.age}세</Row>
      <Row label="직업">{char.occupation}</Row>
      <Row label="거주지">{char.residence}</Row>

      {/* HP / MP / SAN / LUCK */}
      <Row label="HP" trailing={<StatControl charId={char.id} stat="hp" />}>
        <span style={{ color: '#4ade80' }}>{char.hp}/{char.hpMax}</span>
      </Row>
      <Bar value={char.hp} max={char.hpMax} color="#4ade80" />

      <Row label="MP"><span style={{ color: '#a78bfa' }}>{char.mp}/{char.mpMax}</span></Row>
      <Bar value={char.mp} max={char.mpMax} color="#a78bfa" />

      <Row label="SAN" trailing={<StatControl charId={char.id} stat="san" />}>
        <span style={{ color: '#60a5fa' }}>{char.san}/{char.sanMax}</span>
      </Row>
      <Bar value={char.san} max={char.sanMax} color="#60a5fa" />

      <Row label="LUCK"><span style={{ color: '#fb923c' }}>{char.luck}</span></Row>

      {/* Equipment toggle */}
      {char.equipment.length > 0 && (
        <div style={{ marginTop: '5px' }}>
          <button
            onClick={() => setShowEquip(v => !v)}
            style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <span style={{ fontSize: '0.6rem' }}>{showEquip ? 'v' : '>'}</span>
            도구 ({char.equipment.length})
          </button>
          {showEquip && (
            <div style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '1px solid var(--bg-border)' }}>
              {char.equipment.map((item, i) => (
                <div key={i} style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '2px' }}>· {item}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CharacterStatus() {
  const characters = useStore(s => s.characters)

  if (characters.length === 0) {
    return (
      <div style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        캐릭터 없음
      </div>
    )
  }

  return (
    <div>
      <div style={{
        padding: '0.625rem 1rem', fontSize: '0.62rem', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-border)'
      }}>
        탐사자
      </div>
      {characters.map(char => <CharCard key={char.id} char={char} />)}
    </div>
  )
}
