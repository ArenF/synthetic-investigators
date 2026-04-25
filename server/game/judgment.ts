/**
 * Judgment Event System — CoC 7e multi-step judgment flow.
 *
 * Phase 1: rollJudgment()   — roll dice, compute tier, NO effect application
 *          Returns PendingJudgment for GM review
 * Phase 2: resolveJudgment() — GM chooses accept/push/luck → apply effects, finalize
 *
 * Also: getOutcomeForTier(), judgmentToNaturalLanguage(), renderEffect()
 */

import { skillCheckWithBP, skillCheck, isSuccess, isFailure, d100, rollDice, rollDie, compareSuccessLevels } from './dice.js'
import type {
  JudgmentOutcomes, Outcome, Effect, Difficulty,
  JudgmentOutcomeKey, BonusPenaltyDice,
  JudgmentRequest, PendingJudgment, RollResult,
  JudgmentResolution, JudgmentFinalResult, SanCheckResult,
  OpposedRollRequest, CombinedRollRequest, GroupRollRequest,
} from '../characters/types.js'
import type { GameSession } from '../api.js'

let judgmentCounter = 0
function nextJudgmentId(): string {
  return `j-${Date.now()}-${++judgmentCounter}`
}

// ────────────────────────────────────────
// Outcome tier lookup with fallback chain
// ────────────────────────────────────────

export function getOutcomeForTier(outcomes: JudgmentOutcomes, tier: JudgmentOutcomeKey): Outcome | null {
  switch (tier) {
    case 'extreme_success': return outcomes.extremeSuccess ?? outcomes.hardSuccess ?? outcomes.regularSuccess ?? null
    case 'hard_success':    return outcomes.hardSuccess ?? outcomes.regularSuccess ?? null
    case 'regular_success': return outcomes.regularSuccess ?? null
    case 'regular_failure': return outcomes.regularFailure ?? null
    case 'bad_failure':     return outcomes.badFailure ?? outcomes.regularFailure ?? null
    case 'fumble':          return outcomes.fumble ?? outcomes.badFailure ?? outcomes.regularFailure ?? null
  }
}

// ────────────────────────────────────────
// Phase 1: Roll — no effects applied
// ────────────────────────────────────────

/**
 * Roll dice for a judgment request. Returns PendingJudgment with
 * computed canPush / canSpendLuck / luckCost, but NO effects applied.
 */
export function rollJudgment(
  session: GameSession,
  request: JudgmentRequest,
): PendingJudgment {
  switch (request.type) {
    case 'simple':
      return rollSimpleCheck(session, request)
    case 'opposed':
      return rollOpposedCheck(session, request)
    case 'combined':
      return rollCombinedCheck(session, request)
    case 'group':
      return rollGroupCheck(session, request)
    default:
      throw new Error(`Unsupported judgment type: ${(request as any).type}`)
  }
}

function rollSimpleCheck(
  session: GameSession,
  request: JudgmentRequest & { type: 'simple' },
): PendingJudgment {
  const char = session.characters.get(request.charId)
  if (!char) throw new Error(`Character ${request.charId} not found`)

  const baseSkill = char.skills[request.skill] ?? 0
  const rolled = skillCheckWithBP(baseSkill, request.skill, request.difficulty, request.bonusPenalty)

  const rollResult: RollResult = {
    charId: request.charId,
    charName: char.name,
    skill: request.skill,
    baseSkill,
    target: rolled.target,
    roll: rolled.roll,
    tensDice: rolled.tensDice,
    outcome: rolled.outcome as JudgmentOutcomeKey,
  }

  const outcome = rollResult.outcome
  const failed = isFailure(outcome)
  const isFumble = outcome === 'fumble'

  // Look up the outcome description (for display, not yet applied)
  const appliedOutcome = request.outcomes
    ? getOutcomeForTier(request.outcomes, outcome)
    : null

  // Luck cost: how much luck to spend to turn roll into success
  // = roll - target (positive means roll exceeded target)
  // Only applicable if failed AND not fumble
  const currentLuck = session.state.getState(request.charId)?.luck
    ?? char.derived.luck
  let luckCost: number | null = null
  if (failed && !isFumble && rolled.roll > rolled.target) {
    luckCost = rolled.roll - rolled.target
  }

  return {
    id: nextJudgmentId(),
    request,
    rolls: [rollResult],
    outcome,
    appliedOutcome,
    canPush: failed && !isFumble,        // can push if failed (not fumble), Phase 2 activates
    canSpendLuck: failed && !isFumble && luckCost !== null && luckCost <= currentLuck,
    luckCost,
    currentLuck,
    pushed: false,
    timestamp: new Date().toISOString(),
  }
}

// ────────────────────────────────────────
// Opposed Roll
// ────────────────────────────────────────

function rollOpposedCheck(
  session: GameSession,
  request: OpposedRollRequest,
): PendingJudgment {
  // Side A: always a PC
  const charA = session.characters.get(request.sideA.charId)
  if (!charA) throw new Error(`Character ${request.sideA.charId} not found`)
  const baseSkillA = charA.skills[request.sideA.skill] ?? 0
  const rolledA = skillCheckWithBP(baseSkillA, request.sideA.skill, 'regular', request.sideA.bonusPenalty)

  const rollA: RollResult = {
    charId: request.sideA.charId,
    charName: charA.name,
    skill: request.sideA.skill,
    baseSkill: baseSkillA,
    target: rolledA.target,
    roll: rolledA.roll,
    tensDice: rolledA.tensDice,
    outcome: rolledA.outcome as JudgmentOutcomeKey,
  }

  // Side B: PC or NPC (NPC has direct skill value)
  let charBName: string
  let baseSkillB: number
  let rollB: RollResult

  if (request.sideB.charId) {
    const charB = session.characters.get(request.sideB.charId)
    if (!charB) throw new Error(`Character ${request.sideB.charId} not found`)
    charBName = charB.name
    baseSkillB = charB.skills[request.sideB.skill] ?? 0
  } else {
    charBName = request.sideB.npcName ?? 'NPC'
    baseSkillB = request.sideB.skillValue ?? 0
  }

  const rolledB = skillCheckWithBP(baseSkillB, request.sideB.skill, 'regular', request.sideB.bonusPenalty)
  rollB = {
    charId: request.sideB.charId ?? 'npc',
    charName: charBName,
    skill: request.sideB.skill,
    baseSkill: baseSkillB,
    target: rolledB.target,
    roll: rolledB.roll,
    tensDice: rolledB.tensDice,
    outcome: rolledB.outcome as JudgmentOutcomeKey,
  }

  // Compare
  const winner = compareSuccessLevels(
    { outcome: rollA.outcome, skillValue: baseSkillA },
    { outcome: rollB.outcome, skillValue: baseSkillB },
    request.tieBreaker,
  )

  // The overall outcome reflects side A's perspective
  let outcome: JudgmentOutcomeKey
  if (winner === 'a_wins') {
    outcome = rollA.outcome as JudgmentOutcomeKey
  } else if (winner === 'b_wins') {
    // A lost — use A's outcome (which is a failure tier) or regular_failure
    outcome = isFailure(rollA.outcome) ? rollA.outcome as JudgmentOutcomeKey : 'regular_failure'
  } else {
    outcome = 'regular_failure' // tie
  }

  const appliedOutcome = request.outcomes
    ? getOutcomeForTier(request.outcomes, outcome)
    : null

  return {
    id: nextJudgmentId(),
    request,
    rolls: [rollA, rollB],
    outcome,
    appliedOutcome,
    canPush: false,      // no pushing in opposed rolls
    canSpendLuck: false,  // no luck spend in opposed rolls
    luckCost: null,
    currentLuck: session.state.getState(request.sideA.charId)?.luck ?? 0,
    pushed: false,
    timestamp: new Date().toISOString(),
  }
}

// ────────────────────────────────────────
// Combined Roll
// ────────────────────────────────────────

function rollCombinedCheck(
  session: GameSession,
  request: CombinedRollRequest,
): PendingJudgment {
  const char = session.characters.get(request.charId)
  if (!char) throw new Error(`Character ${request.charId} not found`)

  const difficulty = request.difficulty ?? 'regular'

  // Single d100 roll (with bonus/penalty if any)
  const primarySkill = request.skills[0]
  const baseSkillPrimary = char.skills[primarySkill] ?? 0
  const rolled = skillCheckWithBP(baseSkillPrimary, primarySkill, difficulty, request.bonusPenalty)

  // Check each skill against the same roll
  const rolls: RollResult[] = request.skills.map(skill => {
    const baseSkill = char.skills[skill] ?? 0
    let target = baseSkill
    if (difficulty === 'hard') target = Math.floor(baseSkill / 2)
    if (difficulty === 'extreme') target = Math.floor(baseSkill / 5)

    const fumbleThreshold = baseSkill < 50 ? 100 : 96
    const regularFailureMax = Math.floor((baseSkill + 95) / 2)
    let outcome: JudgmentOutcomeKey
    if (rolled.roll >= fumbleThreshold) {
      outcome = 'fumble'
    } else if (rolled.roll <= Math.floor(target / 5)) {
      outcome = 'extreme_success'
    } else if (rolled.roll <= Math.floor(target / 2)) {
      outcome = 'hard_success'
    } else if (rolled.roll <= target) {
      outcome = 'regular_success'
    } else if (rolled.roll <= regularFailureMax) {
      outcome = 'regular_failure'
    } else {
      outcome = 'bad_failure'
    }

    return {
      charId: request.charId,
      charName: char.name,
      skill,
      baseSkill,
      target,
      roll: rolled.roll,
      tensDice: rolled.tensDice,
      outcome,
    }
  })

  // Evaluate combined condition
  const successes = rolls.filter(r => isSuccess(r.outcome))
  let overallSuccess: boolean
  if (request.condition === 'and') {
    overallSuccess = successes.length === rolls.length
  } else {
    overallSuccess = successes.length > 0
  }

  // Use the worst success tier or best failure tier as outcome
  const outcome: JudgmentOutcomeKey = overallSuccess && rolls.length > 0
    ? (rolls.reduce((worst, r) => {
        const rank: Record<string, number> = { extreme_success: 3, hard_success: 2, regular_success: 1 }
        return (rank[r.outcome] ?? 0) < (rank[worst.outcome] ?? 0) ? r : worst
      }, rolls[0]).outcome as JudgmentOutcomeKey)
    : 'regular_failure'

  const appliedOutcome = request.outcomes
    ? getOutcomeForTier(request.outcomes, outcome)
    : null

  const failed = !overallSuccess
  const isFumble = rolls.some(r => r.outcome === 'fumble')

  return {
    id: nextJudgmentId(),
    request,
    rolls,
    outcome,
    appliedOutcome,
    canPush: failed && !isFumble,
    canSpendLuck: false, // combined rolls: luck spend is complex, disabled for now
    luckCost: null,
    currentLuck: session.state.getState(request.charId)?.luck ?? 0,
    pushed: false,
    timestamp: new Date().toISOString(),
  }
}

// ────────────────────────────────────────
// Group Roll
// ────────────────────────────────────────

function rollGroupCheck(
  session: GameSession,
  request: GroupRollRequest,
): PendingJudgment {
  const difficulty = request.difficulty ?? 'regular'

  const rolls: RollResult[] = request.charIds.map(charId => {
    const char = session.characters.get(charId)
    if (!char) throw new Error(`Character ${charId} not found`)
    const baseSkill = char.skills[request.skill] ?? 0
    const rolled = skillCheckWithBP(baseSkill, request.skill, difficulty, request.bonusPenalty)

    return {
      charId,
      charName: char.name,
      skill: request.skill,
      baseSkill,
      target: rolled.target,
      roll: rolled.roll,
      tensDice: rolled.tensDice,
      outcome: rolled.outcome as JudgmentOutcomeKey,
    }
  })

  const successes = rolls.filter(r => isSuccess(r.outcome))
  let overallSuccess: boolean
  if (request.mode === 'cooperative') {
    overallSuccess = successes.length > 0 // at least one success
  } else {
    overallSuccess = successes.length === rolls.length // all must succeed
  }

  // Best success outcome among participants, or regular_failure
  const outcome: JudgmentOutcomeKey = overallSuccess && successes.length > 0
    ? (successes.reduce((best, r) => {
        const rank: Record<string, number> = { extreme_success: 3, hard_success: 2, regular_success: 1 }
        return (rank[r.outcome] ?? 0) > (rank[best.outcome] ?? 0) ? r : best
      }, successes[0]).outcome as JudgmentOutcomeKey)
    : 'regular_failure'

  const appliedOutcome = request.outcomes
    ? getOutcomeForTier(request.outcomes, outcome)
    : null

  // Use first character for canPush/luck context
  const firstCharId = request.charIds[0]

  return {
    id: nextJudgmentId(),
    request,
    rolls,
    outcome,
    appliedOutcome,
    canPush: false,       // group rolls: no push
    canSpendLuck: false,  // group rolls: no luck
    luckCost: null,
    currentLuck: session.state.getState(firstCharId)?.luck ?? 0,
    pushed: false,
    timestamp: new Date().toISOString(),
  }
}

// ────────────────────────────────────────
// Phase 2: Resolve — apply effects
// ────────────────────────────────────────

/**
 * Finalize a pending judgment based on GM's resolution choice.
 * Applies effects to game state and returns the final result.
 */
export function resolveJudgment(
  session: GameSession,
  pending: PendingJudgment,
  resolution: JudgmentResolution,
): JudgmentFinalResult {
  switch (resolution.action) {
    case 'accept':
      return resolveAccept(session, pending)
    case 'push':
      return resolvePush(session, pending, resolution.pushConsequence)
    case 'luck_spend':
      return resolveLuckSpend(session, pending)
    default:
      throw new Error(`Unknown resolution action: ${(resolution as any).action}`)
  }
}

function resolveAccept(session: GameSession, pending: PendingJudgment): JudgmentFinalResult {
  const roll = pending.rolls[0]
  const effectsApplied = applyOutcomeEffects(session, roll.charId, pending.appliedOutcome)

  const base = buildFinalBase(pending, roll, effectsApplied)
  base.naturalLanguage = judgmentToNaturalLanguage(base)
  return base
}

function resolvePush(
  session: GameSession,
  pending: PendingJudgment,
  pushConsequence: string,
): JudgmentFinalResult {
  if (pending.request.type !== 'simple') {
    throw new Error(`밀어붙이기는 단순 판정만 가능합니다 (현재: ${pending.request.type})`)
  }
  const request = pending.request
  const char = session.characters.get(request.charId)
  if (!char) throw new Error(`Character ${request.charId} not found`)

  // Re-roll with same difficulty and bonus/penalty
  const baseSkill = char.skills[request.skill] ?? 0
  const rerolled = skillCheckWithBP(baseSkill, request.skill, request.difficulty, request.bonusPenalty)

  const newOutcome = rerolled.outcome as JudgmentOutcomeKey
  const appliedOutcome = request.outcomes
    ? getOutcomeForTier(request.outcomes, newOutcome)
    : null

  const effectsApplied = applyOutcomeEffects(session, request.charId, appliedOutcome)

  const roll: RollResult = {
    charId: request.charId,
    charName: char.name,
    skill: request.skill,
    baseSkill,
    target: rerolled.target,
    roll: rerolled.roll,
    tensDice: rerolled.tensDice,
    outcome: newOutcome,
  }

  const base = buildFinalBase(
    { ...pending, outcome: newOutcome, appliedOutcome, rolls: [roll] },
    roll,
    effectsApplied,
  )
  base.wasPush = true

  // Append push consequence to natural language if the re-roll also failed
  let nl = judgmentToNaturalLanguage(base)
  if (isFailure(newOutcome) && pushConsequence) {
    nl += `\n밀어붙이기 대가: ${pushConsequence}`
  }
  if (isSuccess(newOutcome)) {
    nl = `[밀어붙이기 성공!] ` + nl
  }
  base.naturalLanguage = nl
  return base
}

function resolveLuckSpend(session: GameSession, pending: PendingJudgment): JudgmentFinalResult {
  if (pending.request.type !== 'simple') {
    throw new Error(`행운 소비는 단순 판정만 가능합니다 (현재: ${pending.request.type})`)
  }
  const roll = pending.rolls[0]
  const cost = pending.luckCost!

  // Spend luck
  session.state.spendLuck(roll.charId, cost)

  // Treat as regular_success (the lowest success tier from the original difficulty)
  const newOutcome: JudgmentOutcomeKey = 'regular_success'
  const request = pending.request
  const appliedOutcome = request.outcomes
    ? getOutcomeForTier(request.outcomes, newOutcome)
    : null

  const effectsApplied = applyOutcomeEffects(session, roll.charId, appliedOutcome)

  const base = buildFinalBase(
    { ...pending, outcome: newOutcome, appliedOutcome },
    roll,
    effectsApplied,
  )
  base.wasLuckSpend = true
  base.luckSpent = cost
  base.outcome = newOutcome
  base.appliedOutcome = appliedOutcome

  let nl = judgmentToNaturalLanguage(base)
  nl += `\n행운 ${cost}점 소비 (${pending.currentLuck} → ${pending.currentLuck - cost})`
  base.naturalLanguage = nl
  return base
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function buildFinalBase(
  pending: PendingJudgment,
  roll: RollResult,
  effectsApplied: Effect[],
): JudgmentFinalResult {
  return {
    judgmentId: pending.id,
    charId: roll.charId,
    charName: roll.charName,
    skill: roll.skill,
    difficulty: ('difficulty' in pending.request ? (pending.request as { difficulty?: Difficulty }).difficulty ?? 'regular' : 'regular') as Difficulty,
    roll: roll.roll,
    target: roll.target,
    baseSkill: roll.baseSkill,
    outcome: pending.outcome,
    appliedOutcome: pending.appliedOutcome,
    effectsApplied,
    naturalLanguage: '',
    wasPush: false,
    wasLuckSpend: false,
    luckSpent: 0,
    tensDice: roll.tensDice,
  }
}

function applyOutcomeEffects(
  session: GameSession,
  charId: string,
  outcome: Outcome | null,
): Effect[] {
  const applied: Effect[] = []
  if (outcome?.effects) {
    for (const effect of outcome.effects) {
      try {
        session.state.applyEffects(charId, [effect])
        applied.push(effect)
      } catch (e) {
        console.error(`Effect application error: ${e}`)
        console.warn(`[applyOutcomeEffects] Effect 적용 실패 (${charId}):`, effect, e)
      }
    }
  }
  return applied
}

// ────────────────────────────────────────
// SAN Check — immediate (no pending flow)
// ────────────────────────────────────────

/**
 * Perform a SAN check (CoC 7e).
 * Immediate execution — no push/luck allowed for SAN checks.
 *
 * Flow:
 * 1. d100 vs current SAN
 * 2. Success → rollDice(successLoss), Failure → rollDice(failureLoss)
 * 3. If loss ≥ 5 → INT roll:
 *    - INT success → temporary insanity (1d10 hours)
 *    - INT failure → suppressed (no immediate insanity)
 * 4. applySanLoss() handles cumulative + indefinite check
 */
export function performSanCheck(
  session: GameSession,
  charId: string,
  successLoss: string,  // e.g. "0", "1", "1d3"
  failureLoss: string,  // e.g. "1d6", "1d10"
): SanCheckResult {
  const char = session.characters.get(charId)
  if (!char) throw new Error(`Character ${charId} not found`)

  const state = session.state.getState(charId)
  const currentSan = state.san

  // 1. SAN roll
  const sanRoll = d100()
  const sanTarget = currentSan
  const sanSuccess = sanRoll <= sanTarget
  const sanOutcome: JudgmentOutcomeKey = sanSuccess ? 'regular_success' : 'regular_failure'

  // 2. Determine loss
  const lossRoll = sanSuccess ? successLoss : failureLoss
  const lossAmount = rollDice(lossRoll)

  // 3. Apply SAN loss (handles cumulative + indefinite)
  if (lossAmount > 0) {
    session.state.applySanLoss(charId, lossAmount)
  }

  // Read updated state
  const updatedState = session.state.getState(charId)
  let temporaryInsanity = false
  let intRoll: number | undefined
  let intTarget: number | undefined
  let intOutcome: JudgmentOutcomeKey | undefined
  let insanityDuration: number | undefined

  // 4. If loss ≥ 5 → INT roll for temporary insanity
  if (lossAmount >= 5) {
    const intValue = char.characteristics.INT
    intTarget = intValue
    intRoll = d100()
    const intSuccess = intRoll <= intTarget

    if (intSuccess) {
      // INT success = character UNDERSTANDS the horror → temporary insanity
      temporaryInsanity = true
      insanityDuration = rollDie(10) // 1d10 hours
      updatedState.temporaryInsanity = true
    }
    // INT failure = suppressed, no immediate insanity
    intOutcome = intSuccess ? 'regular_success' : 'regular_failure'
  }

  // Build natural language
  const result: SanCheckResult = {
    charId,
    charName: char.name,
    sanRoll,
    sanTarget,
    sanOutcome,
    lossRoll,
    lossAmount,
    intRoll,
    intTarget,
    intOutcome,
    temporaryInsanity,
    indefiniteInsanity: updatedState.indefiniteInsanity,
    insanityDuration,
    naturalLanguage: '',
  }
  result.naturalLanguage = sanCheckToNaturalLanguage(result)
  return result
}

function sanCheckToNaturalLanguage(r: SanCheckResult): string {
  const success = r.sanOutcome === 'regular_success'
  let text = `[SAN 체크 — ${r.charName}] 주사위: ${r.sanRoll} / 목표: ${r.sanTarget} → ${success ? '성공' : '실패'}`
  text += `\nSAN 손실: ${r.lossRoll} = ${r.lossAmount}점`

  if (r.lossAmount >= 5 && r.intRoll !== undefined) {
    const intSuccess = r.intOutcome === 'regular_success'
    text += `\nINT 굴림: ${r.intRoll} / 목표: ${r.intTarget} → ${intSuccess ? '성공 (공포 인지)' : '실패 (억압)'}`
    if (r.temporaryInsanity) {
      text += `\n일시적 광기 발동! (${r.insanityDuration}시간)`
    }
  }

  if (r.indefiniteInsanity) {
    text += `\n무기한 광기 발동! (세션 누적 SAN 손실이 현재 SAN/5 이상)`
  }

  if (r.lossAmount === 0) {
    text += ' — 정신적 충격 없음'
  }

  return text
}

// ────────────────────────────────────────
// Natural language generation
// ────────────────────────────────────────

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

export function judgmentToNaturalLanguage(result: JudgmentFinalResult): string {
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
export function renderEffect(effect: Effect): string {
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
