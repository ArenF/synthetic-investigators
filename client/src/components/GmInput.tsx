import React, { useState, useRef } from 'react'
import { useStore } from '../store'
import ActionRequestModal from './ActionRequestModal'
import NpcSpeechModal from './NpcSpeechModal'
import TurnOrderModal from './TurnOrderModal'

export default function GmInput() {
  const { ws, wsReady, isProcessingTurn, characters, turnOrder, setTurnOrder } = useStore()
  const [text, setText] = useState('')
  const [targetMode, setTargetMode] = useState<'all' | string>('all')
  const [showActionModal, setShowActionModal] = useState(false)
  const [showNpcModal, setShowNpcModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function getTargetLabel(): string {
    if (targetMode === 'all') return '[전체 상황]'
    const char = characters.find(c => c.id === targetMode)
    return char ? `[${char.name}의 상황]` : '[전체 상황]'
  }

  function getTargetIds(): string[] {
    if (targetMode === 'all') return turnOrder.length > 0 ? turnOrder : characters.map(c => c.id)
    return [targetMode]
  }

  function sendTurn() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (!text.trim() || isProcessingTurn) return

    ws.send(JSON.stringify({
      type: 'send_turn',
      gmText: text.trim(),
      targetLabel: getTargetLabel(),
      targetIds: getTargetIds(),
    }))
    setText('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      sendTurn()
    }
  }

  function confirmOrder(order: string[]) {
    setTurnOrder(order)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'set_order', order }))
    }
  }

  return (
    <>
      <div className="border-t border-coc-border bg-coc-panel p-3">
        {/* Target selector */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-coc-muted text-xs">대상:</span>
          <select
            value={targetMode}
            onChange={e => setTargetMode(e.target.value)}
            className="bg-coc-bg border border-coc-border rounded px-2 py-1 text-xs focus:border-coc-accent outline-none"
          >
            <option value="all">전체</option>
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {targetMode !== 'all' && (
            <span className="text-coc-muted text-xs opacity-60">{getTargetLabel()}</span>
          )}
        </div>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={isProcessingTurn}
          placeholder={isProcessingTurn ? 'AI 응답 대기 중...' : 'GM 장면 설명 입력... (Ctrl+Enter로 전송)'}
          className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none resize-none disabled:opacity-50 mb-2"
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActionModal(true)}
            disabled={isProcessingTurn}
            title="행동 요청 (기술 판정)"
            className="bg-coc-bg border border-coc-border hover:border-coc-accent rounded px-3 py-1.5 text-xs text-coc-accent transition-all disabled:opacity-40"
          >
            🎲 판정
          </button>
          <button
            onClick={() => setShowNpcModal(true)}
            disabled={isProcessingTurn}
            title="NPC 대화"
            className="bg-coc-bg border border-coc-border hover:border-purple-400 rounded px-3 py-1.5 text-xs text-purple-400 transition-all disabled:opacity-40"
          >
            💬 NPC
          </button>
          <button
            onClick={() => setShowOrderModal(true)}
            disabled={isProcessingTurn}
            title="행동 순서 설정"
            className="bg-coc-bg border border-coc-border hover:border-coc-muted rounded px-3 py-1.5 text-xs text-coc-muted transition-all disabled:opacity-40"
          >
            ⬆⬇ 순서
          </button>

          <div className="flex-1" />

          {!wsReady && (
            <span className="text-yellow-500 text-xs">연결 중...</span>
          )}

          <button
            onClick={sendTurn}
            disabled={!wsReady || !text.trim() || isProcessingTurn}
            className="bg-coc-accent text-coc-bg font-bold px-4 py-1.5 rounded text-sm hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            전송
          </button>
        </div>
      </div>

      {showActionModal && <ActionRequestModal onClose={() => setShowActionModal(false)} />}
      {showNpcModal && <NpcSpeechModal onClose={() => setShowNpcModal(false)} />}
      {showOrderModal && (
        <TurnOrderModal
          onClose={() => setShowOrderModal(false)}
          onConfirm={confirmOrder}
        />
      )}
    </>
  )
}
