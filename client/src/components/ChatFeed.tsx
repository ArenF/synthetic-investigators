import React, { useEffect, useRef } from 'react'
import { useStore, type ChatMessage } from '../store'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const outcomeLabel: Record<string, { label: string; color: string }> = {
  extreme_success: { label: '극단적 성공', color: '#fbbf24' },
  hard_success: { label: '어려운 성공', color: '#4ade80' },
  regular_success: { label: '성공', color: '#4ade80' },
  failure: { label: '실패', color: '#f87171' },
  fumble: { label: '대실패', color: '#f87171' },
}

const difficultyLabel: Record<string, string> = {
  regular: '보통',
  hard: '어려움',
  extreme: '극한',
}

function GmMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="rounded-r-lg px-4 py-3" style={{ backgroundColor: 'var(--bg-panel)', borderLeft: '2px solid var(--teal)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--teal)' }}>GM</span>
        {msg.targetLabel && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {msg.targetLabel}</span>}
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
    </div>
  )
}

function AiMessage({ msg }: { msg: ChatMessage }) {
  if (!msg.done) {
    return (
      <div className="rounded-lg px-4 py-3 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{msg.charName}</span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full thinking-dot" style={{ backgroundColor: 'var(--text-muted)' }}></span>
          <span className="w-1.5 h-1.5 rounded-full thinking-dot" style={{ backgroundColor: 'var(--text-muted)' }}></span>
          <span className="w-1.5 h-1.5 rounded-full thinking-dot" style={{ backgroundColor: 'var(--text-muted)' }}></span>
        </div>
      </div>
    )
  }

  // Parse response sections
  const raw = msg.text
  const actionMatch = raw.match(/\*\*\[행동\]\*\*\s*([\s\S]*?)(?=\*\*\[시도\]\*\*|\*\*\[내면\]\*\*|$)/i)
  const attemptMatch = raw.match(/\*\*\[시도\]\*\*\s*([\s\S]*?)(?=\*\*\[내면\]\*\*|\*\*\[행동\]\*\*|$)/i)
  const innerMatch = raw.match(/\*\*\[내면\]\*\*\s*([\s\S]*?)(?=\*\*\[행동\]\*\*|\*\*\[시도\]\*\*|$)/i)

  const action = actionMatch?.[1]?.trim()
  const attempt = attemptMatch?.[1]?.trim()
  const inner = innerMatch?.[1]?.trim()
  const hasStructure = action || attempt || inner

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)' }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--teal)' }}></span>
        <span className="text-sm font-medium" style={{ color: 'var(--teal)' }}>{msg.charName}</span>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-primary)' }}>
        {hasStructure ? (
          <>
            {action && (
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--teal)' }}>[행동] </span>
                <span className="whitespace-pre-wrap">{action}</span>
              </div>
            )}
            {attempt && (
              <div>
                <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>[시도] </span>
                <span className="whitespace-pre-wrap">{attempt}</span>
              </div>
            )}
            {inner && (
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
                <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>[내면] </span>
                <span className="italic whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{inner}</span>
              </div>
            )}
          </>
        ) : (
          <div className="whitespace-pre-wrap">{raw}</div>
        )}
      </div>
    </div>
  )
}

function NpcMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="rounded-r-lg px-4 py-3" style={{ borderLeft: '2px solid rgba(167,139,250,0.5)', backgroundColor: 'rgba(88,28,135,0.15)' }}>
      <div className="text-xs font-semibold mb-1" style={{ color: '#a78bfa' }}>{msg.npcName} · NPC</div>
      <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-primary)' }}>"{msg.text}"</p>
    </div>
  )
}

function DiceMessage({ msg }: { msg: ChatMessage }) {
  const d = msg.diceData
  if (!d) return null
  const outcome = outcomeLabel[d.outcome] ?? { label: d.outcome, color: 'var(--text-primary)' }
  const diff = difficultyLabel[d.difficulty] ?? d.difficulty

  return (
    <div className="flex justify-center py-2">
      <div className="rounded-xl px-5 py-3 text-center" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{msg.charName} · {d.skill} ({diff} / 목표: {d.target})</div>
        <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{d.roll}</div>
        <div className="text-xs font-semibold" style={{ color: outcome.color }}>{outcome.label}</div>
        {d.resultText && <div className="text-xs mt-2 pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--bg-border)' }}>{d.resultText}</div>}
      </div>
    </div>
  )
}

function SystemMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="rounded-lg px-4 py-3 text-sm italic" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {chatMessages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center" style={{ color: 'var(--text-muted)' }}>
            <div className="text-4xl mb-3 opacity-40">🎲</div>
            <p>GM 입력을 기다리는 중...</p>
            <p className="text-xs mt-1 opacity-60">아래 입력창에 장면을 입력하세요</p>
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
