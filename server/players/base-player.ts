/**
 * Abstract base class for all AI players.
 * Each provider (Claude, Gemini, OpenAI, Ollama) extends this.
 */

import type { CoCCharacter, TurnContext, TurnRecord, PlayMode } from '../characters/types.js'
import { generateSystemPrompt, buildTurnMessage, parseResponse } from '../characters/prompt-generator.js'
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
