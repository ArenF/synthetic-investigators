import React, { useState, useEffect } from 'react'
import { useStore, type NPC } from '../store'

const SECTION: React.CSSProperties = {
  backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)',
  borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem',
}

const SECTION_TITLE: React.CSSProperties = {
  borderLeft: '2px solid var(--teal)', paddingLeft: '0.75rem',
  fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.75rem',
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
}

export default function ScenarioEditor() {
  const { setScreen, editingScenarioId } = useStore()
  const isEdit = !!editingScenarioId

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [npcs, setNpcs] = useState<NPC[]>([])
  const [items, setItems] = useState<{ name: string; location: string; description: string }[]>([])
  const [openingBriefing, setOpeningBriefing] = useState('')

  // NPC input state
  const [npcName, setNpcName] = useState('')
  const [npcDesc, setNpcDesc] = useState('')
  const [npcTraits, setNpcTraits] = useState('')

  // Item input state
  const [itemName, setItemName] = useState('')
  const [itemLoc, setItemLoc] = useState('')
  const [itemDesc, setItemDesc] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing template if editing
  useEffect(() => {
    if (!editingScenarioId) return
    fetch(`/api/scenario-templates/${editingScenarioId}`)
      .then(r => { if (!r.ok) throw new Error('시나리오를 불러올 수 없습니다'); return r.json() })
      .then(data => {
        setTitle(data.title ?? '')
        setDescription(data.description ?? '')
        setNpcs(data.npcs ?? [])
        setItems(data.items ?? [])
        setOpeningBriefing(data.openingBriefing ?? '')
      })
      .catch((e: Error) => setError(e.message))
  }, [editingScenarioId])

  function addNpc() {
    if (!npcName.trim()) return
    setNpcs(prev => [...prev, {
      id: `npc-${Date.now()}`,
      name: npcName.trim(),
      description: npcDesc.trim(),
      traits: npcTraits.split(',').map(t => t.trim()).filter(Boolean),
    }])
    setNpcName(''); setNpcDesc(''); setNpcTraits('')
  }

  function addItem() {
    if (!itemName.trim()) return
    setItems(prev => [...prev, { name: itemName.trim(), location: itemLoc.trim(), description: itemDesc.trim() }])
    setItemName(''); setItemLoc(''); setItemDesc('')
  }

  async function save() {
    if (!title.trim()) { setError('시나리오 제목을 입력해주세요'); return }
    setSaving(true); setError(null)
    try {
      const body = { title: title.trim(), description, npcs, items, openingBriefing }
      const res = isEdit
        ? await fetch(`/api/scenario-templates/${editingScenarioId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/scenario-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? '저장 실패')
      }
      setScreen('scenario_list')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setScreen('scenario_list')}
          style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← 뒤로
        </button>
        <h1 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
          {isEdit ? '시나리오 편집' : '새 시나리오'}
        </h1>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
          {error}
        </div>
      )}

      {/* Title */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>제목</div>
        <input
          type="text" value={title}
          onChange={e => { setTitle(e.target.value); setError(null) }}
          placeholder="예: 안개 속의 저택"
          style={{ width: '100%', fontSize: '0.875rem', boxSizing: 'border-box' }}
        />
        <input
          type="text" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="한 줄 요약 (선택)"
          style={{ width: '100%', fontSize: '0.875rem', marginTop: '0.5rem', boxSizing: 'border-box' }}
        />
      </div>

      {/* NPCs */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>NPC 등록</div>
        {npcs.length > 0 && (
          <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {npcs.map(npc => (
              <div key={npc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--bg-elevated)' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{npc.name}</span>
                <span style={{ flex: 1, marginLeft: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{npc.description}</span>
                <button onClick={() => setNpcs(prev => prev.filter(n => n.id !== npc.id))} style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <input type="text" value={npcName} onChange={e => setNpcName(e.target.value)} placeholder="NPC 이름" style={{ fontSize: '0.875rem' }} />
          <input type="text" value={npcDesc} onChange={e => setNpcDesc(e.target.value)} placeholder="설명" style={{ fontSize: '0.875rem' }} />
          <input type="text" value={npcTraits} onChange={e => setNpcTraits(e.target.value)} placeholder="특성 (쉼표로 구분)" style={{ fontSize: '0.875rem' }} onKeyDown={e => e.key === 'Enter' && addNpc()} />
          <button onClick={addNpc} style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid rgba(20,184,166,0.4)', backgroundColor: 'rgba(20,184,166,0.1)', color: 'var(--teal)', cursor: 'pointer' }}>
            + NPC 추가
          </button>
        </div>
      </div>

      {/* Items */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>아이템 / 단서</div>
        {items.length > 0 && (
          <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((item, i) => (
              <div key={`${item.name}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--bg-elevated)' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: 'var(--text-muted)' }}>{item.location}</span>
                <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="아이템 이름" style={{ fontSize: '0.875rem' }} />
          <input type="text" value={itemLoc} onChange={e => setItemLoc(e.target.value)} placeholder="위치" style={{ fontSize: '0.875rem' }} />
          <input type="text" value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="설명" style={{ fontSize: '0.875rem' }} onKeyDown={e => e.key === 'Enter' && addItem()} />
          <button onClick={addItem} style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid rgba(20,184,166,0.4)', backgroundColor: 'rgba(20,184,166,0.1)', color: 'var(--teal)', cursor: 'pointer' }}>
            + 아이템 추가
          </button>
        </div>
      </div>

      {/* Opening Briefing */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>오프닝 브리핑</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          세션 시작 시 모든 AI 탐사자에게 전달할 배경 설명
        </p>
        <textarea
          value={openingBriefing}
          onChange={e => setOpeningBriefing(e.target.value)}
          rows={5}
          placeholder="때는 1925년 10월, 보스턴..."
          style={{ width: '100%', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving || !title.trim()}
        style={{
          width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700,
          borderRadius: '0.75rem', border: 'none', cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
          backgroundColor: 'var(--teal)', color: '#0a0e1a',
          opacity: saving || !title.trim() ? 0.5 : 1,
        }}
      >
        {saving ? '저장 중...' : isEdit ? '수정 저장' : '시나리오 저장'}
      </button>
    </div>
  )
}
