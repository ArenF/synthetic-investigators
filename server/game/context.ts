/**
 * Context window management — compresses old turns to keep token usage reasonable.
 */

import type { TurnRecord } from '../characters/types.js'

/** Number of recent turns to keep as full messages */
const FULL_CONTEXT_TURNS = 8

/**
 * Build context messages from turn history.
 * Keeps the last FULL_CONTEXT_TURNS as full messages.
 * Compresses older turns into a summary block.
 */
export function buildContextMessages(
  history: TurnRecord[],
  fullTurns: number = FULL_CONTEXT_TURNS,
): { summary: string | null; recentTurns: TurnRecord[] } {
  if (history.length <= fullTurns) {
    return { summary: null, recentTurns: history }
  }

  const olderTurns = history.slice(0, history.length - fullTurns)
  const recentTurns = history.slice(-fullTurns)

  const summaryLines = olderTurns.map(t => {
    const statChange = []
    if (t.statsBefore.hp !== t.statsAfter.hp) {
      statChange.push(`HP ${t.statsBefore.hp}→${t.statsAfter.hp}`)
    }
    if (t.statsBefore.san !== t.statsAfter.san) {
      statChange.push(`SAN ${t.statsBefore.san}→${t.statsAfter.san}`)
    }
    if (t.statsBefore.luck !== t.statsAfter.luck) {
      statChange.push(`행운 ${t.statsBefore.luck}→${t.statsAfter.luck}`)
    }
    const statsStr = statChange.length > 0 ? `, ${statChange.join(', ')}` : ''
    return `- ${t.turnNumber}턴: ${t.characterName}이(가) ${t.response.action.slice(0, 80)}${t.response.action.length > 80 ? '...' : ''}${statsStr}`
  })

  const summary = `[이전 상황 요약]\n${summaryLines.join('\n')}`

  return { summary, recentTurns }
}

