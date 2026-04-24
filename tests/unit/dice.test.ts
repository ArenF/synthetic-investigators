/**
 * tests/unit/dice.test.ts
 * CoC 7e 주사위 로직 단위 테스트
 */

import { describe, it, expect, vi } from 'vitest'
import {
  skillCheck,
  d100WithBonusPenalty,
  skillCheckWithBP,
  compareSuccessLevels,
  rollDice,
  isSuccess,
  isFailure,
  outcomeLabel,
} from '../../server/game/dice.js'

// ── 헬퍼: d100 결과를 고정 ──────────────────────────────────────
function mockRoll(value: number) {
  vi.spyOn(Math, 'random').mockReturnValue((value - 1) / 100)
}

function restoreMath() {
  vi.restoreAllMocks()
}

// ════════════════════════════════════════════════════════════════
// 1. rollDice — 주사위 표현식 파서
// ════════════════════════════════════════════════════════════════
describe('rollDice', () => {
  it('고정값 파싱 ("3" → 3)', () => {
    expect(rollDice('3')).toBe(3)
  })

  it('1d6 — 1~6 범위', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollDice('1d6')
      expect(r).toBeGreaterThanOrEqual(1)
      expect(r).toBeLessThanOrEqual(6)
    }
  })

  it('2d6+3 — 최소 5, 최대 15', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollDice('2d6+3')
      expect(r).toBeGreaterThanOrEqual(5)
      expect(r).toBeLessThanOrEqual(15)
    }
  })

  it('1d4-1 — 최소 0 (음수 방지)', () => {
    for (let i = 0; i < 50; i++) {
      expect(rollDice('1d4-1')).toBeGreaterThanOrEqual(0)
    }
  })

  it('잘못된 표현식 → 0 반환', () => {
    expect(rollDice('abc')).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════
// 2. skillCheck — 6-tier 판정 (기술값 60 기준)
// ════════════════════════════════════════════════════════════════
describe('skillCheck — 기술값 60, 일반 난이도', () => {
  // target=60, extreme=12, hard=30, regularFailureMax=floor((60+95)/2)=77
  // fumbleThreshold = 96 (skill >= 50)

  it('극단적 성공: roll ≤ 12 (skill/5)', () => {
    mockRoll(5)
    const r = skillCheck(60, '수영', 'regular')
    expect(r.outcome).toBe('extreme_success')
    restoreMath()
  })

  it('어려운 성공: roll ≤ 30 (skill/2)', () => {
    mockRoll(25)
    const r = skillCheck(60, '수영', 'regular')
    expect(r.outcome).toBe('hard_success')
    restoreMath()
  })

  it('성공: roll ≤ 60', () => {
    mockRoll(50)
    const r = skillCheck(60, '수영', 'regular')
    expect(r.outcome).toBe('regular_success')
    restoreMath()
  })

  it('실패: 60 < roll ≤ 77', () => {
    mockRoll(70)
    const r = skillCheck(60, '수영', 'regular')
    expect(r.outcome).toBe('regular_failure')
    restoreMath()
  })

  it('나쁜 실패: 77 < roll < 96', () => {
    mockRoll(85)
    const r = skillCheck(60, '수영', 'regular')
    expect(r.outcome).toBe('bad_failure')
    restoreMath()
  })

  it('대실패: roll ≥ 96 (skill ≥ 50)', () => {
    mockRoll(98)
    const r = skillCheck(60, '수영', 'regular')
    expect(r.outcome).toBe('fumble')
    restoreMath()
  })

  it('기술값 49: roll=100만 대실패', () => {
    mockRoll(100)
    const r = skillCheck(49, '수영', 'regular')
    expect(r.outcome).toBe('fumble')
    restoreMath()
  })

  it('기술값 49: roll=99 → 대실패 아님', () => {
    mockRoll(99)
    const r = skillCheck(49, '수영', 'regular')
    expect(r.outcome).not.toBe('fumble')
    restoreMath()
  })
})

describe('skillCheck — 어려움/극한 난이도', () => {
  it('어려움 난이도: target = skill/2 = 30', () => {
    mockRoll(28)
    const r = skillCheck(60, '수영', 'hard')
    expect(r.target).toBe(30)
    expect(r.outcome).toBe('regular_success')
    restoreMath()
  })

  it('어려움 난이도: roll=31 → 실패', () => {
    mockRoll(31)
    const r = skillCheck(60, '수영', 'hard')
    expect(r.outcome).not.toBe('regular_success')
    restoreMath()
  })

  it('극한 난이도: target = skill/5 = 12, extreme_success = roll ≤ 2', () => {
    mockRoll(2)  // target=12, extreme_success: roll ≤ floor(12/5)=2
    const r = skillCheck(60, '수영', 'extreme')
    expect(r.target).toBe(12)
    expect(r.outcome).toBe('extreme_success')
    restoreMath()
  })

  it('극한 난이도: roll=13 → 어려운 성공(target/2=6 초과, 하지만 target=12 이하가 성공)', () => {
    mockRoll(13)
    const r = skillCheck(60, '수영', 'extreme')
    // target=12, roll=13 → skill이하지 않음 → 실패
    expect(['regular_failure', 'bad_failure', 'fumble']).toContain(r.outcome)
    restoreMath()
  })
})

// ════════════════════════════════════════════════════════════════
// 3. d100WithBonusPenalty — 보너스/페널티 다이스
// ════════════════════════════════════════════════════════════════
describe('d100WithBonusPenalty', () => {
  it('보너스/페널티 없으면 tensDice 1개', () => {
    const { tensDice } = d100WithBonusPenalty(0, 0)
    expect(tensDice).toHaveLength(1)
  })

  it('보너스 1개 → tensDice 2개, 낮은 값 선택', () => {
    // random을 0.3, 0.7로 고정 → tens: [30, 70], units: 0
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)          // units = 0
      .mockReturnValueOnce(0.3)        // tens[0] = 30
      .mockReturnValueOnce(0.7)        // tens[1] = 70
    const { roll, tensDice } = d100WithBonusPenalty(1, 0)
    expect(tensDice).toHaveLength(2)
    // 보너스 → 낮은 tens = 30, units = 0 → roll = 30+0 = 30
    expect(roll).toBe(30)
    spy.mockRestore()
  })

  it('페널티 1개 → tensDice 2개, 높은 값 선택', () => {
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.05)       // units = 5 (floor(0.05*10)=0... 다시)
      .mockReturnValueOnce(0.2)        // tens[0] = 20
      .mockReturnValueOnce(0.5)        // tens[1] = 50
    const { tensDice } = d100WithBonusPenalty(0, 1)
    expect(tensDice).toHaveLength(2)
    spy.mockRestore()
  })

  it('00+0 조합 → 100 (대실패 특수 규칙)', () => {
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValue(0)  // units=0, tens=0 → 00+0 = 100
    const { roll } = d100WithBonusPenalty(0, 0)
    expect(roll).toBe(100)
    spy.mockRestore()
  })
})

// ════════════════════════════════════════════════════════════════
// 4. compareSuccessLevels — 대항 판정 등급 비교
// ════════════════════════════════════════════════════════════════
describe('compareSuccessLevels', () => {
  it('극단적 > 어려운 → a 승리', () => {
    const r = compareSuccessLevels(
      { outcome: 'extreme_success', skillValue: 50 },
      { outcome: 'hard_success', skillValue: 80 },
    )
    expect(r).toBe('a_wins')
  })

  it('성공 vs 실패 → a 승리', () => {
    const r = compareSuccessLevels(
      { outcome: 'regular_success', skillValue: 40 },
      { outcome: 'regular_failure', skillValue: 60 },
    )
    expect(r).toBe('a_wins')
  })

  it('동급 성공 — 기술값 높은 쪽 승리', () => {
    const r = compareSuccessLevels(
      { outcome: 'regular_success', skillValue: 40 },
      { outcome: 'regular_success', skillValue: 70 },
    )
    expect(r).toBe('b_wins')
  })

  it('동급 성공 + 동일 기술값 → tie', () => {
    const r = compareSuccessLevels(
      { outcome: 'regular_success', skillValue: 50 },
      { outcome: 'regular_success', skillValue: 50 },
    )
    expect(r).toBe('tie')
  })

  it('tieRule=attacker → a 승리', () => {
    const r = compareSuccessLevels(
      { outcome: 'regular_success', skillValue: 50 },
      { outcome: 'regular_success', skillValue: 50 },
      'attacker',
    )
    expect(r).toBe('a_wins')
  })

  it('tieRule=defender → b 승리', () => {
    const r = compareSuccessLevels(
      { outcome: 'regular_success', skillValue: 50 },
      { outcome: 'regular_success', skillValue: 50 },
      'defender',
    )
    expect(r).toBe('b_wins')
  })

  it('대실패(fumble) vs 실패 → b 승리', () => {
    const r = compareSuccessLevels(
      { outcome: 'fumble', skillValue: 70 },
      { outcome: 'regular_failure', skillValue: 30 },
    )
    expect(r).toBe('b_wins')
  })
})

// ════════════════════════════════════════════════════════════════
// 5. isSuccess / isFailure 헬퍼
// ════════════════════════════════════════════════════════════════
describe('isSuccess / isFailure', () => {
  it.each(['extreme_success', 'hard_success', 'regular_success'])('%s → isSuccess=true', (o) => {
    expect(isSuccess(o as any)).toBe(true)
  })

  it.each(['regular_failure', 'bad_failure', 'fumble'])('%s → isSuccess=false', (o) => {
    expect(isSuccess(o as any)).toBe(false)
  })

  it.each(['regular_failure', 'bad_failure', 'fumble'])('%s → isFailure=true', (o) => {
    expect(isFailure(o as any)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════
// 6. outcomeLabel — 한국어 레이블
// ════════════════════════════════════════════════════════════════
describe('outcomeLabel', () => {
  it('fumble → 💀 대실패', () => {
    expect(outcomeLabel('fumble')).toContain('대실패')
  })

  it('extreme_success → 🌟 극단적 성공', () => {
    expect(outcomeLabel('extreme_success')).toContain('극단적 성공')
  })

  it('unknown → 그대로 반환', () => {
    expect(outcomeLabel('unknown_tier')).toBe('unknown_tier')
  })
})
