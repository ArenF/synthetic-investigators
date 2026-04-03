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
      <header className="flex items-center justify-between px-4 py-2 bg-coc-panel border-b border-coc-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('home')}
            className="text-coc-muted hover:text-coc-text text-sm transition-colors"
          >
            ← 홈
          </button>
          <span className="text-coc-accent font-bold">{sessionName ?? '세션'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            wsReady
              ? 'bg-green-900/30 text-green-400'
              : 'bg-yellow-900/30 text-yellow-400'
          }`}>
            {wsReady ? '연결됨' : '연결 중...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScreen('log_viewer')}
            className="text-coc-muted hover:text-coc-text text-xs transition-colors"
          >
            📋 로그
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <ChatFeed />
          <GmInput />
        </div>

        {/* Sidebar */}
        <aside className="w-64 border-l border-coc-border overflow-y-auto flex-shrink-0">
          <CharacterStatus />
        </aside>
      </div>
    </div>
  )
}
