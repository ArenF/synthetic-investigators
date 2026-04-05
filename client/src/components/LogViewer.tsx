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
    color: diff > 0 ? '#4ade80' : '#f87171',
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
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="h-12 flex items-center px-4 text-sm shrink-0" style={{ backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--bg-border)' }}>
        <button
          onClick={() => setScreen('home')}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← 홈
        </button>
        <span className="text-sm font-semibold uppercase tracking-wide ml-3" style={{ color: 'var(--text-muted)' }}>세션 로그</span>
      </header>

      {sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          저장된 세션이 없습니다.
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Session list sidebar */}
          <div className="w-60 shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-panel)' }}>
            <div className="p-2 space-y-1">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className="w-full text-left rounded-lg px-3 py-2 text-sm transition-all"
                  style={{
                    backgroundColor: selectedSession === s.id ? 'rgba(20,184,166,0.1)' : 'transparent',
                    borderRight: selectedSession === s.id ? '2px solid var(--teal)' : '2px solid transparent',
                  }}
                >
                  <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>턴 {s.turnCount}개</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>로딩 중...</div>
            ) : selectedSession && turns.length > 0 ? (
              <div className="space-y-6 max-w-3xl">
                {turnNums.map(turnNum => (
                  <div key={turnNum}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-semibold" style={{ color: 'var(--teal)' }}>턴 {turnNum}</span>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-border)' }} />
                    </div>
                    {/* GM input (from first record) */}
                    {grouped[turnNum][0]?.gmInput && (
                      <div className="rounded-r-lg px-4 py-3 mb-3" style={{ backgroundColor: 'var(--bg-panel)', borderLeft: '2px solid var(--teal)' }}>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--teal)' }}>GM </span>
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{grouped[turnNum][0].gmInput}</span>
                      </div>
                    )}
                    {/* Character responses */}
                    {grouped[turnNum].map((t, i) => {
                      const hpDelta = statDelta(t.statsBefore.hp, t.statsAfter.hp)
                      const sanDelta = statDelta(t.statsBefore.san, t.statsAfter.san)
                      return (
                        <div key={i} className="rounded-lg overflow-hidden mb-2" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
                          <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)' }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--teal)' }}></span>
                            <span className="font-medium text-sm" style={{ color: 'var(--teal)' }}>{t.characterName}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.modelName}</span>
                            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                              HP {t.statsBefore.hp}→{t.statsAfter.hp}
                              {hpDelta && <span style={{ color: hpDelta.color, marginLeft: '4px' }}>({hpDelta.text})</span>}
                              {' | '}SAN {t.statsBefore.san}→{t.statsAfter.san}
                              {sanDelta && <span style={{ color: sanDelta.color, marginLeft: '4px' }}>({sanDelta.text})</span>}
                            </span>
                          </div>
                          <div className="px-4 py-3 text-sm leading-relaxed space-y-1">
                            {t.response.action && (
                              <div>
                                <span className="text-xs font-semibold" style={{ color: 'var(--teal)' }}>[행동] </span>
                                <span style={{ color: 'var(--text-primary)' }}>{t.response.action}</span>
                              </div>
                            )}
                            {t.response.attempt && (
                              <div>
                                <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>[시도] </span>
                                <span style={{ color: 'var(--text-primary)' }}>{t.response.attempt}</span>
                              </div>
                            )}
                            {t.response.inner && (
                              <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
                                <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>[내면] </span>
                                <span className="italic" style={{ color: 'var(--text-muted)' }}>{t.response.inner}</span>
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
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>기록 없음</div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>세션을 선택하세요</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
