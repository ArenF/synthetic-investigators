import React, { useEffect, useRef } from 'react'
import { useStore, type ChatMessage } from '../store'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const outcomeLabel: Record<string, { label: string; color: string }> = {
  extreme_success: { label: '극단적 성공', color: 'text-yellow-400' },
  hard_success: { label: '어려운 성공', color: 'text-green-400' },
  regular_success: { label: '성공', color: 'text-coc-hp' },
  failure: { label: '실패', color: 'text-red-400' },
  fumble: { label: '대실패', color: 'text-coc-danger' },
}

const difficultyLabel: Record<string, string> = {
  regular: '보통',
  hard: '어려움',
  extreme: '극한',
}

function GmMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="bg-coc-panel border-l-2 border-coc-accent rounded-r-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-coc-accent uppercase tracking-wide">GM</span>
        {msg.targetLabel && <span className="text-xs text-coc-muted">→ {msg.targetLabel}</span>}
      </div>
      <p className="text-coc-text text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
    </div>
  )
}

function AiMessage({ msg }: { msg: ChatMessage }) {
  if (!msg.done) {
    return (
      <div className="bg-coc-panel border border-coc-border rounded-lg px-4 py-3 flex items-center gap-3">
        <span className="text-coc-muted text-sm">{msg.charName}</span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-coc-muted thinking-dot"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-coc-muted thinking-dot"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-coc-muted thinking-dot"></span>
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
    <div className="bg-coc-panel border border-coc-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-coc-panel2 border-b border-coc-border">
        <span className="w-2 h-2 rounded-full bg-coc-accent"></span>
        <span className="text-sm font-medium text-coc-text">{msg.charName}</span>
        <span className="text-xs text-coc-muted ml-auto">{formatTime(msg.timestamp)}</span>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed text-coc-text space-y-2">
        {hasStructure ? (
          <>
            {action && (
              <div>
                <span className="text-coc-accent text-xs font-semibold">[행동] </span>
                <span className="text-coc-text whitespace-pre-wrap">{action}</span>
              </div>
            )}
            {attempt && (
              <div>
                <span className="text-yellow-400 text-xs font-semibold">[시도] </span>
                <span className="text-coc-text whitespace-pre-wrap">{attempt}</span>
              </div>
            )}
            {inner && (
              <div className="border-t border-coc-border/50 pt-2 mt-2">
                <span className="text-coc-san text-xs font-semibold">[내면] </span>
                <span className="text-coc-muted italic whitespace-pre-wrap">{inner}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-coc-text whitespace-pre-wrap">{raw}</div>
        )}
      </div>
    </div>
  )
}

function NpcMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="border-l-2 border-violet-400/50 bg-violet-950/20 rounded-r-lg px-4 py-3">
      <div className="text-xs text-violet-400 font-semibold mb-1">{msg.npcName} · NPC</div>
      <p className="text-coc-text text-sm leading-relaxed italic">"{msg.text}"</p>
    </div>
  )
}

function DiceMessage({ msg }: { msg: ChatMessage }) {
  const d = msg.diceData
  if (!d) return null
  const outcome = outcomeLabel[d.outcome] ?? { label: d.outcome, color: 'text-coc-text' }
  const diff = difficultyLabel[d.difficulty] ?? d.difficulty

  return (
    <div className="flex justify-center py-2">
      <div className="bg-coc-panel border border-coc-border rounded-xl px-5 py-3 text-center">
        <div className="text-xs text-coc-muted mb-1">{msg.charName} · {d.skill} ({diff} / 목표: {d.target})</div>
        <div className="text-3xl font-bold text-coc-text mb-1">{d.roll}</div>
        <div className={`text-xs font-semibold ${outcome.color}`}>{outcome.label}</div>
        {d.resultText && <div className="text-xs text-coc-muted mt-2 border-t border-coc-border pt-2">{d.resultText}</div>}
      </div>
    </div>
  )
}

function SystemMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="bg-coc-bg border border-coc-border/50 rounded-lg px-4 py-3 text-coc-muted text-sm italic">
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
          <div className="text-center text-coc-muted">
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
