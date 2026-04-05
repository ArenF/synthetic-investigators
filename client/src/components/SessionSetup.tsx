import React, { useState, useEffect } from 'react'
import { useStore, type NPC, type SessionSetupData, type CharacterSummary } from '../store'

export default function SessionSetup() {
  const { setScreen, setSession, setPendingSetup, setTurnOrder } = useStore()

  const [sessionName, setSessionName] = useState('')
  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [availableChars, setAvailableChars] = useState<CharacterSummary[]>([])
  const [npcs, setNpcs] = useState<NPC[]>([])
  const [newNpcName, setNewNpcName] = useState('')
  const [newNpcDesc, setNewNpcDesc] = useState('')
  const [newNpcTraits, setNewNpcTraits] = useState('')
  const [items, setItems] = useState<{ name: string; location: string; description: string }[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemLoc, setNewItemLoc] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [openingBriefing, setOpeningBriefing] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [charError, setCharError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/characters')
      .then(r => {
        if (!r.ok) throw new Error('캐릭터 목록을 불러올 수 없습니다')
        return r.json()
      })
      .then(setAvailableChars)
      .catch((err: Error) => setError(err.message))
  }, [])

  function toggleChar(id: string) {
    setSelectedChars(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
    setCharError(null)
  }

  function addNpc() {
    if (!newNpcName.trim()) return
    const npc: NPC = {
      id: `npc-${Date.now()}`,
      name: newNpcName.trim(),
      description: newNpcDesc.trim(),
      traits: newNpcTraits.split(',').map(t => t.trim()).filter(Boolean),
    }
    setNpcs(prev => [...prev, npc])
    setNewNpcName('')
    setNewNpcDesc('')
    setNewNpcTraits('')
  }

  function addItem() {
    if (!newItemName.trim()) return
    setItems(prev => [...prev, {
      name: newItemName.trim(),
      location: newItemLoc.trim(),
      description: newItemDesc.trim(),
    }])
    setNewItemName('')
    setNewItemLoc('')
    setNewItemDesc('')
  }

  async function startSession() {
    if (!sessionName.trim()) {
      setError('세션 이름을 입력해주세요.')
      return
    }
    if (selectedChars.length === 0) {
      setCharError('최소 하나의 캐릭터를 선택해주세요.')
      return
    }
    setLoading(true)
    setError(null)
    setCharError(null)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          characterIds: selectedChars,
          npcs,
          items,
          openingBriefing,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '세션 생성 실패')
        return
      }
      const setup: SessionSetupData = {
        sessionName: sessionName.trim(),
        characterIds: selectedChars,
        npcs,
        items,
        openingBriefing,
      }
      setPendingSetup(setup)
      setTurnOrder(selectedChars)
      setSession(data.sessionId, sessionName.trim())
      setScreen('game')
    } catch (err: any) {
      setError(err.message ?? '세션 시작 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setScreen('home')}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← 뒤로
        </button>
        <h1 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>새 세션 설정</h1>
      </div>

      {/* Session Name */}
      <section className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
        <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>세션 이름</h2>
        <input
          type="text"
          value={sessionName}
          onChange={e => { setSessionName(e.target.value); setError(null) }}
          placeholder="예: 로드아일랜드의 공포"
          className="w-full text-sm"
        />
        {error && !charError && (
          <div className="mt-2 text-xs" style={{ color: '#f87171' }}>{error}</div>
        )}
      </section>

      {/* Character Selection */}
      <section className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
        <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>캐릭터 선택</h2>
        {availableChars.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            캐릭터가 없습니다.{' '}
            <button
              onClick={() => setScreen('character_editor')}
              className="underline"
              style={{ color: 'var(--teal)' }}
            >
              캐릭터를 만들어주세요
            </button>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableChars.map(char => (
              <label
                key={char.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                style={{
                  border: selectedChars.includes(char.id) ? '1px solid var(--teal)' : '1px solid var(--bg-border)',
                  backgroundColor: selectedChars.includes(char.id) ? 'rgba(20,184,166,0.1)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedChars.includes(char.id)}
                  onChange={() => toggleChar(char.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{char.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{char.occupation} · {char.provider}/{char.model}</span>
                </div>
              </label>
            ))}
          </div>
        )}
        {charError && (
          <div className="mt-2 text-xs" style={{ color: '#f87171' }}>{charError}</div>
        )}
      </section>

      {/* NPCs */}
      <section className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
        <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>NPC 등록</h2>
        {npcs.length > 0 && (
          <div className="mb-3 space-y-2">
            {npcs.map(npc => (
              <div key={npc.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="font-medium">{npc.name}</span>
                <span className="truncate ml-2 flex-1" style={{ color: 'var(--text-muted)' }}>{npc.description}</span>
                <button
                  onClick={() => setNpcs(prev => prev.filter(n => n.id !== npc.id))}
                  className="ml-2 text-xs" style={{ color: '#f87171' }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2">
          <input type="text" value={newNpcName} onChange={e => setNewNpcName(e.target.value)} placeholder="NPC 이름" className="text-sm" />
          <input type="text" value={newNpcDesc} onChange={e => setNewNpcDesc(e.target.value)} placeholder="설명" className="text-sm" />
          <input type="text" value={newNpcTraits} onChange={e => setNewNpcTraits(e.target.value)} placeholder="특성 (쉼표로 구분)" className="text-sm" />
          <button
            onClick={addNpc}
            className="rounded-lg px-3 py-2 text-sm transition-all"
            style={{ backgroundColor: 'rgba(20,184,166,0.2)', border: '1px solid rgba(20,184,166,0.4)', color: 'var(--teal)' }}
          >
            + NPC 추가
          </button>
        </div>
      </section>

      {/* Items/Clues */}
      <section className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
        <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>아이템/단서 등록</h2>
        {items.length > 0 && (
          <div className="mb-3 space-y-2">
            {items.map((item, i) => (
              <div key={`${item.name}-${item.location}-${i}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="font-medium">{item.name}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{item.location}</span>
                <button
                  onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                  className="ml-2 text-xs" style={{ color: '#f87171' }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2">
          <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="아이템 이름" className="text-sm" />
          <input type="text" value={newItemLoc} onChange={e => setNewItemLoc(e.target.value)} placeholder="위치" className="text-sm" />
          <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder="설명" className="text-sm" />
          <button
            onClick={addItem}
            className="rounded-lg px-3 py-2 text-sm transition-all"
            style={{ backgroundColor: 'rgba(20,184,166,0.2)', border: '1px solid rgba(20,184,166,0.4)', color: 'var(--teal)' }}
          >
            + 아이템 추가
          </button>
        </div>
      </section>

      {/* Opening Briefing */}
      <section className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
        <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>오프닝 브리핑</h2>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          세션 시작 시 모든 AI 탐사자에게 전달할 배경 설명
        </p>
        <textarea
          value={openingBriefing}
          onChange={e => setOpeningBriefing(e.target.value)}
          rows={4}
          placeholder="때는 1925년 10월, 보스턴..."
          className="w-full text-sm resize-none"
        />
      </section>

      <button
        onClick={startSession}
        disabled={loading || !sessionName.trim() || selectedChars.length === 0}
        className="w-full font-semibold py-3 text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        style={{ backgroundColor: 'var(--teal)', color: '#0a0e1a' }}
      >
        {loading ? '세션 생성 중...' : '세션 시작'}
      </button>
    </div>
  )
}
