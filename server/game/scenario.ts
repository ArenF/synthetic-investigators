/**
 * Scenario session management — saves/loads session history as JSON.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { join } from 'path'
import type { ScenarioSession, TurnRecord } from '../characters/types.js'

const SCENARIOS_DIR = './scenarios'
const LOGS_DIR = './logs'

export class ScenarioManager {
  private session: ScenarioSession

  constructor(scenarioId: string, scenarioName: string, characterIds: string[]) {
    const existing = this.load(scenarioId)
    if (existing) {
      this.session = existing
      console.log(`기존 세션 로드됨: ${scenarioName} (턴 ${existing.turns.length}개)`)
    } else {
      this.session = {
        scenarioId,
        scenarioName,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        characters: characterIds,
        turns: [],
      }
      console.log(`새 세션 시작: ${scenarioName}`)
    }
  }

  get turnCount(): number { return this.session.turns.length }
  get scenarioId(): string { return this.session.scenarioId }
  get scenarioName(): string { return this.session.scenarioName }
  get session_(): ScenarioSession { return this.session }

  /** Add a completed turn record */
  addTurn(record: TurnRecord): void {
    this.session.turns.push(record)
    this.session.lastUpdatedAt = new Date().toISOString()
    this.save()
    this.appendLog(record)
  }

  /** Get visible history for a specific character */
  getCharacterHistory(charId: string, limit = 5): TurnRecord[] {
    return this.session.turns
      .filter(t => t.characterId === charId)
      .slice(-limit)
  }

  /** Get recent turns across all characters (for GM overview) */
  getRecentTurns(limit = 10): TurnRecord[] {
    return this.session.turns.slice(-limit)
  }

  /** Save scenario to JSON */
  save(): void {
    if (!existsSync(SCENARIOS_DIR)) mkdirSync(SCENARIOS_DIR, { recursive: true })
    const path = join(SCENARIOS_DIR, `${this.session.scenarioId}.json`)
    writeFileSync(path, JSON.stringify(this.session, null, 2), 'utf-8')
  }

  /** Load scenario from JSON if exists */
  private load(scenarioId: string): ScenarioSession | null {
    const path = join(SCENARIOS_DIR, `${scenarioId}.json`)
    if (!existsSync(path)) return null
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf-8'))
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.turns)) {
        console.error(`시나리오 파일 구조 손상: ${path} — 새 세션으로 시작`)
        return null
      }
      return parsed as ScenarioSession
    } catch {
      console.error(`시나리오 파일 파싱 실패: ${path} — 새 세션으로 시작`)
      return null
    }
  }

  /** Append to a human-readable log file */
  private appendLog(record: TurnRecord): void {
    if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true })
    const path = join(LOGS_DIR, `${this.session.scenarioId}.log`)
    const line = [
      `\n━━━ 턴 ${record.turnNumber} | ${record.characterName} (${record.modelName}) ━━━`,
      `GM: ${record.gmInput}`,
      `[행동] ${record.response.action}`,
      record.response.inner ? `[내면] ${record.response.inner}` : null,
      `HP: ${record.statsBefore.hp}→${record.statsAfter.hp} | SAN: ${record.statsBefore.san}→${record.statsAfter.san}`,
      `시각: ${record.timestamp}`,
    ].filter(Boolean).join('\n')

    appendFileSync(path, line + '\n', 'utf-8')
  }

}
