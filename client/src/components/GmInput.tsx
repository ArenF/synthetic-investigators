import React, { useState, useRef } from 'react'
import { useStore } from '../store'
import ActionRequestModal from './ActionRequestModal'
import NpcSpeechModal from './NpcSpeechModal'
import TurnOrderModal from './TurnOrderModal'
import AttemptReviewModal from './AttemptReviewModal'

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

const CHIP_ORANGE: React.CSSProperties = {
  ...CHIP_BASE,
  backgroundColor: 'rgba(251,191,36,0.08)',
  borderColor: '#fb923c',
  color: '#fb923c',
}

/** Returns onMouseEnter/onMouseLeave handlers that highlight a chip with the given color. */
function chipHover(hoverColor: string, disabled: boolean) {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        e.currentTarget.style.borderColor = hoverColor
        e.currentTarget.style.color = hoverColor
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.borderColor = 'var(--bg-border)'
      e.currentTarget.style.color = 'var(--text-muted)'
    },
  }
}

export default function GmInput() {
  const { ws, wsReady, isProcessingTurn, turnQueueSize, characters, turnOrder, setTurnOrder, pendingAttempts } = useStore()
  const pendingAttempt = pendingAttempts[0] ?? null
  const [text, setText] = useState('')
  const [targetMode, setTargetMode] = useState<'all' | string>('all')
  const [showActionModal, setShowActionModal] = useState(false)
  const [showNpcModal, setShowNpcModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showAttemptModal, setShowAttemptModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-show the attempt review modal when a new attempt comes in
  React.useEffect(() => {
    if (pendingAttempt) setShowAttemptModal(true)
  }, [pendingAttempt])

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
    if (!text.trim()) return
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

  const canSend = wsReady && !!text.trim()

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
            style={targetMode === 'all' ? CHIP_ACTIVE : CHIP_ORANGE}
            title="클릭하여 대상 변경"
          >
            target:{getTargetLabel()}
          </button>

          {/* Action chips */}
          <button
            onClick={() => setShowActionModal(true)}
            disabled={isProcessingTurn}
            style={{ ...CHIP_BASE, opacity: isProcessingTurn ? 0.4 : 1 }}
            {...chipHover('var(--teal)', isProcessingTurn)}
          >
            판정
          </button>
          <button
            onClick={() => setShowNpcModal(true)}
            disabled={isProcessingTurn}
            style={{ ...CHIP_BASE, opacity: isProcessingTurn ? 0.4 : 1 }}
            {...chipHover('#a78bfa', isProcessingTurn)}
          >
            NPC
          </button>
          <button
            onClick={() => setShowOrderModal(true)}
            disabled={isProcessingTurn}
            style={{ ...CHIP_BASE, opacity: isProcessingTurn ? 0.4 : 1 }}
            {...chipHover('var(--text-primary)', isProcessingTurn)}
          >
            순서
          </button>
          {pendingAttempt && (
            <button
              onClick={() => setShowAttemptModal(true)}
              title={`${pendingAttempt.charName}의 시도 선언 — 클릭하여 처리`}
              style={{
                ...CHIP_BASE,
                backgroundColor: 'rgba(251,191,36,0.12)',
                borderColor: '#fbbf24',
                color: '#fbbf24',
                animation: 'pulse 2s infinite',
              }}
            >
              ⚡ {pendingAttempt.charName} 시도 대기
              {pendingAttempts.length > 1 && (
                <span style={{ marginLeft: 4, fontSize: '0.7rem', opacity: 0.8 }}>
                  (+{pendingAttempts.length - 1})
                </span>
              )}
            </button>
          )}

          {/* Status indicator */}
          {isProcessingTurn && turnQueueSize === 0 && (
            <span style={{ fontSize: '0.7rem', color: '#fbbf24', marginLeft: 'auto' }}>
              ● AI 응답 중...
            </span>
          )}
          {isProcessingTurn && turnQueueSize > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#fb923c', marginLeft: 'auto' }}>
              ● AI 응답 중 (대기 {turnQueueSize}턴)
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
            disabled={!wsReady}
            placeholder={
              !wsReady ? '서버 연결 대기 중...'
              : isProcessingTurn ? '장면을 입력하세요... (AI 응답 중에도 큐에 추가됩니다)'
              : '장면을 입력하세요... (Enter로 전송)'
            }
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: '0.875rem', color: 'var(--text-primary)',
              opacity: !wsReady ? 0.5 : 1,
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
      {showAttemptModal && pendingAttempts.length > 0 && (
        <AttemptReviewModal
          onClose={() => setShowAttemptModal(false)}
        />
      )}
    </>
  )
}
