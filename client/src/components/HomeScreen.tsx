import React, { useEffect, useState } from 'react'
import { useStore } from '../store'

export default function HomeScreen() {
  const { setScreen } = useStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/characters')
      .then(r => {
        if (!r.ok) throw new Error('API 서버에 연결할 수 없습니다')
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--teal)' }}>CoC 7th Edition</div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Synthetic Investigators</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Multi-model AI TRPG Experiment Platform</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-8 w-full max-w-3xl rounded-lg px-4 py-3 text-sm text-center"
          style={{ backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%', maxWidth: '820px' }}>
        {/* Card 1: 새 세션 시작 */}
        <button
          onClick={() => setScreen('session_setup')}
          className="group p-6 rounded-xl text-left transition-all duration-200"
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#14b8a6')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
        >
          <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>새 세션 시작</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>캐릭터를 선택하고 새로운 실험 세션을 시작합니다</div>
        </button>

        {/* Card 2: 캐릭터 편집 */}
        <button
          onClick={() => setScreen('character_editor')}
          className="group p-6 rounded-xl text-left transition-all duration-200"
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#14b8a6')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
        >
          <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>캐릭터 편집</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CoC 7판 캐릭터 시트를 생성하거나 편집합니다</div>
        </button>

        {/* Card 3: 세션 로그 */}
        <button
          onClick={() => setScreen('log_viewer')}
          className="group p-6 rounded-xl text-left transition-all duration-200"
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#14b8a6')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
        >
          <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>세션 로그</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>과거 세션의 전체 기록을 열람합니다</div>
        </button>
      </div>
    </div>
  )
}
