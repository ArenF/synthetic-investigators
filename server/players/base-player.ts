/**
 * Abstract base class for all AI players.
 * Each provider (Claude, Gemini, OpenAI, Ollama) extends this.
 */

import type { CoCCharacter, TurnContext, TurnRecord } from '../characters/types.js'
import { generateSystemPrompt, buildTurnMessage, parseResponse } from '../characters/prompt-generator.js'
import { rollDice } from '../game/dice.js'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export abstract class BasePlayer {
  protected character: CoCCharacter
  protected history: Message[] = []
  protected systemPrompt: string

  constructor(character: CoCCharacter) {
    this.character = character
    this.systemPrompt = generateSystemPrompt(character)
  }

  get id(): string { return this.character.id }
  get name(): string { return this.character.name }
  get model(): string { return this.character.modelConfig.model }
  get provider(): string { return this.character.modelConfig.provider }

  /**
   * Send a turn message and get the character's response.
   * Maintains conversation history for context.
   */
  async takeTurn(ctx: TurnContext): Promise<TurnRecord> {
    const userMessage = buildTurnMessage(ctx)
    this.history.push({ role: 'user', content: userMessage })

    const rawResponse = await this.chat(this.systemPrompt, this.history)
    this.history.push({ role: 'assistant', content: rawResponse })

    // Sliding window: keep only the last 30 messages (15 turns) to prevent unbounded growth
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
      statsAfter: { hp: s.hp, san: s.san, luck: s.luck }, // updated by GM
      response: { ...parsed, rawText: rawResponse },
    }
  }

  /**
   * Inject the opening briefing as the first user message.
   * Call this after session creation so the AI knows the scenario context.
   */
  injectOpeningBriefing(briefing: string, npcs: { name: string; description: string }[], items: { name: string; location: string; description: string }[]): void {
    let context = `[시나리오 브리핑]\n${briefing}`
    if (npcs.length > 0) {
      context += '\n\n[등장 NPC]\n' + npcs.map(n => `  ${n.name}: ${n.description}`).join('\n')
    }
    if (items.length > 0) {
      context += '\n\n[주요 단서/물품]\n' + items.map(i => `  ${i.name} (위치: ${i.location}) — ${i.description}`).join('\n')
    }
    context += '\n\n이 상황을 인지하고, 당신의 캐릭터로서 행동을 시작하세요.'
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
