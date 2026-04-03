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

export default function ActionRequestModal({ onClose }: Props) {
  const { characters, ws } = useStore()
  const [targetId, setTargetId] = useState<string>('all')
  const [skill, setSkill] = useState(COC_SKILLS[0])
  const [customSkill, setCustomSkill] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('regular')
  const [successText, setSuccessText] = useState('')
  const [failureText, setFailureText] = useState('')

  const diffLabels: Record<Difficulty, string> = {
    regular: '보통 (전체%)',
    hard: '어려움 (절반%)',
    extreme: '극한 (1/5%)',
  }

  function rollDice() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const skillName = customSkill.trim() || skill
    const targets = targetId === 'all' ? characters.map(c => c.id) : [targetId]

    for (const charId of targets) {
      ws.send(JSON.stringify({
        type: 'dice_roll',
        charId,
        skill: skillName,
        difficulty,
        successText,
        failureText,
      }))
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-coc-panel border border-coc-border rounded-xl p-6 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-coc-accent font-bold text-lg mb-4">행동 요청 (기술 판정)</h2>

        {/* Target */}
        <div className="mb-4">
          <label className="text-coc-muted text-xs block mb-1">대상</label>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          >
            <option value="all">전체</option>
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Skill */}
        <div className="mb-4">
          <label className="text-coc-muted text-xs block mb-1">기술</label>
          <select
            value={skill}
            onChange={e => setSkill(e.target.value)}
            className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none mb-2"
          >
            {COC_SKILLS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="text"
            value={customSkill}
            onChange={e => setCustomSkill(e.target.value)}
            placeholder="직접 입력 (위 선택을 덮어씁니다)"
            className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
        </div>

        {/* Difficulty */}
        <div className="mb-4">
          <label className="text-coc-muted text-xs block mb-1">난이도</label>
          <div className="flex gap-2">
            {(['regular', 'hard', 'extreme'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded text-xs font-medium transition-all ${
                  difficulty === d
                    ? 'bg-coc-accent text-coc-bg'
                    : 'bg-coc-bg border border-coc-border hover:border-coc-muted text-coc-muted'
                }`}
              >
                {diffLabels[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Success/Failure text */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-coc-muted text-xs block mb-1">성공 시 설명</label>
            <input
              type="text"
              value={successText}
              onChange={e => setSuccessText(e.target.value)}
              placeholder="단서를 발견했다"
              className="w-full bg-coc-bg border border-coc-border rounded px-2 py-1.5 text-xs focus:border-coc-accent outline-none"
            />
          </div>
          <div>
            <label className="text-coc-muted text-xs block mb-1">실패 시 설명</label>
            <input
              type="text"
              value={failureText}
              onChange={e => setFailureText(e.target.value)}
              placeholder="아무것도 보이지 않는다"
              className="w-full bg-coc-bg border border-coc-border rounded px-2 py-1.5 text-xs focus:border-coc-accent outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-coc-bg border border-coc-border rounded-lg py-2 text-sm hover:border-coc-muted transition-all"
          >
            취소
          </button>
          <button
            onClick={rollDice}
            className="flex-1 bg-coc-accent text-coc-bg rounded-lg py-2 text-sm font-semibold hover:bg-yellow-400 transition-all"
          >
            🎲 주사위 굴리기
          </button>
        </div>
      </div>
    </div>
  )
}
