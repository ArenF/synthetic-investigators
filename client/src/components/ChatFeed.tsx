import React, { useEffect, useRef } from 'react'
import { useStore, type ChatMessage } from '../store'

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
    <div className="flex flex-col gap-1">
      {msg.targetLabel && (
        <div className="text-coc-muted text-xs opacity-60">{msg.targetLabel}</div>
      )}
      <div className="bg-coc-accent/10 border border-coc-accent/30 rounded-lg px-4 py-3">
        <div className="text-xs text-coc-accent font-semibold mb-1">GM</div>
        <div className="text-coc-text whitespace-pre-wrap">{msg.text}</div>
      </div>
    </div>
  )
}

function AiMessage({ msg }: { msg: ChatMessage }) {
  if (!msg.done) {
    return (
      <div className="flex flex-col gap-1 pl-4">
        <div className="text-coc-muted text-xs font-medium">{msg.charName}</div>
        <div className="bg-coc-panel border border-coc-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="thinking-dot w-2 h-2 bg-coc-muted rounded-full inline-block" />
            <span className="thinking-dot w-2 h-2 bg-coc-muted rounded-full inline-block" />
            <span className="thinking-dot w-2 h-2 bg-coc-muted rounded-full inline-block" />
            <span className="text-coc-muted text-xs ml-2">응답 중...</span>
          </div>
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
    <div className="flex flex-col gap-1 pl-4">
      <div className="text-coc-muted text-xs font-medium">{msg.charName}</div>
      <div className="bg-coc-panel border border-coc-border rounded-lg px-4 py-3 space-y-2">
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
    <div className="flex flex-col gap-1 pl-4 border-l-2 border-purple-500/40">
      <div className="text-purple-400 text-xs font-medium">{msg.npcName} (NPC)</div>
      <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg px-4 py-3">
        <div className="text-coc-text whitespace-pre-wrap">"{msg.text}"</div>
      </div>
    </div>
  )
}

function DiceMessage({ msg }: { msg: ChatMessage }) {
  const d = msg.diceData
  if (!d) return null
  const outcome = outcomeLabel[d.outcome] ?? { label: d.outcome, color: 'text-coc-text' }
  const diff = difficultyLabel[d.difficulty] ?? d.difficulty

  return (
    <div className="flex justify-center">
      <div className="bg-coc-bg border border-coc-border rounded-lg px-4 py-2 text-sm inline-flex items-center gap-3">
        <span className="text-coc-muted">🎲</span>
        <span className="font-medium">{msg.charName}</span>
        <span className="text-coc-muted">—</span>
        <span>{d.skill}</span>
        <span className="text-coc-muted text-xs">({diff} / 목표: {d.target})</span>
        <span className="font-bold text-lg">{d.roll}</span>
        <span className={`font-semibold ${outcome.color}`}>{outcome.label}</span>
        {d.resultText && (
          <span className="text-coc-muted text-xs border-l border-coc-border pl-3">{d.resultText}</span>
        )}
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
            <div className="text-4xl mb-3">🎲</div>
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
