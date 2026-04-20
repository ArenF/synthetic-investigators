import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useStore } from '../store'
import { COC_SKILLS } from '../constants/skills'

type Difficulty = 'regular' | 'hard' | 'extreme'

type OutcomeTier = 'extremeSuccess' | 'hardSuccess' | 'regularSuccess' | 'regularFailure' | 'badFailure' | 'fumble'

interface SimpleEffect {
  kind: 'stat' | 'item_gain' | 'item_lose' | 'status'
  stat?: 'hp' | 'san' | 'mp' | 'luck'
  delta?: number
  itemName?: string
  status?: 'temporaryInsanity' | 'indefiniteInsanity'
  statusValue?: boolean
}

interface TierOutcome {
  desc: string
  effects: SimpleEffect[]
}

const TIER_LABELS: Record<OutcomeTier, string> = {
  extremeSuccess: '🌟 극단적 성공',
  hardSuccess: '✅ 어려운 성공',
  regularSuccess: '✔️ 성공',
  regularFailure: '❌ 실패',
  badFailure: '💥 나쁜 실패',
  fumble: '💀 대실패',
}

const TIER_COLORS: Record<OutcomeTier, string> = {
  extremeSuccess: '#fbbf24',
  hardSuccess: '#4ade80',
  regularSuccess: '#4ade80',
  regularFailure: '#f87171',
  badFailure: '#ef4444',
  fumble: '#dc2626',
}

const ALL_TIERS: OutcomeTier[] = ['extremeSuccess', 'hardSuccess', 'regularSuccess', 'regularFailure', 'badFailure', 'fumble']

interface Props {
  onClose: () => void
}

function makeEmptyOutcomes(): Record<OutcomeTier, TierOutcome> {
  return {
    extremeSuccess: { desc: '', effects: [] },
    hardSuccess: { desc: '', effects: [] },
    regularSuccess: { desc: '', effects: [] },
    regularFailure: { desc: '', effects: [] },
    badFailure: { desc: '', effects: [] },
    fumble: { desc: '', effects: [] },
  }
}

export default function ActionRequestModal({ onClose }: Props) {
  const { characters, ws } = useStore()
  const [targetId, setTargetId] = useState<string>('all')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // 특정 캐릭터 선택 시 해당 캐릭터의 0값 기술 제외 (전체 선택 시 전체 목록 표시)
  const visibleSkills = targetId === 'all'
    ? COC_SKILLS
    : (() => {
        const char = characters.find(c => c.id === targetId)
        if (!char) return COC_SKILLS
        return COC_SKILLS.filter(s => (char.skills[s] ?? 0) > 0)
      })()

  const [skill, setSkill] = useState(COC_SKILLS[0])
  const [customSkill, setCustomSkill] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('regular')
  const [outcomes, setOutcomes] = useState<Record<OutcomeTier, TierOutcome>>(makeEmptyOutcomes)
  const [expandedTier, setExpandedTier] = useState<OutcomeTier | null>(null)

  const diffLabels: Record<Difficulty, string> = {
    regular: '보통',
    hard: '어려움',
    extreme: '극한',
  }

  function updateOutcomeDesc(tier: OutcomeTier, desc: string) {
    setOutcomes(prev => ({ ...prev, [tier]: { ...prev[tier], desc } }))
  }

  function addEffect(tier: OutcomeTier) {
    const newEffect: SimpleEffect = { kind: 'stat', stat: 'san', delta: -1 }
    setOutcomes(prev => ({
      ...prev,
      [tier]: { ...prev[tier], effects: [...prev[tier].effects, newEffect] },
    }))
  }

  function removeEffect(tier: OutcomeTier, idx: number) {
    setOutcomes(prev => ({
      ...prev,
      [tier]: { ...prev[tier], effects: prev[tier].effects.filter((_, i) => i !== idx) },
    }))
  }

  function updateEffect(tier: OutcomeTier, idx: number, patch: Partial<SimpleEffect>) {
    setOutcomes(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        effects: prev[tier].effects.map((e, i) => i === idx ? { ...e, ...patch } : e),
      },
    }))
  }

  function buildJudgmentOutcomes() {
    const result: any = {}
    const tierMap: Record<OutcomeTier, string> = {
      extremeSuccess: 'extremeSuccess',
      hardSuccess: 'hardSuccess',
      regularSuccess: 'regularSuccess',
      regularFailure: 'regularFailure',
      badFailure: 'badFailure',
      fumble: 'fumble',
    }
    for (const tier of ALL_TIERS) {
      const o = outcomes[tier]
      if (!o.desc && o.effects.length === 0) continue
      const effects = o.effects.map(e => {
        if (e.kind === 'stat') return { kind: 'stat', stat: e.stat, delta: e.delta ?? 0 }
        if (e.kind === 'item_gain') return { kind: 'item_gain', item: { name: e.itemName ?? '', type: 'misc' } }
        if (e.kind === 'item_lose') return { kind: 'item_lose', itemName: e.itemName ?? '' }
        if (e.kind === 'status') return { kind: 'status', status: e.status, value: e.statusValue ?? true }
        return e
      })
      result[tierMap[tier]] = { desc: o.desc, effects }
    }
    return result
  }

  function rollDice() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const skillName = customSkill.trim() || skill
    const targets = targetId === 'all' ? characters.map(c => c.id) : [targetId]
    const judgmentOutcomes = buildJudgmentOutcomes()

    for (const charId of targets) {
      ws.send(JSON.stringify({
        type: 'judgment_request',
        charId,
        skill: skillName,
        difficulty,
        outcomes: judgmentOutcomes,
      }))
    }
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-base)',
    border: '1px solid var(--bg-border)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    padding: '4px 8px',
    fontSize: '0.75rem',
    width: '100%',
  }

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="modal-enter"
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--bg-border)',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>행동 요청 (기술 판정)</h2>

          {/* Target */}
          <div className="mb-4">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>대상</label>
            <select
              value={targetId}
              onChange={e => {
                setTargetId(e.target.value)
                setCustomSkill('')
                const newTarget = e.target.value
                const char = characters.find(c => c.id === newTarget)
                if (char) {
                  const firstNonZero = COC_SKILLS.find(s => (char.skills[s] ?? 0) > 0)
                  if (firstNonZero) setSkill(firstNonZero)
                }
              }}
              style={inputStyle}
            >
              <option value="all">전체</option>
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Skill */}
          <div className="mb-4">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>기술</label>
            <select
              value={customSkill.trim() ? '' : skill}
              onChange={e => { setSkill(e.target.value); setCustomSkill('') }}
              disabled={!!customSkill.trim()}
              style={{ ...inputStyle, marginBottom: '0.375rem', opacity: customSkill.trim() ? 0.4 : 1 }}
            >
              {visibleSkills.map(s => {
                const char = targetId !== 'all' ? characters.find(c => c.id === targetId) : null
                const val = char ? (char.skills[s] ?? 0) : null
                return (
                  <option key={s} value={s}>
                    {s}{val !== null ? ` (${val}%)` : ''}
                  </option>
                )
              })}
            </select>
            <input
              type="text"
              value={customSkill}
              onChange={e => setCustomSkill(e.target.value)}
              placeholder="직접 입력 (위 선택을 덮어씁니다)"
              style={inputStyle}
            />
          </div>

          {/* Difficulty */}
          <div className="mb-5">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>난이도</label>
            <div className="flex gap-2">
              {(['regular', 'hard', 'extreme'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={difficulty === d
                    ? { backgroundColor: 'var(--teal)', color: '#0a0e1a' }
                    : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }
                  }
                >
                  {diffLabels[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome tiers */}
          <div className="mb-5">
            <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>결과 설정 (선택사항)</label>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {ALL_TIERS.map(tier => {
                const isActive = outcomes[tier].desc || outcomes[tier].effects.length > 0
                return (
                  <button
                    key={tier}
                    onClick={() => setExpandedTier(expandedTier === tier ? null : tier)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.65rem',
                      border: `1px solid ${isActive ? TIER_COLORS[tier] : 'var(--bg-border)'}`,
                      backgroundColor: isActive ? `${TIER_COLORS[tier]}18` : 'var(--bg-elevated)',
                      color: isActive ? TIER_COLORS[tier] : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {TIER_LABELS[tier]}
                  </button>
                )
              })}
            </div>

            {expandedTier && (
              <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: `1px solid ${TIER_COLORS[expandedTier]}40`,
                borderRadius: '8px',
                padding: '0.75rem',
              }}>
                <div className="text-xs font-semibold mb-2" style={{ color: TIER_COLORS[expandedTier] }}>
                  {TIER_LABELS[expandedTier]} 결과
                </div>
                <textarea
                  value={outcomes[expandedTier].desc}
                  onChange={e => updateOutcomeDesc(expandedTier, e.target.value)}
                  placeholder="결과 설명 (선택사항)"
                  rows={2}
                  style={{ ...inputStyle, resize: 'none', marginBottom: '0.5rem' }}
                />

                {/* Effects */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>효과 ({outcomes[expandedTier].effects.length})</span>
                    <button
                      onClick={() => addEffect(expandedTier)}
                      style={{ fontSize: '0.65rem', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      + 효과 추가
                    </button>
                  </div>
                  {outcomes[expandedTier].effects.map((effect, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <select
                        value={effect.kind}
                        onChange={e => updateEffect(expandedTier, idx, { kind: e.target.value as any })}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}
                      >
                        <option value="stat">능력치</option>
                        <option value="item_gain">아이템 획득</option>
                        <option value="item_lose">아이템 분실</option>
                        <option value="status">상태</option>
                      </select>

                      {effect.kind === 'stat' && (
                        <>
                          <select
                            value={effect.stat ?? 'san'}
                            onChange={e => updateEffect(expandedTier, idx, { stat: e.target.value as any })}
                            style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}
                          >
                            <option value="hp">HP</option>
                            <option value="san">SAN</option>
                            <option value="mp">MP</option>
                            <option value="luck">행운</option>
                          </select>
                          <input
                            type="number"
                            value={effect.delta ?? 0}
                            onChange={e => updateEffect(expandedTier, idx, { delta: parseInt(e.target.value) || 0 })}
                            style={{ ...inputStyle, width: '60px', flex: '0 0 auto' }}
                          />
                        </>
                      )}
                      {(effect.kind === 'item_gain' || effect.kind === 'item_lose') && (
                        <input
                          type="text"
                          value={effect.itemName ?? ''}
                          onChange={e => updateEffect(expandedTier, idx, { itemName: e.target.value })}
                          placeholder="아이템 이름"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      )}
                      {effect.kind === 'status' && (
                        <select
                          value={effect.status ?? 'temporaryInsanity'}
                          onChange={e => updateEffect(expandedTier, idx, { status: e.target.value as any })}
                          style={{ ...inputStyle, width: 'auto', flex: 1 }}
                        >
                          <option value="temporaryInsanity">일시적 광기</option>
                          <option value="indefiniteInsanity">무기한 광기</option>
                        </select>
                      )}

                      <button
                        onClick={() => removeEffect(expandedTier, idx)}
                        style={{ fontSize: '0.7rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg transition-all"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
            >
              취소
            </button>
            <button
              onClick={rollDice}
              className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all"
              style={{ backgroundColor: 'var(--teal)', color: '#0a0e1a' }}
            >
              주사위 굴리기
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
