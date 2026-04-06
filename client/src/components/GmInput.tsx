import React, { useState, useRef } from 'react'
import { useStore } from '../store'
import ActionRequestModal from './ActionRequestModal'
import NpcSpeechModal from './NpcSpeechModal'
import TurnOrderModal from './TurnOrderModal'

const CHIP_BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '2px 10px', borderRadius: '999px', fontSize: '0.7rem',
  border: '1px solid var(--bg-border)', cursor: 'pointer',
  backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)',
  transition: 'border-color 0.15s, color 0.15s', whiteSpace: 'nowrap',
}

const CHIP_ACTIVE: React.CSSProperties = {
  ...CHIP_BASE,
  backgroundColor: 'rgba(20,184,166,0.12)',
  borderColor: 'var(--teal)',
  color: 'var(--teal)',
}

export default function GmInput() {
  const { ws, wsReady, isProcessingTurn, characters, turnOrder, setTurnOrder } = useStore()
  const [text, setText] = useState('')
  const [targetMode, setTargetMode] = useState<'all' | string>('all')
  const [showActionModal, setShowActionModal] = useState(false)
  const [showNpcModal, setShowNpcModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cycle through: all → char[0] → char[1] → ... → all
  function cycleTarget() {
    if (targetMode === 'all') {
      if (characters.length > 0) setTargetMode(characters[0].id)
    } else {
      const idx = characters.findIndex(c => c.id === targetMode)
      if (idx === -1 || idx >= characters.length - 1) setTargetMode('all')
      else setTargetMode(characters[idx + 1].id)
    }
  }

  function getTargetLabel(): string {
    if (targetMode === 'all') return 'all'
    const char = characters.find(c => c.id === targetMode)
    return char ? char.name : 'all'
  }

  function getTargetIds(): string[] {
    if (targetMode === 'all') return turnOrder.length > 0 ? turnOrder : characters.map(c => c.id)
    return [targetMode]
  }

  function getGmTargetLabel(): string {
    if (targetMode === 'all') return '[전체 상황]'
    const char = characters.find(c => c.id === targetMode)
    return char ? `[${char.name}의 상황]` : '[전체 상황]'
  }

  function sendTurn() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (!text.trim() || isProcessingTurn) return
    ws.send(JSON.stringify({
      type: 'send_turn',
      gmText: text.trim(),
      targetLabel: getGmTargetLabel(),
      targetIds: getTargetIds(),
    }))
    setText('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  const canSend = wsReady && !!text.trim() && !isProcessingTurn

  return (
    <>
      <div style={{
        flexShrink: 0,
        backgroundColor: 'var(--bg-panel)',
        borderTop: '1px solid var(--bg-border)',
        padding: '0.625rem 2rem 0.75rem',
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* ── Tag chips row ── */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Target chip */}
          <button
            onClick={cycleTarget}
            style={targetMode === 'all' ? CHIP_ACTIVE : { ...CHIP_BASE, borderColor: '#fb923c', color: '#fb923c', backgroundColor: 'rgba(251,191,36,0.08)' }}
            title="클릭하여 대상 변경"
          >
            target:{getTargetLabel()}
          </button>

          {/* Action chips */}
          <button
            onClick={() => setShowActionModal(true)}
            disabled={isProcessingTurn}
            style={{ ...CHIP_BASE, opacity: isProcessingTurn ? 0.4 : 1 }}
            onMouseEnter={e => { if (!isProcessingTurn) { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            판정
          </button>
          <button
            onClick={() => setShowNpcModal(true)}
            disabled={isProcessingTurn}
            style={{ ...CHIP_BASE, opacity: isProcessingTurn ? 0.4 : 1 }}
            onMouseEnter={e => { if (!isProcessingTurn) { e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.color = '#a78bfa' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            NPC
          </button>
          <button
            onClick={() => setShowOrderModal(true)}
            disabled={isProcessingTurn}
            style={{ ...CHIP_BASE, opacity: isProcessingTurn ? 0.4 : 1 }}
            onMouseEnter={e => { if (!isProcessingTurn) { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            순서
          </button>

          {/* Status indicator */}
          {isProcessingTurn && (
            <span style={{ fontSize: '0.7rem', color: '#fbbf24', marginLeft: 'auto' }}>
              ● AI 응답 중...
            </span>
          )}
          {!wsReady && (
            <span style={{ fontSize: '0.7rem', color: '#fb923c', marginLeft: 'auto' }}>
              ● 연결 중...
            </span>
          )}
        </div>

        {/* ── Input row ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--bg-border)',
          borderRadius: '0.75rem',
          padding: '0.5rem 0.75rem',
          transition: 'border-color 0.15s',
        }}
          onFocus={() => {}}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(20,184,166,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
        >
          {/* Send icon button */}
          <button
            onClick={sendTurn}
            disabled={!canSend}
            title="전송 (Enter)"
            style={{
              background: 'none', border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
              color: canSend ? 'var(--teal)' : 'var(--text-muted)',
              opacity: canSend ? 1 : 0.4,
              padding: '0 4px', flexShrink: 0,
              transition: 'color 0.15s, opacity 0.15s',
              display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessingTurn || !wsReady}
            placeholder={
              isProcessingTurn ? 'AI 응답 대기 중...'
              : !wsReady ? '서버 연결 대기 중...'
              : '장면을 입력하세요... (Enter로 전송)'
            }
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: '0.875rem', color: 'var(--text-primary)',
              opacity: (isProcessingTurn || !wsReady) ? 0.5 : 1,
            }}
          />
        </div>
        </div>{/* end maxWidth wrapper */}
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
