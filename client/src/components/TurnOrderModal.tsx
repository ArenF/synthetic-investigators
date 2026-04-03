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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-coc-panel border border-coc-border rounded-xl p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-coc-accent font-bold text-lg mb-4">행동 순서 설정</h2>

        <div className="space-y-2 mb-4">
          {order.map((id, idx) => {
            const char = charMap[id]
            if (!char) return null
            return (
              <div key={id} className="flex items-center gap-2 bg-coc-bg rounded-lg px-3 py-2">
                <span className="text-coc-muted text-sm w-5">{idx + 1}.</span>
                <span className="flex-1 text-sm">{char.name}</span>
                <button onClick={() => moveUp(idx)} className="text-coc-muted hover:text-coc-text p-1">↑</button>
                <button onClick={() => moveDown(idx)} className="text-coc-muted hover:text-coc-text p-1">↓</button>
              </div>
            )
          })}
        </div>

        {/* Characters not in order */}
        {characters.filter(c => !order.includes(c.id)).length > 0 && (
          <div className="mb-4">
            <p className="text-coc-muted text-xs mb-2">제외된 캐릭터 (클릭해서 추가)</p>
            {characters.filter(c => !order.includes(c.id)).map(c => (
              <button
                key={c.id}
                onClick={() => toggleInclude(c.id)}
                className="text-sm text-coc-muted hover:text-coc-accent mr-2"
              >
                + {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-coc-bg border border-coc-border rounded-lg py-2 text-sm hover:border-coc-muted transition-all"
          >
            취소
          </button>
          <button
            onClick={() => { onConfirm(order); onClose() }}
            className="flex-1 bg-coc-accent text-coc-bg rounded-lg py-2 text-sm font-semibold hover:bg-yellow-400 transition-all"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
