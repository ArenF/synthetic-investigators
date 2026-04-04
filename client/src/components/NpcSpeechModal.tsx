import React, { useState, useEffect } from 'react'
import { useStore } from '../store'

interface Props {
  onClose: () => void
}

export default function NpcSpeechModal({ onClose }: Props) {
  const { npcs, ws } = useStore()
  const [selectedNpc, setSelectedNpc] = useState('')

  useEffect(() => {
    if (npcs.length > 0) {
      setSelectedNpc(npcs[0].name)
    }
  }, [npcs])
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-coc-panel border border-coc-border rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-coc-text mb-5">NPC 대화</h2>

        <div className="mb-4">
          <label className="text-coc-muted text-xs block mb-1">NPC 선택</label>
          {npcs.length > 0 && (
            <select
              value={selectedNpc}
              onChange={e => setSelectedNpc(e.target.value)}
              className="w-full bg-coc-bg border border-coc-border rounded-lg px-3 py-2 text-sm focus:border-coc-accent outline-none mb-2"
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
            className="w-full bg-coc-bg border border-coc-border rounded-lg px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
        </div>

        <div className="mb-5">
          <label className="text-coc-muted text-xs block mb-1">대사</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="..."
            className="w-full bg-coc-bg border border-coc-border rounded-lg px-3 py-2 text-sm focus:border-coc-accent outline-none resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-coc-muted hover:text-coc-text border border-coc-border rounded-lg transition-all"
          >
            취소
          </button>
          <button
            onClick={sendSpeech}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-coc-accent hover:bg-coc-accent-hover text-coc-bg rounded-lg transition-all"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}
