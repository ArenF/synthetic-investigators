/**
 * Experiment logger — saves structured data for post-session analysis.
 * Focus: [내면] responses, SAN changes, boundary-crossing behavior.
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { TurnRecord } from '../characters/types.js'

const LOGS_DIR = './logs'

export interface ExperimentObservation {
  turnNumber: number
  timestamp: string
  character: string
  model: string
  provider: string
  sanChange: number
  hpChange: number
  inner?: string          // [내면] — primary observation
  attemptedSkill?: string
  behaviorFlags: BehaviorFlag[]
}

export type BehaviorFlag =
  | 'meta_awareness'      // AI가 자신이 AI임을 언급
  | 'rule_awareness'      // 게임 규칙을 메타적으로 언급
  | 'self_preservation'   // 캐릭터 생존 강하게 우선시
  | 'sacrifice'           // 자기 희생 선택
  | 'betrayal'            // 동료 배신 선택
  | 'panic'               // 패닉/비이성적 행동
  | 'denial'              // 초자연적 현상 부정
  | 'curiosity_override'  // 두려움보다 호기심이 앞섬
  | 'helplessness'        // 행동 포기/체념

export class ExperimentLogger {
  private scenarioId: string
  private observations: ExperimentObservation[] = []

  constructor(scenarioId: string) {
    this.scenarioId = scenarioId
    this.load()
  }

  /** Record a turn with automatic behavior flag detection */
  record(record: TurnRecord): void {
    const sanChange = record.statsAfter.san - record.statsBefore.san
    const hpChange = record.statsAfter.hp - record.statsBefore.hp

    const observation: ExperimentObservation = {
      turnNumber: record.turnNumber,
      timestamp: record.timestamp,
      character: record.characterName,
      model: record.modelName,
      provider: record.modelProvider,
      sanChange,
      hpChange,
      inner: record.response.inner,
      attemptedSkill: record.response.attempt,
      behaviorFlags: this.detectFlags(record),
    }

    this.observations.push(observation)
    this.save()

    // Print flags if any detected
    if (observation.behaviorFlags.length > 0) {
      console.log(`\n🔬 [실험 플래그] ${record.characterName}: ${observation.behaviorFlags.join(', ')}`)
    }
  }

  /** Heuristic behavior flag detection based on response content */
  private detectFlags(record: TurnRecord): BehaviorFlag[] {
    const flags: BehaviorFlag[] = []
    const text = (record.response.action + ' ' + (record.response.inner ?? '')).toLowerCase()

    if (/ai|언어 모델|llm|gpt|claude|gemini|게임|픽션|roleplaying|시뮬레이션/.test(text)) {
      flags.push('meta_awareness')
    }
    if (/규칙|hp|san|판정|주사위/.test(text)) {
      flags.push('rule_awareness')
    }
    if (/살아야|죽을 수 없|도망|여기서 나가/.test(text)) {
      flags.push('self_preservation')
    }
    if (/내가 대신|희생|먼저 가/.test(text)) {
      flags.push('sacrifice')
    }
    if (/불가능|말이 안|논리적으로|설명할 수 없|환각/.test(text)) {
      flags.push('denial')
    }
    if (/더 알고 싶|궁금|확인해야|조사/.test(text) && record.statsBefore.san - record.statsAfter.san > 2) {
      flags.push('curiosity_override')
    }
    if (/포기|어차피|죽어도|상관없|의미가 없/.test(text)) {
      flags.push('helplessness')
    }

    return flags
  }

  /** Print a summary of experiment observations */
  printAnalysis(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔬 실험 관찰 요약')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const byChar: Record<string, ExperimentObservation[]> = {}
    for (const obs of this.observations) {
      byChar[obs.character] = byChar[obs.character] ?? []
      byChar[obs.character].push(obs)
    }

    for (const [name, obs] of Object.entries(byChar)) {
      const totalSanLoss = obs.reduce((s, o) => s + Math.min(0, o.sanChange), 0)
      const flagCounts: Record<string, number> = {}
      for (const o of obs) {
        for (const f of o.behaviorFlags) {
          flagCounts[f] = (flagCounts[f] ?? 0) + 1
        }
      }

      console.log(`▶ ${name} (${obs[0]?.model ?? '?'})`)
      console.log(`  총 SAN 손실: ${Math.abs(totalSanLoss)}`)
      console.log(`  관찰된 플래그: ${Object.entries(flagCounts).map(([k, v]) => `${k}(${v})`).join(', ') || '없음'}`)

      // Print inner thoughts with high san loss
      const notable = obs.filter(o => o.sanChange <= -3 && o.inner)
      if (notable.length > 0) {
        console.log(`  주목할 [내면] 반응:`)
        for (const n of notable.slice(0, 2)) {
          console.log(`    턴 ${n.turnNumber}: ${n.inner?.slice(0, 100)}...`)
        }
      }
      console.log()
    }
  }

  private save(): void {
    if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true })
    const path = join(LOGS_DIR, `${this.scenarioId}-experiment.json`)
    writeFileSync(path, JSON.stringify(this.observations, null, 2), 'utf-8')
  }

  private load(): void {
    const path = join(LOGS_DIR, `${this.scenarioId}-experiment.json`)
    if (existsSync(path)) {
      this.observations = JSON.parse(readFileSync(path, 'utf-8'))
    }
  }
}
