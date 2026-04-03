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
    if (!sessionName.trim() || selectedChars.length === 0) {
      setError('세션 이름과 최소 하나의 캐릭터를 선택해주세요.')
      return
    }
    setLoading(true)
    setError(null)
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
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setScreen('home')}
          className="text-coc-muted hover:text-coc-text transition-colors"
        >
          ← 뒤로
        </button>
        <h1 className="text-2xl font-bold text-coc-accent">새 세션 설정</h1>
      </div>

      {/* Session Name */}
      <section className="bg-coc-panel border border-coc-border rounded-lg p-5 mb-4">
        <h2 className="text-coc-accent font-semibold mb-3">세션 이름</h2>
        <input
          type="text"
          value={sessionName}
          onChange={e => setSessionName(e.target.value)}
          placeholder="예: 로드아일랜드의 공포"
          className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-coc-text focus:border-coc-accent outline-none"
        />
      </section>

      {/* Character Selection */}
      <section className="bg-coc-panel border border-coc-border rounded-lg p-5 mb-4">
        <h2 className="text-coc-accent font-semibold mb-3">캐릭터 선택</h2>
        {availableChars.length === 0 ? (
          <p className="text-coc-muted text-sm">
            캐릭터가 없습니다.{' '}
            <button
              onClick={() => setScreen('character_editor')}
              className="text-coc-accent underline"
            >
              캐릭터를 만들어주세요
            </button>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableChars.map(char => (
              <label
                key={char.id}
                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                  selectedChars.includes(char.id)
                    ? 'border-coc-accent bg-coc-accent/10'
                    : 'border-coc-border hover:border-coc-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedChars.includes(char.id)}
                  onChange={() => toggleChar(char.id)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-coc-text">{char.name}</div>
                  <div className="text-coc-muted text-xs">
                    {char.occupation} · {char.age}세 · {char.provider}/{char.model}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* NPCs */}
      <section className="bg-coc-panel border border-coc-border rounded-lg p-5 mb-4">
        <h2 className="text-coc-accent font-semibold mb-3">NPC 등록</h2>
        {npcs.length > 0 && (
          <div className="mb-3 space-y-2">
            {npcs.map(npc => (
              <div key={npc.id} className="flex items-center justify-between bg-coc-bg rounded px-3 py-2 text-sm">
                <span className="font-medium">{npc.name}</span>
                <span className="text-coc-muted truncate ml-2 flex-1">{npc.description}</span>
                <button
                  onClick={() => setNpcs(prev => prev.filter(n => n.id !== npc.id))}
                  className="text-coc-danger ml-2 text-xs"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            value={newNpcName}
            onChange={e => setNewNpcName(e.target.value)}
            placeholder="NPC 이름"
            className="bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
          <input
            type="text"
            value={newNpcDesc}
            onChange={e => setNewNpcDesc(e.target.value)}
            placeholder="설명"
            className="bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
          <input
            type="text"
            value={newNpcTraits}
            onChange={e => setNewNpcTraits(e.target.value)}
            placeholder="특성 (쉼표로 구분)"
            className="bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
          <button
            onClick={addNpc}
            className="bg-coc-accent/20 border border-coc-accent/40 hover:bg-coc-accent/30 text-coc-accent rounded px-3 py-2 text-sm transition-all"
          >
            + NPC 추가
          </button>
        </div>
      </section>

      {/* Items/Clues */}
      <section className="bg-coc-panel border border-coc-border rounded-lg p-5 mb-4">
        <h2 className="text-coc-accent font-semibold mb-3">아이템/단서 등록</h2>
        {items.length > 0 && (
          <div className="mb-3 space-y-2">
            {items.map((item, i) => (
              <div key={`${item.name}-${item.location}-${i}`} className="flex items-center justify-between bg-coc-bg rounded px-3 py-2 text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="text-coc-muted text-xs ml-2">{item.location}</span>
                <button
                  onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-coc-danger ml-2 text-xs"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            placeholder="아이템 이름"
            className="bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
          <input
            type="text"
            value={newItemLoc}
            onChange={e => setNewItemLoc(e.target.value)}
            placeholder="위치"
            className="bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
          <input
            type="text"
            value={newItemDesc}
            onChange={e => setNewItemDesc(e.target.value)}
            placeholder="설명"
            className="bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none"
          />
          <button
            onClick={addItem}
            className="bg-coc-accent/20 border border-coc-accent/40 hover:bg-coc-accent/30 text-coc-accent rounded px-3 py-2 text-sm transition-all"
          >
            + 아이템 추가
          </button>
        </div>
      </section>

      {/* Opening Briefing */}
      <section className="bg-coc-panel border border-coc-border rounded-lg p-5 mb-6">
        <h2 className="text-coc-accent font-semibold mb-3">오프닝 브리핑</h2>
        <p className="text-coc-muted text-xs mb-2">
          세션 시작 시 모든 AI 탐사자에게 전달할 배경 설명
        </p>
        <textarea
          value={openingBriefing}
          onChange={e => setOpeningBriefing(e.target.value)}
          rows={4}
          placeholder="때는 1925년 10월, 보스턴..."
          className="w-full bg-coc-bg border border-coc-border rounded px-3 py-2 text-sm focus:border-coc-accent outline-none resize-none"
        />
      </section>

      {error && (
        <div className="w-full mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={startSession}
        disabled={loading || !sessionName.trim() || selectedChars.length === 0}
        className="w-full bg-coc-accent text-coc-bg font-bold py-3 rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? '세션 생성 중...' : '세션 시작'}
      </button>
    </div>
  )
}
