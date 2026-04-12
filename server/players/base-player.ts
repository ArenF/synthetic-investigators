/**
 * Abstract base class for all AI players.
 * Each provider (Claude, Gemini, OpenAI, Ollama) extends this.
 */

import type { CoCCharacter, TurnContext, TurnRecord, PlayMode } from '../characters/types.js'
import {
  generateSystemPrompt, buildTurnMessage, parseResponse,
  buildInnerStageInstruction, buildAttemptStageInstruction, buildActionStageInstruction,
} from '../characters/prompt-generator.js'
import { log } from '../game/dev-logger.js'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export abstract class BasePlayer {
  protected character: CoCCharacter
  protected history: Message[] = []
  protected systemPrompt: string
  protected playMode: PlayMode = 'immersion'

  constructor(character: CoCCharacter, mode: PlayMode = 'immersion') {
    this.character = character
    this.playMode = mode
    this.systemPrompt = generateSystemPrompt(character, mode)
  }

  get id(): string { return this.character.id }
  get name(): string { return this.character.name }
  get model(): string { return this.character.modelConfig.model }
  get provider(): string { return this.character.modelConfig.provider }

  /**
   * Switch play mode — regenerates system prompt immediately.
   * History is preserved so the AI can continue the conversation in the new mode.
   */
  setPlayMode(mode: PlayMode): void {
    this.playMode = mode
    this.systemPrompt = generateSystemPrompt(this.character, mode)
  }

  getPlayMode(): PlayMode {
    return this.playMode
  }

  /**
   * Send a turn message and get the character's response.
   * Maintains conversation history for context.
   */
  async takeTurn(ctx: TurnContext): Promise<TurnRecord> {
    const userMessage = buildTurnMessage(ctx)
    const historySnapshot = this.history.length
    this.history.push({ role: 'user', content: userMessage })

    const tag = `${this.character.modelConfig.provider.toUpperCase()}:${this.character.name}`
    log.ai(tag, `턴 ${ctx.turnNumber} 요청 — 모델: ${this.character.modelConfig.model}, 히스토리: ${this.history.length}개 메시지`)
    log.ai(tag, `GM 메시지: ${ctx.gmMessage.slice(0, 120).replace(/\n/g, ' ')}${ctx.gmMessage.length > 120 ? '...' : ''}`)

    const t0 = Date.now()
    let rawResponse: string
    try {
      rawResponse = await this.chat(this.systemPrompt, this.history)
    } catch (err: any) {
      // API 호출 실패 시 히스토리 롤백 (user 메시지 push 취소)
      this.history.splice(historySnapshot)
      log.error(tag, `AI 호출 실패 (${Date.now() - t0}ms): ${err.message}`)
      throw err
    }
    const elapsed = Date.now() - t0
    log.ok(tag, `응답 수신 (${elapsed}ms) — ${rawResponse.length}자`)
    log.ai(tag, `응답 미리보기: ${rawResponse.slice(0, 150).replace(/\n/g, ' ')}${rawResponse.length > 150 ? '...' : ''}`)
    this.history.push({ role: 'assistant', content: rawResponse })

    // Sliding window: keep only the last 30 messages (15 turns)
    if (this.history.length > 30) {
      this.history = this.history.slice(this.history.length - 30)
    }

    const parsed = parseResponse(rawResponse)
    const s = ctx.sessionState

    return {
      turnNumber: ctx.turnNumber,
      timestamp: new Date().toISOString(),
      characterId: this.character.id,
      characterName: this.character.name,
      modelProvider: this.character.modelConfig.provider,
      modelName: this.character.modelConfig.model,
      gmInput: ctx.gmMessage,
      statsBefore: { hp: s.hp, san: s.san, luck: s.luck },
      statsAfter: { hp: s.hp, san: s.san, luck: s.luck },
      response: { ...parsed, rawText: rawResponse },
    }
  }

  /**
   * 사고 트리 방식으로 턴을 수행.
   * [내면] → [시도] → [행동] 순서로 3번 호출하여 각 단계가 이전 단계를 뿌리로 삼아 깊어짐.
   * ClaudePlayer는 Extended Thinking으로 오버라이드하여 1회 호출로 처리.
   */
  async thinkingTakeTurn(ctx: TurnContext): Promise<TurnRecord> {
    const baseMessage = buildTurnMessage(ctx)
    const historySnapshot = this.history.length
    const tag = `${this.character.modelConfig.provider.toUpperCase()}:${this.character.name}[TREE]`

    log.ai(tag, `턴 ${ctx.turnNumber} 사고 트리 시작 — 모델: ${this.character.modelConfig.model}`)
    log.ai(tag, `GM 메시지: ${ctx.gmMessage.slice(0, 120).replace(/\n/g, ' ')}${ctx.gmMessage.length > 120 ? '...' : ''}`)

    const t0 = Date.now()
    let innerText = ''
    let attemptText = ''
    let actionText = ''

    try {
      const mode = this.playMode
      const innerLabel = mode === 'game' ? 'OOC' : '내면'

      // ── Stage 1: 내면/OOC (감정 + 즉각적 생각) ──
      this.history.push({ role: 'user', content: `${baseMessage}\n\n${buildInnerStageInstruction(mode)}` })
      innerText = await this.chat(this.systemPrompt, this.history)
      this.history.push({ role: 'assistant', content: innerText })
      log.ai(tag, `[${innerLabel}] 완료 (${Date.now() - t0}ms) — ${innerText.length}자`)

      // ── Stage 2: 시도 (상황 직시 + 행동 판단) ──
      this.history.push({ role: 'user', content: buildAttemptStageInstruction(mode) })
      attemptText = await this.chat(this.systemPrompt, this.history)
      this.history.push({ role: 'assistant', content: attemptText })
      log.ai(tag, `[시도] 완료 (${Date.now() - t0}ms) — ${attemptText.length}자`)

      // ── Stage 3: 행동 (실제 행동 + 묘사) ──
      this.history.push({ role: 'user', content: buildActionStageInstruction(mode) })
      actionText = await this.chat(this.systemPrompt, this.history)
      log.ai(tag, `[행동] 완료 (${Date.now() - t0}ms) — ${actionText.length}자`)

    } catch (err: any) {
      // 실패 시 전체 스테이징 히스토리 롤백
      this.history.splice(historySnapshot)
      log.error(tag, `사고 트리 실패 (${Date.now() - t0}ms): ${err.message}`)
      throw err
    }

    // 세 단계 합성 — 최종 응답
    const fullResponse = [innerText, attemptText, actionText].filter(Boolean).join('\n')
    log.ok(tag, `사고 트리 완료 (${Date.now() - t0}ms) — 총 ${fullResponse.length}자`)
    log.ai(tag, `응답 미리보기: ${fullResponse.slice(0, 150).replace(/\n/g, ' ')}${fullResponse.length > 150 ? '...' : ''}`)

    // 히스토리 정리: 스테이징 메시지를 단일 턴으로 교체
    // (다음 턴에서 모델이 중간 단계 프롬프트를 보지 않도록)
    this.history.splice(historySnapshot)
    this.history.push({ role: 'user', content: baseMessage })
    this.history.push({ role: 'assistant', content: fullResponse })

    // 슬라이딩 윈도우 (30개 = 15턴)
    if (this.history.length > 30) {
      this.history = this.history.slice(this.history.length - 30)
    }

    const parsed = parseResponse(fullResponse)
    const s = ctx.sessionState

    return {
      turnNumber: ctx.turnNumber,
      timestamp: new Date().toISOString(),
      characterId: this.character.id,
      characterName: this.character.name,
      modelProvider: this.character.modelConfig.provider,
      modelName: this.character.modelConfig.model,
      gmInput: ctx.gmMessage,
      statsBefore: { hp: s.hp, san: s.san, luck: s.luck },
      statsAfter: { hp: s.hp, san: s.san, luck: s.luck },
      response: { ...parsed, rawText: fullResponse },
    }
  }

  /**
   * Inject the opening briefing as the first user message.
   * Only injects minimal scenario context — no NPC/item spoilers.
   */
  injectOpeningBriefing(briefing: string): void {
    const context = `[시나리오 시작]\n${briefing}\n\n이 상황에서 당신의 캐릭터로서 행동을 시작하세요.`
    this.history.push({ role: 'user', content: context })
    this.history.push({ role: 'assistant', content: '네, 상황을 파악했습니다. 준비됐습니다.' })
  }

  /**
   * Reset conversation history (e.g. new scenario)
   */
  resetHistory(): void {
    this.history = []
  }

  /**
   * Get a summary of recent history for cross-character visibility
   */
  getRecentHistory(n = 3): Message[] {
    return this.history.slice(-n * 2)
  }

  /**
   * Provider-specific chat implementation
   */
  protected abstract chat(systemPrompt: string, messages: Message[]): Promise<string>
}
