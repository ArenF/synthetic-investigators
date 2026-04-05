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
      <div className="shrink-0 px-4 py-3 space-y-2" style={{ backgroundColor: 'var(--bg-panel)', borderTop: '1px solid var(--bg-border)' }}>
        {/* Row 1: Target selector + connection */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>대상:</span>
          <select
            value={targetMode}
            onChange={e => setTargetMode(e.target.value)}
            className="text-xs"
          >
            <option value="all">전체</option>
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {targetMode !== 'all' && (
            <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>{getTargetLabel()}</span>
          )}
          <div className="flex-1" />
          {!wsReady && (
            <span className="text-xs" style={{ color: '#fb923c' }}>연결 중...</span>
          )}
        </div>

        {/* Row 2: Textarea + action buttons */}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isProcessingTurn}
            placeholder={isProcessingTurn ? 'AI 응답 대기 중...' : 'GM 장면 설명 입력... (Ctrl+Enter로 전송)'}
            className="flex-1 text-sm resize-none disabled:opacity-50"
            style={{ minHeight: '80px' }}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowActionModal(true)}
              disabled={isProcessingTurn}
              title="행동 요청 (기술 판정)"
              className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-40"
              style={{ border: '1px solid var(--bg-border)', color: 'var(--teal)', backgroundColor: 'var(--bg-elevated)' }}
            >
              판정
            </button>
            <button
              onClick={() => setShowNpcModal(true)}
              disabled={isProcessingTurn}
              title="NPC 대화"
              className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-40"
              style={{ border: '1px solid var(--bg-border)', color: '#a78bfa', backgroundColor: 'var(--bg-elevated)' }}
            >
              NPC
            </button>
            <button
              onClick={() => setShowOrderModal(true)}
              disabled={isProcessingTurn}
              title="행동 순서 설정"
              className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-40"
              style={{ border: '1px solid var(--bg-border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}
            >
              순서
            </button>
            <button
              onClick={sendTurn}
              disabled={!wsReady || !text.trim() || isProcessingTurn}
              className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: 'var(--teal)', color: '#0a0e1a' }}
            >
              전송
            </button>
          </div>
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
