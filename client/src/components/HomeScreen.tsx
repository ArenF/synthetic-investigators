import React, { useEffect } from 'react'
import { useStore } from '../store'

export default function HomeScreen() {
  const { setScreen, savedSessions, setSavedSessions, setSession } = useStore()

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(setSavedSessions)
      .catch(() => {})
  }, [])

  function resumeSession(id: string, name: string) {
    setSession(id, name)
    setScreen('game')
  }

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

      {savedSessions.length > 0 && (
        <div className="w-full max-w-3xl">
          <h2 className="text-coc-muted text-sm font-semibold uppercase tracking-wider mb-3">
            저장된 세션
          </h2>
          <div className="space-y-2">
            {savedSessions.slice(0, 5).map(sess => (
              <button
                key={sess.id}
                onClick={() => resumeSession(sess.id, sess.name)}
                className="w-full bg-coc-panel border border-coc-border hover:border-coc-accent rounded-lg px-4 py-3 flex items-center justify-between transition-all"
              >
                <div className="text-left">
                  <span className="text-coc-text font-medium">{sess.name}</span>
                  <span className="text-coc-muted text-xs ml-3">
                    턴 {sess.turnCount}개 · {sess.characters?.join(', ')}
                  </span>
                </div>
                <span className="text-coc-muted text-xs">
                  {new Date(sess.lastUpdatedAt).toLocaleDateString('ko-KR')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
