import React, { useState, useEffect } from 'react'
import { useStore } from '../store'

interface SessionSummary {
  id: string
  name: string
  characters: string[]
  startedAt: string
  lastUpdatedAt: string
  turnCount: number
}

interface TurnRecord {
  turnNumber: number
  timestamp: string
  characterName: string
  modelName: string
  gmInput: string
  statsBefore: { hp: number; san: number; luck: number }
  statsAfter: { hp: number; san: number; luck: number }
  response: {
    action: string
    attempt?: string
    inner?: string
    rawText: string
  }
}

function statDelta(before: number, after: number): { text: string; color: string } | null {
  const diff = after - before
  if (diff === 0) return null
  return {
    text: diff > 0 ? `+${diff}` : `${diff}`,
    color: diff > 0 ? 'text-coc-hp' : 'text-coc-danger',
  }
}

export default function LogViewer() {
  const { setScreen } = useStore()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [turns, setTurns] = useState<TurnRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {})
  }, [])

  async function loadSession(id: string) {
    setLoading(true)
    setSelectedSession(id)
    try {
      const data = await fetch(`/api/sessions/${id}`).then(r => r.json())
      setTurns(data.turns ?? [])
    } catch {
      setTurns([])
    } finally {
      setLoading(false)
    }
  }

  // Group turns by turnNumber
  const grouped: Record<number, TurnRecord[]> = {}
  for (const t of turns) {
    grouped[t.turnNumber] = grouped[t.turnNumber] ?? []
    grouped[t.turnNumber].push(t)
  }
  const turnNums = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="h-12 flex items-center px-4 bg-coc-panel border-b border-coc-border text-sm shrink-0">
        <button onClick={() => setScreen('home')} className="text-coc-muted hover:text-coc-text transition-colors text-sm">
          ← 홈
        </button>
        <span className="text-sm font-semibold text-coc-muted uppercase tracking-wide ml-3">세션 로그</span>
      </header>

      {sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-coc-muted">
          저장된 세션이 없습니다.
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Session list sidebar */}
          <div className="w-60 shrink-0 border-r border-coc-border bg-coc-panel/50 overflow-y-auto">
            <div className="p-2 space-y-1">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-all ${
                    selectedSession === s.id
                      ? 'bg-coc-accent/10 border-r-2 border-coc-accent'
                      : 'hover:bg-coc-panel2'
                  }`}
                >
                  <div className="font-medium text-coc-text truncate">{s.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-coc-muted text-xs">턴 {s.turnCount}개</span>
                    <span className="text-coc-muted text-xs">
                      {new Date(s.lastUpdatedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Log content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-coc-muted text-center py-8">로딩 중...</div>
            ) : selectedSession && turns.length > 0 ? (
              <div className="space-y-6 max-w-3xl">
                {turnNums.map(turnNum => (
                  <div key={turnNum}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-semibold text-coc-accent">턴 {turnNum}</span>
                      <div className="flex-1 h-px bg-coc-border" />
                    </div>
                    {/* GM input (from first record) */}
                    {grouped[turnNum][0]?.gmInput && (
                      <div className="bg-coc-panel border-l-2 border-coc-accent rounded-r-lg px-4 py-3 mb-3">
                        <span className="text-coc-accent text-xs font-semibold uppercase tracking-wide">GM </span>
                        <span className="text-sm text-coc-text">{grouped[turnNum][0].gmInput}</span>
                      </div>
                    )}
                    {/* Character responses */}
                    {grouped[turnNum].map((t, i) => {
                      const hpDelta = statDelta(t.statsBefore.hp, t.statsAfter.hp)
                      const sanDelta = statDelta(t.statsBefore.san, t.statsAfter.san)
                      return (
                        <div key={i} className="bg-coc-panel border border-coc-border rounded-lg overflow-hidden mb-2">
                          <div className="flex items-center gap-2 px-4 py-2 bg-coc-panel2 border-b border-coc-border">
                            <span className="w-2 h-2 rounded-full bg-coc-accent"></span>
                            <span className="font-medium text-sm">{t.characterName}</span>
                            <span className="text-coc-muted text-xs">{t.modelName}</span>
                            <span className="text-coc-muted text-xs ml-auto">
                              HP {t.statsBefore.hp}→{t.statsAfter.hp}
                              {hpDelta && <span className={`ml-1 ${hpDelta.color}`}>({hpDelta.text})</span>}
                              {' | '}SAN {t.statsBefore.san}→{t.statsAfter.san}
                              {sanDelta && <span className={`ml-1 ${sanDelta.color}`}>({sanDelta.text})</span>}
                            </span>
                          </div>
                          <div className="px-4 py-3 text-sm leading-relaxed space-y-1">
                            {t.response.action && (
                              <div>
                                <span className="text-coc-accent text-xs font-semibold">[행동] </span>
                                <span className="text-coc-text">{t.response.action}</span>
                              </div>
                            )}
                            {t.response.attempt && (
                              <div>
                                <span className="text-yellow-400 text-xs font-semibold">[시도] </span>
                                <span className="text-coc-text">{t.response.attempt}</span>
                              </div>
                            )}
                            {t.response.inner && (
                              <div className="border-t border-coc-border/50 mt-2 pt-2">
                                <span className="text-coc-san text-xs font-semibold">[내면] </span>
                                <span className="text-coc-muted italic">{t.response.inner}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ) : selectedSession ? (
              <div className="text-coc-muted text-center py-8">기록 없음</div>
            ) : (
              <div className="text-coc-muted text-center py-8">세션을 선택하세요</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
