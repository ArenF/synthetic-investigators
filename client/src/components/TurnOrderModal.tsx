import React, { useState } from 'react'
import { useStore } from '../store'

interface Props {
  onClose: () => void
  onConfirm: (order: string[]) => void
}

export default function TurnOrderModal({ onClose, onConfirm }: Props) {
  const characters = useStore(s => s.characters)
  const turnOrder = useStore(s => s.turnOrder)
  const [order, setOrder] = useState<string[]>(turnOrder.length > 0 ? turnOrder : characters.map(c => c.id))

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...order]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setOrder(next)
  }

  function moveDown(idx: number) {
    if (idx === order.length - 1) return
    const next = [...order]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setOrder(next)
  }

  function toggleInclude(id: string) {
    setOrder(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const charMap = Object.fromEntries(characters.map(c => [c.id, c]))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-md p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>행동 순서 설정</h2>

        <div className="space-y-2 mb-4">
          {order.map((id, idx) => {
            const char = charMap[id]
            if (!char) return null
            return (
              <div key={id} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-sm w-5" style={{ color: 'var(--text-muted)' }}>{idx + 1}.</span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{char.name}</span>
                <button
                  onClick={() => moveUp(idx)}
                  className="p-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  className="p-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  ↓
                </button>
              </div>
            )
          })}
        </div>

        {/* Characters not in order */}
        {characters.filter(c => !order.includes(c.id)).length > 0 && (
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>제외된 캐릭터 (클릭해서 추가)</p>
            {characters.filter(c => !order.includes(c.id)).map(c => (
              <button
                key={c.id}
                onClick={() => toggleInclude(c.id)}
                className="text-sm mr-2 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                + {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
          >
            취소
          </button>
          <button
            onClick={() => { onConfirm(order); onClose() }}
            className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all"
            style={{ backgroundColor: 'var(--teal)', color: '#0a0e1a' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
