import React, { useState } from 'react'
import { useStore } from '../store'

const COC_SKILLS = [
  '격투', '사격', '회피', '흔적발견', '청취', '도서관이용', '역사', '오컬트',
  '설득', '위협', '매혹', '심리학', '응급처치', '운전', '은신', '잠입',
  '의학', '생물학', '화학', '물리학', '법률', '회계', '예술', '사진술',
  '말돌리기', '수영', '등반', '점프', '자물쇠따기', '전기수리', '기계수리', '컴퓨터',
]

type Difficulty = 'regular' | 'hard' | 'extreme'

interface Props {
  onClose: () => void
}

export default function AttemptReviewModal({ onClose }: Props) {
  const { pendingAttempt, setPendingAttempt, ws } = useStore()
  const [skill, setSkill] = useState(pendingAttempt?.detectedSkill ?? COC_SKILLS[0])
  const [difficulty, setDifficulty] = useState<Difficulty>('regular')

  if (!pendingAttempt) return null

  const diffLabels: Record<Difficulty, string> = {
    regular: '보통',
    hard: '어려움',
    extreme: '극한',
  }

  function grantAttempt() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !pendingAttempt) return
    ws.send(JSON.stringify({
      type: 'judgment_request',
      charId: pendingAttempt.charId,
      skill,
      difficulty,
      outcomes: {},  // No preset outcomes — GM can set them via ActionRequestModal
    }))
    setPendingAttempt(null)
    onClose()
  }

  function dismissAttempt() {
    setPendingAttempt(null)
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-md p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>기술 시도 선언</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{pendingAttempt.charName}</span> 가 기술 시도를 선언했습니다.
        </p>

        {/* Attempt text */}
        <div className="mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>[시도]</div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{pendingAttempt.attempt}</p>
        </div>

        {/* Skill override */}
        <div className="mb-3">
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>판정 기술</label>
          <select value={skill} onChange={e => setSkill(e.target.value)} style={inputStyle}>
            {COC_SKILLS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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

        <div className="flex gap-2">
          <button
            onClick={dismissAttempt}
            className="px-4 py-2 text-sm rounded-lg transition-all"
            style={{ color: '#f87171', border: '1px solid #f8717140' }}
          >
            무시
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
          >
            나중에
          </button>
          <button
            onClick={grantAttempt}
            className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all"
            style={{ backgroundColor: 'var(--teal)', color: '#0a0e1a' }}
          >
            판정 실행
          </button>
        </div>
      </div>
    </div>
  )
}
