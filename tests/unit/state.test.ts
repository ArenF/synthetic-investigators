/**
 * tests/unit/state.test.ts
 * GameState 단위 테스트 — SAN 광기 threshold, HP/SAN/Luck 관리
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../server/game/state.js'
import type { CoCCharacter } from '../../server/characters/types.js'

// 최소한의 테스트용 캐릭터 픽스처 (starting SAN = 60)
function makeChar(overrides: Partial<CoCCharacter> = {}): CoCCharacter {
  return {
    id: 'test',
    name: '테스트',
    age: 30,
    gender: '남성',
    occupation: '탐사자',
    residence: '서울',
    birthplace: '부산',
    characteristics: {
      STR: 50, CON: 50, SIZ: 50,
      DEX: 50, APP: 50, INT: 60,
      POW: 60, EDU: 70,
    },
    derived: {
      hp: { max: 10, current: 10 },
      mp: { max: 12, current: 12 },
      san: { max: 60, current: 60, starting: 60 },
      luck: 55,
      build: 0,
      moveRate: 8,
      damageBonus: '0',
    },
    skills: { 도서관이용: 25, 심리학: 10, 스팟히든: 25, 청취: 20, 언변: 15 },
    backstory: {
      personalDescription: '', ideology: '',
      significantPeople: '', meaningfulLocations: '',
      treasuredPossessions: '', traits: '',
      injuriesAndScars: '', phobiasAndManias: '',
      arcaneTomesAndSpells: '', encountersWithStrangeEntities: '',
    },
    equipment: {
      items: [],
      weapons: [],
      cash: { spendingLevel: '보통', cash: 0, assets: '' },
    },
    modelConfig: { provider: 'claude', model: 'claude-sonnet-4-5', temperature: 0.7 },
    ...overrides,
  }
}

// ════════════════════════════════════════════════════════════════
// SAN 광기 판정
// ════════════════════════════════════════════════════════════════
describe('GameState — SAN 광기 판정', () => {
  let state: GameState

  beforeEach(() => {
    state = new GameState()
    state.addCharacter(makeChar())
  })

  it('SAN 4 손실 → 일시적 광기 없음 (threshold 5)', () => {
    state.applySanLoss('test', 4)
    expect(state.getState('test').temporaryInsanity).toBe(false)
  })

  it('SAN 5 손실 → san = 55 (일시적 광기는 judgment 시스템이 별도 처리)', () => {
    // 주의: temporaryInsanity는 applySanLoss에서 자동 설정 안 됨
    // judgment 시스템(판정 결과)에서 effect로 설정됨
    state.applySanLoss('test', 5)
    expect(state.getState('test').san).toBe(55)
    expect(state.getState('test').indefiniteInsanity).toBe(false)
  })

  it('무기한 광기 threshold = 시작 SAN / 5 = 12 (누적 11 → 미발동)', () => {
    state.applySanLoss('test', 5)   // 누적 5
    state.applySanLoss('test', 6)   // 누적 11
    expect(state.getState('test').indefiniteInsanity).toBe(false)
  })

  it('무기한 광기 threshold 초과 시 발동 (누적 13 → ≥ 12)', () => {
    state.applySanLoss('test', 5)   // 누적 5
    state.applySanLoss('test', 8)   // 누적 13
    expect(state.getState('test').indefiniteInsanity).toBe(true)
  })

  it('SAN 0 도달 → 무기한 광기 즉시 발동', () => {
    state.applySanLoss('test', 60)
    expect(state.getState('test').indefiniteInsanity).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════
// HP 관리
// ════════════════════════════════════════════════════════════════
describe('GameState — HP 관리', () => {
  let state: GameState

  beforeEach(() => {
    state = new GameState()
    state.addCharacter(makeChar())
  })

  it('HP 피해 3 적용 → hp = 7', () => {
    state.applyDamage('test', 3)
    expect(state.getState('test').hp).toBe(7)
  })

  it('HP 회복 — max(10) 초과 안 됨', () => {
    state.applyDamage('test', 5)   // hp = 5
    state.restoreHp('test', 100)
    expect(state.getState('test').hp).toBe(10)
  })

  it('HP 0 이하 클램핑', () => {
    state.applyDamage('test', 999)
    expect(state.getState('test').hp).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════
// 행운 관리
// ════════════════════════════════════════════════════════════════
describe('GameState — 행운 관리', () => {
  let state: GameState

  beforeEach(() => {
    state = new GameState()
    state.addCharacter(makeChar()) // luck = 55
  })

  it('행운 10 소비 → luck = 45', () => {
    state.spendLuck('test', 10)
    expect(state.getState('test').luck).toBe(45)
  })

  it('행운 회복 — 초기 행운(55) 초과 안 됨', () => {
    state.spendLuck('test', 20)    // luck = 35
    state.restoreLuck('test', 100)
    expect(state.getState('test').luck).toBe(55)
  })
})

// ════════════════════════════════════════════════════════════════
// applyEffects — Effect 디스패치
// ════════════════════════════════════════════════════════════════
describe('GameState — applyEffects', () => {
  let state: GameState

  beforeEach(() => {
    state = new GameState()
    state.addCharacter(makeChar())
  })

  it('stat hp delta=-3 → hp = 7', () => {
    state.applyEffects('test', [{ kind: 'stat', stat: 'hp', delta: -3 }])
    expect(state.getState('test').hp).toBe(7)
  })

  it('stat san delta=-5 → san = 55', () => {
    state.applyEffects('test', [{ kind: 'stat', stat: 'san', delta: -5 }])
    expect(state.getState('test').san).toBe(55)
  })

  it('stat hp delta=+2 → HP 회복 (5→7)', () => {
    state.applyDamage('test', 5)
    state.applyEffects('test', [{ kind: 'stat', stat: 'hp', delta: 2 }])
    expect(state.getState('test').hp).toBe(7)
  })

  it('stat luck delta=-10 → luck = 45', () => {
    state.applyEffects('test', [{ kind: 'stat', stat: 'luck', delta: -10 }])
    expect(state.getState('test').luck).toBe(45)
  })
})
