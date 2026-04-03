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
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setScreen('home')} className="text-coc-muted hover:text-coc-text transition-colors">
          ← 뒤로
        </button>
        <h1 className="text-2xl font-bold text-coc-accent">세션 로그</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center text-coc-muted py-12">
          저장된 세션이 없습니다.
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Session list */}
          <div className="w-56 flex-shrink-0 space-y-2">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`w-full text-left bg-coc-panel border rounded-lg px-3 py-2 text-sm transition-all ${
                  selectedSession === s.id
                    ? 'border-coc-accent'
                    : 'border-coc-border hover:border-coc-muted'
                }`}
              >
                <div className="font-medium text-coc-text truncate">{s.name}</div>
                <div className="text-coc-muted text-xs">턴 {s.turnCount}개</div>
                <div className="text-coc-muted text-xs">
                  {new Date(s.lastUpdatedAt).toLocaleDateString('ko-KR')}
                </div>
              </button>
            ))}
          </div>

          {/* Log content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-coc-muted text-center py-8">로딩 중...</div>
            ) : selectedSession && turns.length > 0 ? (
              <div className="space-y-6">
                {turnNums.map(turnNum => (
                  <div key={turnNum}>
                    <div className="text-coc-muted text-xs font-semibold uppercase tracking-wider mb-2">
                      턴 {turnNum}
                    </div>
                    {/* GM input (from first record) */}
                    {grouped[turnNum][0]?.gmInput && (
                      <div className="bg-coc-accent/10 border border-coc-accent/30 rounded-lg px-3 py-2 mb-2">
                        <span className="text-coc-accent text-xs font-semibold">GM </span>
                        <span className="text-sm text-coc-text">{grouped[turnNum][0].gmInput}</span>
                      </div>
                    )}
                    {/* Character responses */}
                    {grouped[turnNum].map((t, i) => (
                      <div key={i} className="bg-coc-panel border border-coc-border rounded-lg px-3 py-3 mb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{t.characterName}</span>
                          <span className="text-coc-muted text-xs">{t.modelName}</span>
                          <span className="text-coc-muted text-xs ml-auto">
                            HP {t.statsBefore.hp}→{t.statsAfter.hp} | SAN {t.statsBefore.san}→{t.statsAfter.san}
                          </span>
                        </div>
                        {t.response.action && (
                          <div className="text-sm mb-1">
                            <span className="text-coc-accent text-xs">[행동] </span>
                            <span className="text-coc-text">{t.response.action}</span>
                          </div>
                        )}
                        {t.response.attempt && (
                          <div className="text-sm mb-1">
                            <span className="text-yellow-400 text-xs">[시도] </span>
                            <span className="text-coc-text">{t.response.attempt}</span>
                          </div>
                        )}
                        {t.response.inner && (
                          <div className="text-sm border-t border-coc-border/50 mt-1 pt-1">
                            <span className="text-coc-san text-xs">[내면] </span>
                            <span className="text-coc-muted italic">{t.response.inner}</span>
                          </div>
                        )}
                      </div>
                    ))}
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
