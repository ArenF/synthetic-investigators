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
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-coc-accent mb-2">
          Synthetic Investigators
        </h1>
        <p className="text-coc-muted text-lg">
          AI-Powered Call of Cthulhu TRPG Platform
        </p>
      </div>

      {error && (
        <div className="w-full max-w-3xl mb-6 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-12">
        <button
          onClick={() => setScreen('session_setup')}
          className="bg-coc-panel border border-coc-border hover:border-coc-accent rounded-lg p-6 text-left transition-all group"
        >
          <div className="text-3xl mb-3">🎲</div>
          <h2 className="text-coc-accent font-bold text-lg group-hover:text-yellow-300">
            새 세션 시작
          </h2>
          <p className="text-coc-muted text-sm mt-1">
            캐릭터를 선택하고 새로운 세션을 시작합니다
          </p>
        </button>

        <button
          onClick={() => setScreen('character_editor')}
          className="bg-coc-panel border border-coc-border hover:border-coc-accent rounded-lg p-6 text-left transition-all group"
        >
          <div className="text-3xl mb-3">📝</div>
          <h2 className="text-coc-accent font-bold text-lg group-hover:text-yellow-300">
            캐릭터 편집
          </h2>
          <p className="text-coc-muted text-sm mt-1">
            CoC 7판 캐릭터 시트를 생성하거나 편집합니다
          </p>
        </button>

        <button
          onClick={() => setScreen('log_viewer')}
          className="bg-coc-panel border border-coc-border hover:border-coc-accent rounded-lg p-6 text-left transition-all group"
        >
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-coc-accent font-bold text-lg group-hover:text-yellow-300">
            세션 로그
          </h2>
          <p className="text-coc-muted text-sm mt-1">
            과거 세션의 전체 기록을 열람합니다
          </p>
        </button>
      </div>
    </div>
  )
}
