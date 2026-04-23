import React, { useState } from 'react'
import { useStore } from '../store'

const outcomeLabel: Record<string, { label: string; color: string }> = {
  extreme_success: { label: '극단적 성공', color: '#fbbf24' },
  hard_success:    { label: '어려운 성공', color: '#4ade80' },
  regular_success: { label: '성공', color: '#4ade80' },
  regular_failure: { label: '실패', color: '#f87171' },
  bad_failure:     { label: '나쁜 실패', color: '#ef4444' },
  fumble:          { label: '대실패', color: '#dc2626' },
}

const diffLabel: Record<string, string> = {
  regular: '보통',
  hard: '어려움',
  extreme: '극한',
}

export default function JudgmentResultOverlay() {
  const { pendingJudgment, ws } = useStore()
  const [pushText, setPushText] = useState('')
  const [showPushInput, setShowPushInput] = useState(false)

  if (!pendingJudgment) return null

  const roll = pendingJudgment.rolls?.[0]
  if (!roll) return null

  const outcome = outcomeLabel[pendingJudgment.outcome] ?? { label: pendingJudgment.outcome, color: 'var(--text-primary)' }
  const diff = diffLabel[pendingJudgment.request?.difficulty] ?? pendingJudgment.request?.difficulty
  const isSuccess = ['extreme_success', 'hard_success', 'regular_success'].includes(pendingJudgment.outcome)

  function sendResolve(resolution: any) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'judgment_resolve',
      judgmentId: pendingJudgment.id,
      resolution,
    }))
  }

  function sendCancel() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'judgment_cancel',
      judgmentId: pendingJudgment.id,
    }))
  }

  function handleAccept() {
    sendResolve({ action: 'accept' })
  }

  function handlePush() {
    if (!showPushInput) {
      setShowPushInput(true)
      return
    }
    sendResolve({ action: 'push', pushConsequence: pushText.trim() || '(대가 미지정)' })
    setShowPushInput(false)
    setPushText('')
  }

  function handleLuckSpend() {
    sendResolve({ action: 'luck_spend' })
  }

  // Tens dice breakdown display
  const tensDice = roll.tensDice as number[] | undefined
  const bp = pendingJudgment.request?.bonusPenalty
  const hasBP = bp && (bp.bonus > 0 || bp.penalty > 0)

  return (
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      right: '1rem',
      width: '340px',
      borderRadius: '1rem',
      overflow: 'hidden',
      border: `1px solid ${outcome.color}40`,
      backgroundColor: 'var(--bg-panel)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      zIndex: 40,
    }}>
      {/* Accent bar */}
      <div style={{ height: '3px', backgroundColor: outcome.color }} />

      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Header */}
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {roll.charName} · {roll.skill} · {diff} 난이도 · 목표 {roll.target}
        </div>

        {/* Big roll + outcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{
            fontSize: '3rem',
            fontWeight: 800,
            lineHeight: 1,
            color: outcome.color,
            fontVariantNumeric: 'tabular-nums',
            minWidth: '4rem',
            textAlign: 'center',
          }}>
            {roll.roll}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: outcome.color }}>
              {outcome.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              기본값 {roll.baseSkill}%
            </div>
          </div>
        </div>

        {/* Tens dice breakdown */}
        {hasBP && tensDice && tensDice.length > 1 && (
          <div style={{
            fontSize: '0.65rem', color: 'var(--text-muted)',
            marginBottom: '0.75rem', padding: '0.5rem',
            backgroundColor: 'var(--bg-elevated)', borderRadius: '0.5rem',
          }}>
            <span>텐다이스: {tensDice.map(t => String(t).padStart(2, '0')).join(', ')}</span>
            <span style={{ marginLeft: '0.5rem' }}>
              (일다이스: {String((roll.roll % 10) || (roll.roll === 100 ? 0 : roll.roll % 10))})
            </span>
            <br />
            <span style={{ color: bp.bonus > bp.penalty ? '#4ade80' : bp.penalty > bp.bonus ? '#f87171' : 'var(--text-muted)' }}>
              {bp.bonus > 0 && `보너스 ${bp.bonus}`}
              {bp.bonus > 0 && bp.penalty > 0 && ' / '}
              {bp.penalty > 0 && `페널티 ${bp.penalty}`}
              {' → '}
              {bp.bonus > bp.penalty
                ? `최저 채택`
                : bp.penalty > bp.bonus
                  ? `최고 채택`
                  : '상쇄'}
            </span>
          </div>
        )}

        {/* Outcome description */}
        {pendingJudgment.appliedOutcome?.desc && (
          <div style={{
            fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.5,
            marginBottom: '0.75rem', padding: '0.5rem',
            backgroundColor: 'var(--bg-elevated)', borderRadius: '0.5rem',
            borderLeft: `3px solid ${outcome.color}`,
          }}>
            {pendingJudgment.appliedOutcome.desc}
          </div>
        )}

        {/* Additional rolls (opposed / group) */}
        {pendingJudgment.rolls && pendingJudgment.rolls.length > 1 && (
          <div style={{
            fontSize: '0.7rem', marginBottom: '0.75rem', padding: '0.5rem',
            backgroundColor: 'var(--bg-elevated)', borderRadius: '0.5rem',
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
              {pendingJudgment.request?.type === 'opposed' ? '대항 판정' : '참가자 결과'}
            </div>
            {pendingJudgment.rolls.map((r: any, i: number) => {
              const o = outcomeLabel[r.outcome] ?? { label: r.outcome, color: 'var(--text-primary)' }
              return (
                <div key={i} className="flex items-center gap-2 py-1" style={{ borderTop: i > 0 ? '1px solid var(--bg-border)' : 'none' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '60px' }}>{r.charName}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{r.skill} ({r.baseSkill}%)</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: o.color }}>{r.roll}</span>
                  <span style={{ color: o.color, fontSize: '0.65rem' }}>{o.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Push input area */}
        {showPushInput && (
          <div style={{ marginBottom: '0.75rem' }}>
            <textarea
              value={pushText}
              onChange={e => setPushText(e.target.value)}
              placeholder="밀어붙이기 대가를 입력하세요..."
              rows={2}
              style={{
                width: '100%',
                background: 'var(--bg-base)',
                border: '1px solid var(--bg-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                padding: '6px 8px',
                fontSize: '0.75rem',
                resize: 'none',
              }}
              autoFocus
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Accept */}
          <button
            onClick={handleAccept}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--teal)',
              color: '#0a0e1a',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            수락
          </button>

          {/* Push — enabled only on failure, not fumble */}
          <button
            onClick={handlePush}
            disabled={!pendingJudgment.canPush}
            title={
              isSuccess ? '성공 — 밀어붙이기 불필요'
              : pendingJudgment.outcome === 'fumble' ? '대실패 — 밀어붙이기 불가'
              : pendingJudgment.pushed ? '이미 밀어붙임'
              : '동일 난이도로 재굴림 (1회)'
            }
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: pendingJudgment.canPush ? '#f97316' : 'var(--bg-elevated)',
              color: pendingJudgment.canPush ? '#0a0e1a' : 'var(--text-muted)',
              border: pendingJudgment.canPush ? 'none' : '1px solid var(--bg-border)',
              cursor: pendingJudgment.canPush ? 'pointer' : 'default',
              opacity: pendingJudgment.canPush ? 1 : 0.5,
            }}
          >
            {showPushInput ? '확인' : '밀어붙이기'}
          </button>

          {/* Luck spend */}
          <button
            onClick={handleLuckSpend}
            disabled={!pendingJudgment.canSpendLuck}
            title={
              isSuccess ? '성공 — 행운 소비 불필요'
              : pendingJudgment.outcome === 'fumble' ? '대실패 — 행운 소비 불가'
              : pendingJudgment.luckCost != null && pendingJudgment.luckCost > pendingJudgment.currentLuck
                ? `행운 부족 (필요: ${pendingJudgment.luckCost}, 보유: ${pendingJudgment.currentLuck})`
              : `행운 ${pendingJudgment.luckCost}점 소비로 성공 전환`
            }
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: pendingJudgment.canSpendLuck ? '#fb923c' : 'var(--bg-elevated)',
              color: pendingJudgment.canSpendLuck ? '#0a0e1a' : 'var(--text-muted)',
              border: pendingJudgment.canSpendLuck ? 'none' : '1px solid var(--bg-border)',
              cursor: pendingJudgment.canSpendLuck ? 'pointer' : 'default',
              opacity: pendingJudgment.canSpendLuck ? 1 : 0.5,
            }}
          >
            {pendingJudgment.luckCost != null
              ? `행운 ${pendingJudgment.luckCost}점`
              : '행운 소비'}
          </button>

          {/* Cancel */}
          <button
            onClick={sendCancel}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>

        {/* Status hint */}
        {isSuccess && (
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
            성공 — [수락]만 가능합니다
          </div>
        )}
        {pendingJudgment.outcome === 'fumble' && (
          <div style={{ fontSize: '0.6rem', color: '#dc2626', marginTop: '0.5rem', textAlign: 'center' }}>
            대실패 — 밀어붙이기/행운 소비 불가
          </div>
        )}
      </div>
    </div>
  )
}
