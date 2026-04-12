/**
 * Judgment Event System — CoC 7e skill check with structured outcomes and effects.
 *
 * This replaces the simple dice_roll handler with a richer system that:
 * - Computes 6-tier outcomes (extreme_success → fumble)
 * - Applies structured Effect objects automatically
 * - Generates natural language text for the AI context
 */

import { skillCheck } from './dice.js'
import type { JudgmentOutcomes, Outcome, Effect } from '../characters/types.js'
import type { GameSession } from '../api.js'

export type JudgmentOutcomeKey =
  | 'extreme_success'
  | 'hard_success'
  | 'regular_success'
  | 'regular_failure'
  | 'bad_failure'
  | 'fumble'

export interface JudgmentResult {
  charId: string
  charName: string
  skill: string
  difficulty: 'regular' | 'hard' | 'extreme'
  roll: number
  target: number
  baseSkill: number
  outcome: JudgmentOutcomeKey
  appliedOutcome: Outcome | null
  effectsApplied: Effect[]
  naturalLanguage: string
}

/**
 * Map JudgmentOutcomes key by outcome tier
 */
function getOutcomeForTier(outcomes: JudgmentOutcomes, tier: JudgmentOutcomeKey): Outcome | null {
  // 성공 계열: 미정의 시 한 단계 낮은 성공으로 폴백 (extreme→hard→regular)
  // 실패 계열: 미정의 시 한 단계 낮은 실패로 폴백 (fumble→bad→regular)
  switch (tier) {
    case 'extreme_success': return outcomes.extremeSuccess ?? outcomes.hardSuccess ?? outcomes.regularSuccess ?? null
    case 'hard_success':    return outcomes.hardSuccess ?? outcomes.regularSuccess ?? null
    case 'regular_success': return outcomes.regularSuccess ?? null
    case 'regular_failure': return outcomes.regularFailure ?? null
    case 'bad_failure':     return outcomes.badFailure ?? outcomes.regularFailure ?? null
    case 'fumble':          return outcomes.fumble ?? outcomes.badFailure ?? outcomes.regularFailure ?? null
  }
}

/**
 * Perform a full judgment: roll dice, determine tier, apply effects.
 */
export function performJudgment(
  session: GameSession,
  charId: string,
  skill: string,
  difficulty: 'regular' | 'hard' | 'extreme',
  outcomes: JudgmentOutcomes,
): JudgmentResult {
  const char = session.characters.get(charId)
  if (!char) throw new Error(`Character ${charId} not found`)

  const baseSkill = char.skills[skill] ?? 0
  const rolled = skillCheck(baseSkill, skill, difficulty)
  const roll = rolled.roll
  const target = rolled.target
  const tier = rolled.outcome as JudgmentOutcomeKey

  const appliedOutcome = getOutcomeForTier(outcomes, tier)
  const effectsApplied: Effect[] = []

  // Apply effects
  if (appliedOutcome?.effects) {
    for (const effect of appliedOutcome.effects) {
      try {
        session.state.applyEffects(charId, [effect])
        effectsApplied.push(effect)
      } catch (e) {
        console.error(`Effect application error: ${e}`)
      }
    }
  }

  const partial = { charId, charName: char.name, skill, difficulty, roll, target, baseSkill, outcome: tier, appliedOutcome, effectsApplied }
  return { ...partial, naturalLanguage: judgmentToNaturalLanguage({ ...partial, naturalLanguage: '' }) }
}

/** Render a judgment result as a natural-language string for the AI context */
export function judgmentToNaturalLanguage(result: JudgmentResult): string {
  const tierLabels: Record<JudgmentOutcomeKey, string> = {
    extreme_success: '극단적 성공',
    hard_success: '어려운 성공',
    regular_success: '성공',
    regular_failure: '실패',
    bad_failure: '나쁜 실패',
    fumble: '대실패',
  }

  const diffLabels: Record<string, string> = {
    regular: '보통',
    hard: '어려움',
    extreme: '극한',
  }

  let text = `[판정 결과 — ${result.charName} · ${result.skill} (${diffLabels[result.difficulty] ?? result.difficulty} / 목표: ${result.target})] 주사위: ${result.roll} → ${tierLabels[result.outcome]}`

  if (result.appliedOutcome?.desc) {
    text += `\n${result.appliedOutcome.desc}`
  }

  if (result.effectsApplied.length > 0) {
    const effectTexts = result.effectsApplied.map(renderEffect)
    text += `\n적용된 효과: ${effectTexts.join(', ')}`
  }

  return text
}

/** Render a single effect as a short Korean description */
function renderEffect(effect: Effect): string {
  switch (effect.kind) {
    case 'stat': {
      const statNames: Record<string, string> = { hp: 'HP', san: 'SAN', mp: 'MP', luck: '행운' }
      const name = statNames[effect.stat] ?? effect.stat
      return effect.delta > 0 ? `${name} +${effect.delta}` : `${name} ${effect.delta}`
    }
    case 'skill':
      return `${effect.skill} ${effect.delta > 0 ? '+' : ''}${effect.delta}%${effect.permanent ? ' (영구)' : ''}`
    case 'item_gain':
      return `아이템 획득: ${effect.item.name}`
    case 'item_lose':
      return `아이템 분실: ${effect.itemName}`
    case 'status':
      if (effect.status === 'temporaryInsanity') return effect.value ? '일시적 광기' : '일시적 광기 해소'
      if (effect.status === 'indefiniteInsanity') return effect.value ? '무기한 광기' : '무기한 광기 해소'
      return effect.status
  }
}

/**
 * Attempt to detect a skill name from AI's [시도] text.
 * Returns the detected skill name or null if not found.
 */
export function detectSkillFromText(text: string): string | null {
  // CoC 7th Edition 공식 기술 목록 (client/src/constants/skills.ts 와 동기화 유지)
  const SKILLS = [
    // 전투
    '격투', '도검', '사격', '소총', '투척', '회피',
    // 탐색 / 인지
    '흔적발견', '청취', '추적',
    // 대인 관계
    '설득', '위협', '매혹', '언변', '심리학', '정신분석',
    // 학술 / 지식
    '도서관이용', '역사', '오컬트', '크툴루신화',
    '고고학', '인류학', '자연사', '법률', '회계',
    // 의학 / 과학
    '의학', '응급처치', '생물학', '화학', '물리학', '지질학', '전자공학',
    // 기술 / 수리
    '전기수리', '기계수리', '컴퓨터', '자물쇠따기',
    '운전', '항법', '조종', '승마',
    // 신체
    '은신', '잠입', '수영', '등반', '점프', '야생생존',
    // 예술 / 기타
    '예술/공예', '사진술', '변장', '동물조련', '손재주', '감정',
  ]
  for (const skill of SKILLS) {
    if (text.includes(skill)) return skill
  }
  return null
}
