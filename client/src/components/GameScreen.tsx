import React from 'react'
import { useStore } from '../store'
import ChatFeed from './ChatFeed'
import GmInput from './GmInput'
import CharacterStatus from './CharacterStatus'
import JudgmentResultOverlay from './JudgmentResultOverlay'

export default function GameScreen() {
  const { sessionName, wsReady, setScreen, pendingJudgment } = useStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <header style={{
        height: '52px', display: 'flex', alignItems: 'center', padding: '0 1.25rem',
        backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--bg-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
        flexShrink: 0, gap: '0.75rem', zIndex: 10, position: 'relative'
      }}>
        <button
          onClick={() => setScreen('home')}
          style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← 홈
        </button>
        <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{sessionName ?? '세션'}</span>
        <div style={{ flex: 1 }} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem',
          padding: '4px 10px', borderRadius: '999px',
          backgroundColor: wsReady ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
          color: wsReady ? '#4ade80' : '#fbbf24',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: wsReady ? '#4ade80' : '#fbbf24' }} />
          {wsReady ? '연결됨' : '연결 중...'}
        </span>
        <button
          onClick={() => setScreen('log_viewer')}
          style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '1rem' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          로그
        </button>
      </header>

      {/* Main layout: sidebar LEFT, chat RIGHT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — left */}
        <aside style={{
          width: '210px', flexShrink: 0, overflowY: 'auto',
          borderRight: '1px solid var(--bg-border)',
          backgroundColor: 'var(--bg-panel)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.25)',
        }}>
          <CharacterStatus />
        </aside>

        {/* Chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, position: 'relative' }}>
          <ChatFeed />
          <GmInput />
          {pendingJudgment && <JudgmentResultOverlay />}
        </div>
      </div>
    </div>
  )
}
