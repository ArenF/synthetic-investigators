/**
 * Dice rolling utilities for CoC 7th Edition
 */

import type { DiceResult, Difficulty, BonusPenaltyDice } from '../characters/types.js'

/** Roll a d100 (1-100) */
export function d100(): number {
  return Math.floor(Math.random() * 100) + 1
}

/** Roll any die, e.g. d6, d8, d10 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

/** Parse and evaluate a dice expression like "1d6", "2d8+3", "1d4-1" */
export function rollDice(expression: string): number {
  const match = expression.match(/^(\d+)d(\d+)([+-]\d+)?$/)
  if (!match) {
    const fixed = parseInt(expression)
    if (isNaN(fixed)) {
      console.warn(`[rollDice] 잘못된 표현식: "${expression}" — 0 반환`)
      return 0
    }
    return fixed
  }
  const [, count, sides, modifier] = match
  let total = 0
  for (let i = 0; i < parseInt(count); i++) {
    total += rollDie(parseInt(sides))
  }
  if (modifier) total += parseInt(modifier)
  return Math.max(0, total)
}

/**
 * Perform a CoC 7e skill check (6-tier outcome).
 *
 * Tiers:
 *   extreme_success  — roll ≤ skill/5
 *   hard_success     — roll ≤ skill/2
 *   regular_success  — roll ≤ skill
 *   regular_failure  — roll > skill AND ≤ midpoint between skill and 95
 *   bad_failure      — roll > midpoint AND ≤ 95 (or < fumble threshold)
 *   fumble           — roll ≥ 96 (skill ≥ 50) or 100 (skill < 50)
 */
export function skillCheck(
  skillValue: number,
  skillName: string = '',
  difficulty: 'regular' | 'hard' | 'extreme' = 'regular',
): DiceResult & { roll: number; baseSkill: number } {
  const roll = d100()

  // Apply difficulty to target
  let target = skillValue
  if (difficulty === 'hard') target = Math.floor(skillValue / 2)
  if (difficulty === 'extreme') target = Math.floor(skillValue / 5)

  // Midpoint between baseSkill and 95 — boundary between regular_failure and bad_failure
  const regularFailureMax = Math.floor((skillValue + 95) / 2)

  // CoC 7e fumble rules: skill < 50 → fumble only on 100; skill ≥ 50 → fumble on 96-100
  const fumbleThreshold = skillValue < 50 ? 100 : 96

  let outcome: DiceResult['outcome']
  if (roll >= fumbleThreshold) {
    outcome = 'fumble'
  } else if (roll <= Math.floor(target / 5)) {
    outcome = 'extreme_success'
  } else if (roll <= Math.floor(target / 2)) {
    outcome = 'hard_success'
  } else if (roll <= target) {
    outcome = 'regular_success'
  } else if (roll <= regularFailureMax) {
    outcome = 'regular_failure'
  } else {
    outcome = 'bad_failure'
  }

  return { skill: skillName, target, roll, baseSkill: skillValue, outcome }
}

/**
 * Roll d100 with bonus/penalty dice (CoC 7e).
 *
 * Extra tens-dice are rolled; the units die stays fixed.
 * - net > 0 (bonus): pick the LOWEST tens die
 * - net < 0 (penalty): pick the HIGHEST tens die
 * - net == 0: normal d100
 *
 * Special case: units=0 with tens=00 → 100 (not 0).
 */
export function d100WithBonusPenalty(
  bonus: number,
  penalty: number,
): { roll: number; tensDice: number[]; unitsDie: number } {
  const net = bonus - penalty

  const unitsDie = Math.floor(Math.random() * 10) // 0-9

  // Always roll at least 1 tens die, plus |net| extra
  const tensDiceCount = 1 + Math.abs(net)
  const tensDice: number[] = []
  for (let i = 0; i < tensDiceCount; i++) {
    tensDice.push(Math.floor(Math.random() * 10) * 10) // 0,10,20,...,90
  }

  let chosenTens: number
  if (net > 0) {
    chosenTens = Math.min(...tensDice)
  } else if (net < 0) {
    chosenTens = Math.max(...tensDice)
  } else {
    chosenTens = tensDice[0]
  }

  // d100: 00+0 = 100 (not 0)
  const roll = (chosenTens + unitsDie) === 0 ? 100 : chosenTens + unitsDie

  return { roll, tensDice, unitsDie }
}

/**
 * Skill check with bonus/penalty dice support.
 * Wraps skillCheck logic but uses d100WithBonusPenalty for the roll.
 */
export function skillCheckWithBP(
  skillValue: number,
  skillName: string,
  difficulty: Difficulty,
  bonusPenalty?: BonusPenaltyDice,
): DiceResult & { roll: number; baseSkill: number; tensDice?: number[] } {
  const bonus = bonusPenalty?.bonus ?? 0
  const penalty = bonusPenalty?.penalty ?? 0

  // If no bonus/penalty, delegate to plain skillCheck
  if (bonus === 0 && penalty === 0) {
    return skillCheck(skillValue, skillName, difficulty)
  }

  const { roll, tensDice } = d100WithBonusPenalty(bonus, penalty)

  // Apply difficulty to target
  let target = skillValue
  if (difficulty === 'hard') target = Math.floor(skillValue / 2)
  if (difficulty === 'extreme') target = Math.floor(skillValue / 5)

  const regularFailureMax = Math.floor((skillValue + 95) / 2)
  const fumbleThreshold = skillValue < 50 ? 100 : 96

  let outcome: DiceResult['outcome']
  if (roll >= fumbleThreshold) {
    outcome = 'fumble'
  } else if (roll <= Math.floor(target / 5)) {
    outcome = 'extreme_success'
  } else if (roll <= Math.floor(target / 2)) {
    outcome = 'hard_success'
  } else if (roll <= target) {
    outcome = 'regular_success'
  } else if (roll <= regularFailureMax) {
    outcome = 'regular_failure'
  } else {
    outcome = 'bad_failure'
  }

  return { skill: skillName, target, roll, baseSkill: skillValue, outcome, tensDice }
}

/** Pretty-print an outcome with Korean label */
export function outcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    extreme_success: '🌟 극단적 성공',
    hard_success: '✅ 어려운 성공',
    regular_success: '✔️  성공',
    regular_failure: '❌ 실패',
    bad_failure: '💥 나쁜 실패',
    fumble: '💀 대실패',
    failure: '❌ 실패',  // backward compat
  }
  return labels[outcome] ?? outcome
}

/** Check if an outcome is a success tier */
export function isSuccess(outcome: DiceResult['outcome']): boolean {
  return outcome === 'extreme_success' || outcome === 'hard_success' || outcome === 'regular_success'
}

/** Check if an outcome is a failure tier */
export function isFailure(outcome: DiceResult['outcome']): boolean {
  return outcome === 'regular_failure' || outcome === 'bad_failure' || outcome === 'fumble' || outcome === 'failure'
}

/**
 * Compare success levels for opposed rolls (CoC 7e).
 *
 * Ranking: extreme > hard > regular > any failure
 * If both succeed at same level → higher skill value wins
 * If still tied → 'tie' (re-roll needed)
 *
 * tieRule: 'attacker' favors side A, 'defender' favors side B
 */
export function compareSuccessLevels(
  a: { outcome: string; skillValue: number },
  b: { outcome: string; skillValue: number },
  tieRule?: 'attacker' | 'defender',
): 'a_wins' | 'b_wins' | 'tie' {
  const rank: Record<string, number> = {
    extreme_success: 3,
    hard_success: 2,
    regular_success: 1,
    regular_failure: 0,
    bad_failure: 0,
    fumble: -1,
    failure: 0,
  }
  const ra = rank[a.outcome] ?? 0
  const rb = rank[b.outcome] ?? 0

  // Both fail → attacker fails (no winner, but we need to return something)
  if (ra <= 0 && rb <= 0) {
    // If one fumbled and the other didn't
    if (ra < rb) return 'b_wins'
    if (rb < ra) return 'a_wins'
    return tieRule === 'attacker' ? 'a_wins' : tieRule === 'defender' ? 'b_wins' : 'tie'
  }

  if (ra > rb) return 'a_wins'
  if (rb > ra) return 'b_wins'

  // Same success level → higher skill value wins
  if (a.skillValue > b.skillValue) return 'a_wins'
  if (b.skillValue > a.skillValue) return 'b_wins'

  // True tie
  if (tieRule === 'attacker') return 'a_wins'
  if (tieRule === 'defender') return 'b_wins'
  return 'tie'
}
