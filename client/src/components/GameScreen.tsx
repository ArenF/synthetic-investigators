import React from 'react'
import { useStore } from '../store'
import ChatFeed from './ChatFeed'
import GmInput from './GmInput'
import CharacterStatus from './CharacterStatus'

export default function GameScreen() {
  const { sessionName, wsReady, setScreen } = useStore()

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="h-12 flex items-center px-4 bg-coc-panel border-b border-coc-border text-sm">
        <button
          onClick={() => setScreen('home')}
          className="text-coc-muted hover:text-coc-text text-sm transition-colors"
        >
          ← 홈
        </button>
        <span className="text-coc-accent font-bold ml-3">{sessionName ?? '세션'}</span>
        <div className="flex-1" />
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
          wsReady
            ? 'bg-green-900/30 text-green-400'
            : 'bg-yellow-900/30 text-yellow-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${wsReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
          {wsReady ? '연결됨' : '연결 중...'}
        </span>
        <button
          onClick={() => setScreen('log_viewer')}
          className="text-coc-muted hover:text-coc-text text-sm transition-colors ml-4"
        >
          📋 로그
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
        <aside className="w-72 shrink-0 border-l border-coc-border overflow-y-auto bg-coc-panel/50">
          <CharacterStatus />
        </aside>
      </div>
    </div>
  )
}
