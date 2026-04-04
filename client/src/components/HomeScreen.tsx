import React, { useEffect, useState } from 'react'
import { useStore } from '../store'

export default function HomeScreen() {
  const { setScreen } = useStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Preload check — verify API is reachable
    fetch('/api/characters')
      .then(r => {
        if (!r.ok) throw new Error('API 서버에 연결할 수 없습니다')
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo / Title */}
      <div className="text-center mb-16">
        <div className="inline-block bg-coc-accent/10 border border-coc-accent/30 rounded-2xl px-6 py-2 mb-6">
          <span className="text-coc-accent text-xs font-semibold tracking-widest uppercase">CoC 7th Edition</span>
        </div>
        <h1 className="text-6xl font-bold text-coc-text mb-3 tracking-tight">
          Synthetic <span className="text-coc-accent">Investigators</span>
        </h1>
        <p className="text-coc-muted text-base">
          Multi-model AI TRPG Experiment Platform
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-8 w-full max-w-2xl bg-coc-danger/10 border border-coc-danger/40 rounded-lg px-4 py-3 text-coc-danger text-sm text-center">
          ⚠ {error}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
        {/* Card 1: 새 세션 시작 */}
        <button onClick={() => setScreen('session_setup')}
          className="group bg-coc-panel border border-coc-border hover:border-coc-accent/60 hover:bg-coc-panel2 rounded-xl p-6 text-left transition-all duration-200">
          <div className="w-10 h-10 rounded-lg bg-coc-accent/15 flex items-center justify-center mb-4 group-hover:bg-coc-accent/25 transition-colors">
            <span className="text-coc-accent text-xl">▶</span>
          </div>
          <h2 className="text-coc-text font-semibold text-base mb-1 group-hover:text-coc-accent transition-colors">새 세션 시작</h2>
          <p className="text-coc-muted text-sm leading-relaxed">캐릭터를 선택하고 새로운 실험 세션을 시작합니다</p>
        </button>

        {/* Card 2: 캐릭터 편집 */}
        <button onClick={() => setScreen('character_editor')}
          className="group bg-coc-panel border border-coc-border hover:border-coc-accent/60 hover:bg-coc-panel2 rounded-xl p-6 text-left transition-all duration-200">
          <div className="w-10 h-10 rounded-lg bg-coc-accent/15 flex items-center justify-center mb-4 group-hover:bg-coc-accent/25 transition-colors">
            <span className="text-coc-accent text-xl">✎</span>
          </div>
          <h2 className="text-coc-text font-semibold text-base mb-1 group-hover:text-coc-accent transition-colors">캐릭터 편집</h2>
          <p className="text-coc-muted text-sm leading-relaxed">CoC 7판 캐릭터 시트를 생성하거나 편집합니다</p>
        </button>

        {/* Card 3: 세션 로그 */}
        <button onClick={() => setScreen('log_viewer')}
          className="group bg-coc-panel border border-coc-border hover:border-coc-accent/60 hover:bg-coc-panel2 rounded-xl p-6 text-left transition-all duration-200">
          <div className="w-10 h-10 rounded-lg bg-coc-accent/15 flex items-center justify-center mb-4 group-hover:bg-coc-accent/25 transition-colors">
            <span className="text-coc-accent text-xl">≡</span>
          </div>
          <h2 className="text-coc-text font-semibold text-base mb-1 group-hover:text-coc-accent transition-colors">세션 로그</h2>
          <p className="text-coc-muted text-sm leading-relaxed">과거 세션의 전체 기록을 열람합니다</p>
        </button>
      </div>
    </div>
  )
}
