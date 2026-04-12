import Anthropic from '@anthropic-ai/sdk'
import { BasePlayer, type Message } from './base-player.js'
import type { CoCCharacter, TurnContext, TurnRecord, PlayMode } from '../characters/types.js'
import { buildTurnMessage, parseResponse, buildThinkingTreeSystemSuffix } from '../characters/prompt-generator.js'
import { log } from '../game/dev-logger.js'

export class ClaudePlayer extends BasePlayer {
  private client: Anthropic

  constructor(character: CoCCharacter, mode: PlayMode = 'immersion') {
    super(character, mode)
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  protected async chat(systemPrompt: string, messages: Message[]): Promise<string> {
    const response = await this.client.messages.create({
      model: this.character.modelConfig.model,
      max_tokens: 1024,
      temperature: this.character.modelConfig.temperature ?? 0.7,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })

    const block = response.content[0]
    if (!block || block.type !== 'text') throw new Error('Unexpected response format from Claude')
    return block.text
  }

  /**
   * Extended Thinking으로 사고 트리 구현 — 1회 호출로 내면→시도→행동 내부 추론.
   * 실패 시 base의 3단계 루프로 폴백.
   */
  override async thinkingTakeTurn(ctx: TurnContext): Promise<TurnRecord> {
    const baseMessage = buildTurnMessage(ctx)
    const historySnapshot = this.history.length
    const tag = `CLAUDE:${this.character.name}[THINK]`

    log.ai(tag, `턴 ${ctx.turnNumber} Extended Thinking 시작 — 모델: ${this.character.modelConfig.model}`)
    log.ai(tag, `GM 메시지: ${ctx.gmMessage.slice(0, 120).replace(/\n/g, ' ')}${ctx.gmMessage.length > 120 ? '...' : ''}`)

    const t0 = Date.now()
    let rawResponse = ''

    try {
      // Extended Thinking: temperature 제거 필수, budget_tokens 설정
      const thinkingSystemPrompt = this.systemPrompt + '\n' + buildThinkingTreeSystemSuffix(this.playMode, this.character.modelConfig.provider)

      const response = await (this.client as any).messages.create({
        model: this.character.modelConfig.model,
        max_tokens: 16000,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000,
        },
        system: thinkingSystemPrompt,
        messages: [
          ...this.history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: baseMessage },
        ],
        betas: ['interleaved-thinking-2025-05-14'],
      })

      // 텍스트 블록만 추출 (thinking 블록 제외)
      const textBlocks = (response.content as any[]).filter((b: any) => b.type === 'text')
      rawResponse = textBlocks.map((b: any) => b.text).join('')

      if (!rawResponse.trim()) throw new Error('Extended Thinking 응답 비어있음')

      const elapsed = Date.now() - t0
      log.ok(tag, `Extended Thinking 완료 (${elapsed}ms) — ${rawResponse.length}자`)
      log.ai(tag, `응답 미리보기: ${rawResponse.slice(0, 150).replace(/\n/g, ' ')}${rawResponse.length > 150 ? '...' : ''}`)

    } catch (err: any) {
      const elapsed = Date.now() - t0
      log.warn(tag, `Extended Thinking 실패 (${elapsed}ms): ${err.message} — 3단계 루프로 폴백`)
      // 히스토리 건드리지 않고 부모 구현으로 폴백
      return super.thinkingTakeTurn(ctx)
    }

    // 히스토리 업데이트 (단일 턴으로)
    this.history.push({ role: 'user', content: baseMessage })
    this.history.push({ role: 'assistant', content: rawResponse })

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
}
