import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useStore, type ChatMessage } from '../store'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const outcomeLabel: Record<string, { label: string; color: string }> = {
  extreme_success: { label: '극단적 성공', color: '#fbbf24' },
  hard_success: { label: '어려운 성공', color: '#4ade80' },
  regular_success: { label: '성공', color: '#4ade80' },
  regular_failure: { label: '실패', color: '#f87171' },
  bad_failure: { label: '나쁜 실패', color: '#ef4444' },
  fumble: { label: '대실패', color: '#f87171' },
  failure: { label: '실패', color: '#f87171' },  // backward compat
}

const difficultyLabel: Record<string, string> = {
  regular: '보통',
  hard: '어려움',
  extreme: '극한',
}

function GmMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div style={{
      borderRadius: '0.875rem',
      padding: '0.75rem 1rem',
      backgroundColor: 'var(--bg-panel)',
      borderLeft: '3px solid var(--teal)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--teal)' }}>GM</span>
        {msg.targetLabel && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {msg.targetLabel}</span>}
      </div>
      <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
        <ReactMarkdown>{msg.text}</ReactMarkdown>
      </div>
    </div>
  )
}

function AiMessage({ msg }: { msg: ChatMessage }) {
  if (!msg.done) {
    return (
      <div style={{
        borderRadius: '0.875rem', padding: '0.75rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{msg.charName}</span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full thinking-dot" style={{ backgroundColor: 'var(--text-muted)' }}></span>
          <span className="w-1.5 h-1.5 rounded-full thinking-dot" style={{ backgroundColor: 'var(--text-muted)' }}></span>
          <span className="w-1.5 h-1.5 rounded-full thinking-dot" style={{ backgroundColor: 'var(--text-muted)' }}></span>
        </div>
      </div>
    )
  }

  // 서버에서 구조화된 innerText / actionText 수신
  const innerTag = msg.playMode === 'game' ? '[OOC]' : '[내면]'
  const inner = msg.innerText?.trim()
  const action = msg.actionText?.trim() ?? msg.text  // 구버전 호환 fallback

  return (
    <div style={{
      borderRadius: '0.875rem', overflow: 'hidden',
      backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)',
      }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--teal)' }}></span>
        <span className="text-sm font-medium" style={{ color: 'var(--teal)' }}>{msg.charName}</span>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-primary)' }}>
        {action && (
          <div>
            <span className="text-xs font-semibold" style={{ color: 'var(--teal)' }}>[행동] </span>
            <span className="prose prose-invert prose-sm max-w-none inline">
              <ReactMarkdown>{action}</ReactMarkdown>
            </span>
          </div>
        )}
        {inner && (
          <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
            <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>{innerTag} </span>
            <span className="prose prose-invert prose-sm max-w-none inline italic" style={{ color: 'var(--text-muted)' }}>
              <ReactMarkdown>{inner}</ReactMarkdown>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function NpcMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div style={{
      borderRadius: '0.875rem', padding: '0.75rem 1rem',
      borderLeft: '3px solid rgba(167,139,250,0.6)',
      backgroundColor: 'rgba(88,28,135,0.15)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div className="text-xs font-semibold mb-1" style={{ color: '#a78bfa' }}>{msg.npcName} · NPC</div>
      <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-primary)' }}>"{msg.text}"</p>
    </div>
  )
}

const outcomeBgTint: Record<string, string> = {
  extreme_success: 'rgba(251,191,36,0.07)',
  hard_success:    'rgba(74,222,128,0.06)',
  regular_success: 'rgba(74,222,128,0.06)',
  regular_failure: 'rgba(248,113,113,0.06)',
  bad_failure:     'rgba(239,68,68,0.08)',
  fumble:          'rgba(220,38,38,0.11)',
  failure:         'rgba(248,113,113,0.06)',
}

function DiceMessage({ msg }: { msg: ChatMessage }) {
  const d = msg.diceData
  if (!d) return null
  const outcome = outcomeLabel[d.outcome] ?? { label: d.outcome, color: 'var(--text-primary)' }
  const diff = difficultyLabel[d.difficulty] ?? d.difficulty
  const bgTint = outcomeBgTint[d.outcome] ?? 'transparent'

  return (
    <div style={{
      borderRadius: '0.75rem',
      overflow: 'hidden',
      border: `1px solid ${outcome.color}35`,
      backgroundColor: bgTint,
    }}>
      {/* 상단 accent bar */}
      <div style={{ height: '3px', backgroundColor: outcome.color }} />

      <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* 큰 roll 숫자 */}
        <div style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          lineHeight: 1,
          color: outcome.color,
          minWidth: '4.5rem',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {d.roll}
        </div>

        {/* 세로 구분선 */}
        <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--bg-border)', flexShrink: 0 }} />

        {/* 상세 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
            {msg.charName} · {d.skill} · {diff} 난이도 · 목표 {d.target}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: outcome.color }}>
            {outcome.label}
          </div>
          {d.resultText && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-primary)',
              marginTop: '0.5rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--bg-border)',
              lineHeight: 1.5,
            }}>
              {d.resultText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SystemMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div style={{
      borderRadius: '0.75rem', padding: '0.75rem 1rem',
      fontSize: '0.875rem', fontStyle: 'italic',
      backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)',
      color: 'var(--text-muted)',
    }}>
      {msg.text}
    </div>
  )
}

export default function ChatFeed() {
  const chatMessages = useStore(s => s.chatMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {chatMessages.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.875rem' }}>GM 입력을 기다리는 중...</p>
            <p style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>아래 입력창에 장면을 입력하세요</p>
          </div>
        </div>
      )}
      {chatMessages.map(msg => (
        <div key={msg.id}>
          {msg.type === 'gm_scene' && <GmMessage msg={msg} />}
          {msg.type === 'ai_response' && <AiMessage msg={msg} />}
          {msg.type === 'npc_speech' && <NpcMessage msg={msg} />}
          {msg.type === 'dice_result' && <DiceMessage msg={msg} />}
          {msg.type === 'system' && <SystemMessage msg={msg} />}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
