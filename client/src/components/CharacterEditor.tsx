import React, { useState, useEffect } from 'react'
import { useStore } from '../store'

const COC_SKILLS = [
  '격투', '사격', '회피', '흔적발견', '청취', '도서관이용', '역사', '오컬트',
  '설득', '위협', '매혹', '심리학', '응급처치', '운전', '은신', '잠입',
  '의학', '생물학', '화학', '물리학', '법률', '회계', '예술', '사진술',
  '말돌리기', '수영', '등반', '점프', '자물쇠따기', '전기수리', '기계수리', '컴퓨터',
]

const MODEL_OPTIONS = [
  { provider: 'claude', model: 'claude-opus-4-5' },
  { provider: 'claude', model: 'claude-sonnet-4-5' },
  { provider: 'claude', model: 'claude-haiku-3-5' },
  { provider: 'gemini', model: 'gemini-2.0-flash' },
  { provider: 'gemini', model: 'gemini-1.5-pro' },
  { provider: 'openai', model: 'gpt-4o' },
  { provider: 'openai', model: 'gpt-4o-mini' },
  { provider: 'ollama', model: 'llama3.2' },
]

type TabKey = 'basic' | 'stats' | 'skills' | 'backstory' | 'ai'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본 정보' },
  { key: 'stats', label: '스탯' },
  { key: 'skills', label: '스킬' },
  { key: 'backstory', label: '배경' },
  { key: 'ai', label: 'AI 설정' },
]

function makeBlankCharacter(id: string) {
  return {
    id,
    name: '',
    age: 30,
    gender: '남성',
    occupation: '',
    birthplace: '서울',
    residence: '서울',
    characteristics: { STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 60, POW: 50, EDU: 60 },
    derived: {
      hp: { current: 10, max: 10 },
      mp: { current: 10, max: 10 },
      san: { current: 50, starting: 50, max: 99 },
      luck: 50,
      build: 0,
      moveRate: 8,
      damageBonus: '0',
    },
    skills: Object.fromEntries(COC_SKILLS.map(s => [s, 0])),
    backstory: {
      personalDescription: '',
      ideology: '',
      significantPeople: ['', ''],
      meaningfulLocations: [''],
      treasuredPossessions: [''],
      traits: [''],
      injuriesScars: '',
      phobiasManias: '',
      arcaneTomesSpells: '',
      encountersWithStrangeEntities: '',
    },
    equipment: {
      items: [],
      weapons: [],
      cash: 0,
      assets: '',
      spendingLevel: '보통',
    },
    modelConfig: { provider: 'claude', model: 'claude-sonnet-4-5', temperature: 0.75 },
  }
}

export default function CharacterEditor() {
  const { setScreen } = useStore()
  const [charId, setCharId] = useState('new-character')
  const [char, setChar] = useState<any>(makeBlankCharacter('new-character'))
  const [savedList, setSavedList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [customSkill, setCustomSkill] = useState('')
  const [customSkillVal, setCustomSkillVal] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>('basic')

  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then((list: any[]) => setSavedList(list.map(c => c.id)))
      .catch(() => {})
  }, [])

  function loadChar(id: string) {
    fetch(`/api/characters/${id}`)
      .then(r => r.json())
      .then(data => {
        setChar(data)
        setCharId(data.id)
      })
      .catch(() => alert('캐릭터 로드 실패'))
  }

  function setField(path: string, value: any) {
    setChar((prev: any) => {
      const next = { ...prev }
      const parts = path.split('.')
      let cur: any = next
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...cur[parts[i]] }
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = value
      return next
    })
  }

  function updateCharId(id: string) {
    setCharId(id)
    setChar((prev: any) => ({ ...prev, id }))
  }

  function addCustomSkill() {
    if (!customSkill.trim()) return
    setChar((prev: any) => ({
      ...prev,
      skills: { ...prev.skills, [customSkill.trim()]: customSkillVal },
    }))
    setCustomSkill('')
    setCustomSkillVal(0)
  }

  async function saveChar() {
    setSaving(true)
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...char, id: charId }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (!savedList.includes(charId)) setSavedList(prev => [...prev, charId])
    } catch {
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const c = char.characteristics
  const d = char.derived

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
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
        <h1 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>캐릭터 편집기</h1>
      </div>

      {/* Load existing */}
      {savedList.length > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>기존 캐릭터 불러오기</p>
          <div className="flex flex-wrap gap-2">
            {savedList.map(id => (
              <button
                key={id}
                onClick={() => loadChar(id)}
                className="rounded-lg px-3 py-1 text-sm transition-all"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--bg-border)', marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              color: activeTab === tab.key ? 'var(--teal)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--teal)' : '2px solid transparent',
              marginBottom: '-1px',
              background: 'none',
              border: 'none',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.key ? 'var(--teal)' : 'transparent',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {/* Basic Info */}
        {activeTab === 'basic' && (
          <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
            <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>기본 정보</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>캐릭터 ID (파일명)</label>
                <input value={charId} onChange={e => updateCharId(e.target.value)} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>이름</label>
                <input value={char.name} onChange={e => setField('name', e.target.value)} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>나이</label>
                <input type="number" value={char.age} onChange={e => setField('age', parseInt(e.target.value))} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>성별</label>
                <input value={char.gender} onChange={e => setField('gender', e.target.value)} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>직업</label>
                <input value={char.occupation} onChange={e => setField('occupation', e.target.value)} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>출신지</label>
                <input value={char.birthplace} onChange={e => setField('birthplace', e.target.value)} className="w-full text-sm" />
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        {activeTab === 'stats' && (
          <>
            <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
              <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>능력치</h2>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(c).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>{key}</label>
                    <input
                      type="number"
                      value={val as number}
                      onChange={e => setField(`characteristics.${key}`, parseInt(e.target.value) || 0)}
                      className="w-full text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
              <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>파생 능력치</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>HP (현재/최대)</label>
                  <div className="flex gap-1">
                    <input type="number" value={d.hp.current}
                      onChange={e => setField('derived.hp.current', parseInt(e.target.value) || 0)}
                      className="w-full text-sm" />
                    <input type="number" value={d.hp.max}
                      onChange={e => setField('derived.hp.max', parseInt(e.target.value) || 0)}
                      className="w-full text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>SAN (현재/시작/최대)</label>
                  <div className="flex gap-1">
                    <input type="number" value={d.san.current}
                      onChange={e => setField('derived.san.current', parseInt(e.target.value) || 0)}
                      className="w-full text-sm" />
                    <input type="number" value={d.san.starting}
                      onChange={e => setField('derived.san.starting', parseInt(e.target.value) || 0)}
                      className="w-full text-sm" />
                    <input type="number" value={d.san.max}
                      onChange={e => setField('derived.san.max', parseInt(e.target.value) || 0)}
                      className="w-full text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>행운</label>
                  <input type="number" value={d.luck}
                    onChange={e => setField('derived.luck', parseInt(e.target.value) || 0)}
                    className="w-full text-sm" />
                </div>
              </div>
            </section>
          </>
        )}

        {/* Skills */}
        {activeTab === 'skills' && (
          <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
            <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>기술</h2>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {Object.entries(char.skills).map(([skill, val]) => (
                <div key={skill} className="flex items-center gap-1">
                  <label className="text-xs flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{skill}</label>
                  <input
                    type="number"
                    value={val as number}
                    onChange={e => setField(`skills.${skill}`, parseInt(e.target.value) || 0)}
                    className="w-14 px-1 py-1 text-xs text-center"
                  />
                </div>
              ))}
            </div>
            {/* Add custom skill */}
            <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--bg-border)' }}>
              <input
                type="text"
                value={customSkill}
                onChange={e => setCustomSkill(e.target.value)}
                placeholder="기술 이름"
                className="flex-1 text-sm"
              />
              <input
                type="number"
                value={customSkillVal}
                onChange={e => setCustomSkillVal(parseInt(e.target.value) || 0)}
                className="w-16 text-sm text-center"
              />
              <button onClick={addCustomSkill}
                className="rounded-lg px-3 py-1 text-sm transition-all"
                style={{ backgroundColor: 'rgba(20,184,166,0.2)', border: '1px solid rgba(20,184,166,0.4)', color: 'var(--teal)' }}>
                + 추가
              </button>
            </div>
          </section>
        )}

        {/* Backstory */}
        {activeTab === 'backstory' && (
          <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
            <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>배경</h2>
            <div className="space-y-3">
              {[
                { key: 'backstory.personalDescription', label: '인물 묘사' },
                { key: 'backstory.ideology', label: '이념/신념' },
                { key: 'backstory.injuriesScars', label: '부상/흉터' },
                { key: 'backstory.phobiasManias', label: '공포증/집착증' },
                { key: 'backstory.arcaneTomesSpells', label: '비전 서적/주문' },
                { key: 'backstory.encountersWithStrangeEntities', label: '기이한 경험' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input
                    type="text"
                    value={(char.backstory as any)[key.split('.').slice(1).join('.')] ?? ''}
                    onChange={e => setField(key, e.target.value)}
                    className="w-full text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>성격적 특성 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={char.backstory.traits.join(', ')}
                  onChange={e => setField('backstory.traits', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  className="w-full text-sm"
                />
              </div>
            </div>
          </section>
        )}

        {/* Model Config */}
        {activeTab === 'ai' && (
          <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--bg-border)' }}>
            <h2 className="border-l-2 pl-3 font-semibold mb-3 text-sm uppercase tracking-wide" style={{ borderColor: 'var(--teal)', color: 'var(--text-muted)' }}>AI 모델 설정</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>모델</label>
                <select
                  value={`${char.modelConfig.provider}/${char.modelConfig.model}`}
                  onChange={e => {
                    const [provider, model] = e.target.value.split('/')
                    setField('modelConfig.provider', provider)
                    setField('modelConfig.model', model)
                  }}
                  className="w-full text-sm"
                >
                  {MODEL_OPTIONS.map(m => (
                    <option key={`${m.provider}/${m.model}`} value={`${m.provider}/${m.model}`}>
                      {m.provider} / {m.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Temperature</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={char.modelConfig.temperature ?? 0.75}
                  onChange={e => setField('modelConfig.temperature', parseFloat(e.target.value))}
                  className="w-full text-sm"
                />
              </div>
            </div>
          </section>
        )}
      </div>

      <button
        onClick={saveChar}
        disabled={saving}
        className="w-full mt-6 font-semibold py-3 rounded-xl disabled:opacity-50 transition-all"
        style={{ backgroundColor: 'var(--teal)', color: '#0a0e1a' }}
      >
        {saving ? '저장 중...' : saved ? '저장됨!' : '캐릭터 저장'}
      </button>
    </div>
  )
}
