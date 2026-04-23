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

type JudgmentTab = 'skill' | 'opposed' | 'combined' | 'group' | 'san'

export default function ActionRequestModal({ onClose }: Props) {
  const { characters, ws } = useStore()
  const [tab, setTab] = useState<JudgmentTab>('skill')
  const [targetId, setTargetId] = useState<string>('all')

  // Opposed state
  const [oppSideAId, setOppSideAId] = useState<string>(characters[0]?.id ?? '')
  const [oppSideASkill, setOppSideASkill] = useState(COC_SKILLS[0])
  const [oppSideBId, setOppSideBId] = useState<string>('')
  const [oppSideBNpcName, setOppSideBNpcName] = useState('')
  const [oppSideBSkill, setOppSideBSkill] = useState(COC_SKILLS[0])
  const [oppSideBSkillValue, setOppSideBSkillValue] = useState(50)
  const [oppTieBreaker, setOppTieBreaker] = useState<'attacker' | 'defender'>('attacker')

  // Combined state
  const [combCharId, setCombCharId] = useState<string>(characters[0]?.id ?? '')
  const [combSkills, setCombSkills] = useState<string[]>([COC_SKILLS[0]])
  const [combCondition, setCombCondition] = useState<'and' | 'or'>('and')
  const [combDifficulty, setCombDifficulty] = useState<Difficulty>('regular')

  // Group state
  const [groupCharIds, setGroupCharIds] = useState<string[]>(characters.map(c => c.id))
  const [groupSkill, setGroupSkill] = useState(COC_SKILLS[0])
  const [groupDifficulty, setGroupDifficulty] = useState<Difficulty>('regular')
  const [groupMode, setGroupMode] = useState<'cooperative' | 'all_must_succeed'>('cooperative')

  // SAN check state
  const [sanTargetId, setSanTargetId] = useState<string>(characters[0]?.id ?? '')
  const [successLoss, setSuccessLoss] = useState('0')
  const [failureLoss, setFailureLoss] = useState('1d6')

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
  const [bonusDice, setBonusDice] = useState(0)
  const [penaltyDice, setPenaltyDice] = useState(0)
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

    const bp = (bonusDice > 0 || penaltyDice > 0)
      ? { bonus: bonusDice, penalty: penaltyDice }
      : undefined

    // Pending flow: only one judgment at a time — send first target
    const charId = targets[0]
    ws.send(JSON.stringify({
      type: 'judgment_request',
      charId,
      skill: skillName,
      difficulty,
      outcomes: judgmentOutcomes,
      bonusPenalty: bp,
    }))
    onClose()
  }

  function sendSanCheck() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (!sanTargetId) return
    ws.send(JSON.stringify({
      type: 'san_check',
      charId: sanTargetId,
      successLoss: successLoss.trim() || '0',
      failureLoss: failureLoss.trim() || '1d6',
    }))
    onClose()
  }

  function sendOpposed() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'judgment_request',
      request: {
        type: 'opposed',
        sideA: { charId: oppSideAId, skill: oppSideASkill },
        sideB: oppSideBId
          ? { charId: oppSideBId, skill: oppSideBSkill, skillValue: 0 }
          : { npcName: oppSideBNpcName || 'NPC', skill: oppSideBSkill, skillValue: oppSideBSkillValue },
        tieBreaker: oppTieBreaker,
      },
    }))
    onClose()
  }

  function sendCombined() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (combSkills.length < 2) return
    ws.send(JSON.stringify({
      type: 'judgment_request',
      request: {
        type: 'combined',
        charId: combCharId,
        skills: combSkills,
        condition: combCondition,
        difficulty: combDifficulty,
      },
    }))
    onClose()
  }

  function sendGroup() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (groupCharIds.length < 2) return
    ws.send(JSON.stringify({
      type: 'judgment_request',
      request: {
        type: 'group',
        charIds: groupCharIds,
        skill: groupSkill,
        difficulty: groupDifficulty,
        mode: groupMode,
      },
    }))
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
          {/* Tab header */}
          <div className="flex gap-1 mb-5 flex-wrap">
            {([['skill', '단순'], ['opposed', '대항'], ['combined', '결합'], ['group', '그룹'], ['san', 'SAN']] as [JudgmentTab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 text-sm font-semibold rounded-lg transition-all"
                style={tab === t
                  ? { backgroundColor: 'var(--teal)', color: '#0a0e1a' }
                  : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'san' && (
            <>
              {/* SAN Check form */}
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>대상</label>
                <select
                  value={sanTargetId}
                  onChange={e => setSanTargetId(e.target.value)}
                  style={inputStyle}
                >
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (SAN {c.san})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>성공 시 손실 (예: 0, 1, 1d3)</label>
                <input
                  type="text"
                  value={successLoss}
                  onChange={e => setSuccessLoss(e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              <div className="mb-5">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>실패 시 손실 (예: 1d6, 1d10)</label>
                <input
                  type="text"
                  value={failureLoss}
                  onChange={e => setFailureLoss(e.target.value)}
                  placeholder="1d6"
                  style={inputStyle}
                />
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
                  onClick={sendSanCheck}
                  className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all"
                  style={{ backgroundColor: '#a855f7', color: '#fff' }}
                >
                  SAN 체크 굴리기
                </button>
              </div>
            </>
          )}

          {tab === 'opposed' && (
            <>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>A측 (공격자)</label>
                <div className="flex gap-2">
                  <select value={oppSideAId} onChange={e => setOppSideAId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={oppSideASkill} onChange={e => setOppSideASkill(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    {COC_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>B측 (방어자/상대)</label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={oppSideBId}
                    onChange={e => setOppSideBId(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="">NPC (직접 입력)</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={oppSideBSkill} onChange={e => setOppSideBSkill(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    {COC_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {!oppSideBId && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={oppSideBNpcName}
                      onChange={e => setOppSideBNpcName(e.target.value)}
                      placeholder="NPC ���름"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="number"
                      value={oppSideBSkillValue}
                      onChange={e => setOppSideBSkillValue(parseInt(e.target.value) || 0)}
                      placeholder="기술값"
                      style={{ ...inputStyle, width: '80px' }}
                    />
                  </div>
                )}
              </div>
              <div className="mb-5">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>동점 우선</label>
                <div className="flex gap-2">
                  {(['attacker', 'defender'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setOppTieBreaker(t)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={oppTieBreaker === t
                        ? { backgroundColor: 'var(--teal)', color: '#0a0e1a' }
                        : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }
                      }
                    >
                      {t === 'attacker' ? '공격자 (A)' : '방어자 (B)'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>취소</button>
                <button onClick={sendOpposed} className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: 'var(--teal)', color: '#0a0e1a' }}>대항 판정</button>
              </div>
            </>
          )}

          {tab === 'combined' && (
            <>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>대상</label>
                <select value={combCharId} onChange={e => setCombCharId(e.target.value)} style={inputStyle}>
                  {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>기술 (2개 ��상 선택)</label>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--bg-border)', borderRadius: '6px', padding: '4px' }}>
                  {COC_SKILLS.map(s => {
                    const checked = combSkills.includes(s)
                    return (
                      <label key={s} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) setCombSkills(combSkills.filter(x => x !== s))
                            else setCombSkills([...combSkills, s])
                          }}
                        />
                        {s}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>조건</label>
                <div className="flex gap-2">
                  {(['and', 'or'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => setCombCondition(c)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={combCondition === c
                        ? { backgroundColor: 'var(--teal)', color: '#0a0e1a' }
                        : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }
                      }
                    >
                      {c === 'and' ? 'AND (모두 성공)' : 'OR (하나 이상)'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-5">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>난이도</label>
                <div className="flex gap-2">
                  {(['regular', 'hard', 'extreme'] as Difficulty[]).map(d => (
                    <button key={d} onClick={() => setCombDifficulty(d)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={combDifficulty === d
                        ? { backgroundColor: 'var(--teal)', color: '#0a0e1a' }
                        : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }
                      }
                    >{diffLabels[d]}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>취소</button>
                <button onClick={sendCombined} disabled={combSkills.length < 2} className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: combSkills.length >= 2 ? 'var(--teal)' : 'var(--bg-elevated)', color: combSkills.length >= 2 ? '#0a0e1a' : 'var(--text-muted)' }}>결합 판정</button>
              </div>
            </>
          )}

          {tab === 'group' && (
            <>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>참가 캐릭터</label>
                <div style={{ border: '1px solid var(--bg-border)', borderRadius: '6px', padding: '4px' }}>
                  {characters.map(c => {
                    const checked = groupCharIds.includes(c.id)
                    return (
                      <label key={c.id} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) setGroupCharIds(groupCharIds.filter(x => x !== c.id))
                            else setGroupCharIds([...groupCharIds, c.id])
                          }}
                        />
                        {c.name}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>기술</label>
                <select value={groupSkill} onChange={e => setGroupSkill(e.target.value)} style={inputStyle}>
                  {COC_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>모드</label>
                <div className="flex gap-2">
                  {(['cooperative', 'all_must_succeed'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setGroupMode(m)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={groupMode === m
                        ? { backgroundColor: 'var(--teal)', color: '#0a0e1a' }
                        : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }
                      }
                    >
                      {m === 'cooperative' ? '협력 (1명 성공)' : '전원 필수'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-5">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>난이도</label>
                <div className="flex gap-2">
                  {(['regular', 'hard', 'extreme'] as Difficulty[]).map(d => (
                    <button key={d} onClick={() => setGroupDifficulty(d)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={groupDifficulty === d
                        ? { backgroundColor: 'var(--teal)', color: '#0a0e1a' }
                        : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }
                      }
                    >{diffLabels[d]}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>취소</button>
                <button onClick={sendGroup} disabled={groupCharIds.length < 2} className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg" style={{ backgroundColor: groupCharIds.length >= 2 ? 'var(--teal)' : 'var(--bg-elevated)', color: groupCharIds.length >= 2 ? '#0a0e1a' : 'var(--text-muted)' }}>그룹 판정</button>
              </div>
            </>
          )}

          {tab === 'skill' && (<>
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

          {/* Bonus / Penalty Dice */}
          <div className="mb-5">
            <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>보너스 / 페널티 다이스</label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.7rem', color: '#4ade80', minWidth: '36px' }}>보너스</span>
                <button
                  onClick={() => setBonusDice(Math.max(0, bonusDice - 1))}
                  disabled={bonusDice === 0}
                  className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center"
                  style={{
                    backgroundColor: bonusDice === 0 ? 'var(--bg-base)' : 'var(--bg-elevated)',
                    color: bonusDice === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--bg-border)',
                    cursor: bonusDice === 0 ? 'default' : 'pointer',
                  }}
                >-</button>
                <span className="text-sm font-semibold" style={{
                  color: bonusDice > 0 ? '#4ade80' : 'var(--text-muted)',
                  minWidth: '12px', textAlign: 'center',
                }}>{bonusDice}</span>
                <button
                  onClick={() => setBonusDice(Math.min(2, bonusDice + 1))}
                  disabled={bonusDice === 2}
                  className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center"
                  style={{
                    backgroundColor: bonusDice === 2 ? 'var(--bg-base)' : 'var(--bg-elevated)',
                    color: bonusDice === 2 ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--bg-border)',
                    cursor: bonusDice === 2 ? 'default' : 'pointer',
                  }}
                >+</button>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.7rem', color: '#f87171', minWidth: '36px' }}>페널티</span>
                <button
                  onClick={() => setPenaltyDice(Math.max(0, penaltyDice - 1))}
                  disabled={penaltyDice === 0}
                  className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center"
                  style={{
                    backgroundColor: penaltyDice === 0 ? 'var(--bg-base)' : 'var(--bg-elevated)',
                    color: penaltyDice === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--bg-border)',
                    cursor: penaltyDice === 0 ? 'default' : 'pointer',
                  }}
                >-</button>
                <span className="text-sm font-semibold" style={{
                  color: penaltyDice > 0 ? '#f87171' : 'var(--text-muted)',
                  minWidth: '12px', textAlign: 'center',
                }}>{penaltyDice}</span>
                <button
                  onClick={() => setPenaltyDice(Math.min(2, penaltyDice + 1))}
                  disabled={penaltyDice === 2}
                  className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center"
                  style={{
                    backgroundColor: penaltyDice === 2 ? 'var(--bg-base)' : 'var(--bg-elevated)',
                    color: penaltyDice === 2 ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--bg-border)',
                    cursor: penaltyDice === 2 ? 'default' : 'pointer',
                  }}
                >+</button>
              </div>
            </div>
            {(bonusDice > 0 && penaltyDice > 0) && (
              <div className="mt-1" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                상쇄: 실질 {bonusDice > penaltyDice
                  ? `보너스 ${bonusDice - penaltyDice}개`
                  : penaltyDice > bonusDice
                    ? `페널티 ${penaltyDice - bonusDice}개`
                    : '없음 (일반 d100)'}
              </div>
            )}
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
          </>)}
        </div>
      </div>
    </div>,
    document.body
  )
}
