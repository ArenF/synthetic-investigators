/**
 * Dice rolling utilities for CoC 7th Edition
 */

import type { DiceResult } from '../characters/types.js'

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
    return isNaN(fixed) ? 0 : fixed
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
export function skillCheck(skillValue: number, skillName: string = ''): DiceResult & { roll: number } {
  const roll = d100()
  const hard = Math.floor(skillValue / 2)
  const extreme = Math.floor(skillValue / 5)

  // Midpoint between skill and 95 — boundary between regular_failure and bad_failure
  const regularFailureMax = Math.floor((skillValue + 95) / 2)

  // CoC 7e fumble rules: skill < 50 → fumble only on 100; skill ≥ 50 → fumble on 96-100
  const fumbleThreshold = skillValue < 50 ? 100 : 96

  let outcome: DiceResult['outcome']
  if (roll >= fumbleThreshold) {
    outcome = 'fumble'
  } else if (roll <= extreme) {
    outcome = 'extreme_success'
  } else if (roll <= hard) {
    outcome = 'hard_success'
  } else if (roll <= skillValue) {
    outcome = 'regular_success'
  } else if (roll <= regularFailureMax) {
    outcome = 'regular_failure'
  } else {
    outcome = 'bad_failure'
  }

  return { skill: skillName, target: skillValue, roll, outcome }
}

/** CoC 7e SAN check */
export function sanCheck(sanValue: number): {
  roll: number
  success: boolean
  lossSanSuccess: string  // e.g. "0" or "1"
  lossSanFailure: string  // e.g. "1d6"
} {
  const roll = d100()
  return {
    roll,
    success: roll <= sanValue,
    lossSanSuccess: '0',
    lossSanFailure: '1d6',
  }
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
export function isSuccess(outcome: string): boolean {
  return outcome === 'extreme_success' || outcome === 'hard_success' || outcome === 'regular_success'
}

/** Check if an outcome is a failure tier */
export function isFailure(outcome: string): boolean {
  return outcome === 'regular_failure' || outcome === 'bad_failure' || outcome === 'fumble' || outcome === 'failure'
}
