import React, { useState } from 'react'
import { useStore } from '../store'

interface Props {
  onClose: () => void
}

export default function NpcSpeechModal({ onClose }: Props) {
  const { npcs, ws } = useStore()
  const [selectedNpc, setSelectedNpc] = useState(npcs[0]?.name ?? '')
  const [customName, setCustomName] = useState('')
  const [text, setText] = useState('')

  function sendSpeech() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const npcName = customName.trim() || selectedNpc
    if (!npcName || !text.trim()) return
    ws.send(JSON.stringify({ type: 'npc_speak', npcName, text: text.trim() }))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-coc-panel border border-coc-border rounded-xl p-6 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-coc-accent font-bold text-lg mb-4">NPC 대화</h2>

        <div className="mb-4">
          <label className="text-coc-muted text-xs block mb-1">NPC 선택</label>
          {npcs.length > 0 && (
            <select
              value={selectedNpc}
              onChange={e => setSelectedNpc(e.target.value)}
              className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none mb-2"
            >
              {npcs.map(n => (
                <option key={n.id} value={n.name}>{n.name}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="직접 입력 (NPC 이름)"
            className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="text-coc-muted text-xs block mb-1">대사</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="..."
            className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-coc-bg border border-coc-border rounded-lg py-2 text-sm hover:border-coc-muted transition-all"
          >
            취소
          </button>
          <button
            onClick={sendSpeech}
            className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-purple-500 transition-all"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}
