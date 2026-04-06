import React, { useEffect, useState } from 'react'
import { useStore, type ScenarioTemplate } from '../store'

export default function ScenarioList() {
  const { setScreen, setEditingScenarioId } = useStore()
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadTemplates() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scenario-templates')
      if (!res.ok) throw new Error('시나리오 목록을 불러올 수 없습니다')
      setTemplates(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTemplates() }, [])

  async function deleteTemplate(id: string) {
    try {
      await fetch(`/api/scenario-templates/${id}`, { method: 'DELETE' })
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch {
      setError('삭제 중 오류가 발생했습니다')
    }
  }

  function openNew() {
    setEditingScenarioId(null)
    setScreen('scenario_editor')
  }

  function openEdit(id: string) {
    setEditingScenarioId(id)
    setScreen('scenario_editor')
  }

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setScreen('home')}
          style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← 뒤로
        </button>
        <h1 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
          시나리오 관리
        </h1>
        <div style={{ flex: 1 }} />
        <button
          onClick={openNew}
          style={{
            fontSize: '0.8rem', padding: '0.4rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--teal)', color: '#0a0e1a', fontWeight: 600,
          }}
        >
          + 새 시나리오
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '3rem' }}>
          불러오는 중...
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>저장된 시나리오가 없습니다</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>위의 버튼으로 새 시나리오를 만들어보세요</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {templates.map(t => (
            <div
              key={t.id}
              style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {t.title}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {t.npcs.length > 0 && <span>NPC {t.npcs.length}명</span>}
                    {t.items.length > 0 && <span>아이템 {t.items.length}개</span>}
                    {t.openingBriefing && <span>브리핑 있음</span>}
                    <span style={{ marginLeft: 'auto' }}>{new Date(t.updatedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(t.id)}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: '0.4rem', border: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    편집
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: '0.4rem', border: '1px solid rgba(248,113,113,0.3)', backgroundColor: 'transparent', color: '#f87171', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
