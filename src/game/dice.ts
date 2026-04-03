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
 * Perform a CoC 7e skill check.
 * Returns structured result with success level.
 */
export function skillCheck(skillValue: number): DiceResult & { roll: number } {
  const roll = d100()
  const hard = Math.floor(skillValue / 2)
  const extreme = Math.floor(skillValue / 5)

  let outcome: DiceResult['outcome']
  if (roll >= 96) {
    outcome = 'fumble'
  } else if (roll <= extreme) {
    outcome = 'extreme_success'
  } else if (roll <= hard) {
    outcome = 'hard_success'
  } else if (roll <= skillValue) {
    outcome = 'regular_success'
  } else {
    outcome = 'failure'
  }

  return { skill: '', target: skillValue, roll, outcome }
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

/** Pretty-print an outcome */
export function outcomeLabel(outcome: DiceResult['outcome']): string {
  const labels = {
    extreme_success: '🌟 극단적 성공',
    hard_success: '✅ 어려운 성공',
    regular_success: '✔️  성공',
    failure: '❌ 실패',
    fumble: '💀 대실패',
  }
  return labels[outcome]
}
