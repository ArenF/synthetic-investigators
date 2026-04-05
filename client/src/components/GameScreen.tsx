import React from 'react'
import { useStore } from '../store'
import ChatFeed from './ChatFeed'
import GmInput from './GmInput'
import CharacterStatus from './CharacterStatus'

export default function GameScreen() {
  const { sessionName, wsReady, setScreen } = useStore()

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
        <span className="font-bold ml-3" style={{ color: 'var(--teal)' }}>{sessionName ?? '세션'}</span>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: wsReady ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
            color: wsReady ? '#4ade80' : '#fbbf24',
          }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wsReady ? '#4ade80' : '#fbbf24' }} />
          {wsReady ? '연결됨' : '연결 중...'}
        </span>
        <button
          onClick={() => setScreen('log_viewer')}
          className="text-sm transition-colors ml-4"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          로그
        </button>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-col flex-1 min-w-0">
          <ChatFeed />
          <GmInput />
        </div>

        {/* Sidebar */}
        <aside className="w-72 shrink-0 overflow-y-auto" style={{ borderLeft: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-panel)' }}>
          <CharacterStatus />
        </aside>
      </div>
    </div>
  )
}
