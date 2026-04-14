import { GoogleGenerativeAI } from '@google/generative-ai'
import { BasePlayer, type Message } from './base-player.js'
import type { CoCCharacter, TurnContext, TurnRecord, PlayMode } from '../characters/types.js'
import { buildTurnMessage, parseResponse, buildThinkingTreeSystemSuffix } from '../characters/prompt-generator.js'
import { log } from '../game/dev-logger.js'

export class GeminiPlayer extends BasePlayer {
  private client: GoogleGenerativeAI

  constructor(character: CoCCharacter, mode: PlayMode = 'immersion') {
    super(character, mode)
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '')
  }

  protected async chat(systemPrompt: string, messages: Message[]): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.character.modelConfig.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: this.character.modelConfig.temperature ?? 0.7,
        maxOutputTokens: 4096,
      },
    })

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })
    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)

    return result.response.text()
  }

  /**
   * Gemini Extended Thinking 전용 사고 트리 — 1회 호출로 내면→시도→행동 내부 추론.
   * modelConfig.extendedThinking이 false면 base의 3단계 루프로 위임.
   * 실패 시 base의 3단계 루프로 폴백.
   */
  override async thinkingTakeTurn(ctx: TurnContext): Promise<TurnRecord> {
    if (!this.character.modelConfig.extendedThinking) {
      return super.thinkingTakeTurn(ctx)
    }

    const baseMessage = buildTurnMessage(ctx)
    const historySnapshot = this.history.length
    const tag = `GEMINI:${this.character.name}[THINK]`

    log.ai(tag, `턴 ${ctx.turnNumber} Thinking 시작 — 모델: ${this.character.modelConfig.model}`)
    log.ai(tag, `GM 메시지: ${ctx.gmMessage.slice(0, 120).replace(/\n/g, ' ')}${ctx.gmMessage.length > 120 ? '...' : ''}`)

    const t0 = Date.now()
    let rawResponse = ''

    try {
      const thinkingSystemPrompt = this.systemPrompt + '\n' + buildThinkingTreeSystemSuffix(this.playMode, this.character.modelConfig.provider)

      const model = this.client.getGenerativeModel({
        model: this.character.modelConfig.model,
        systemInstruction: thinkingSystemPrompt,
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 8192,
          // @ts-expect-error thinkingConfig는 최신 SDK에서 지원
          thinkingConfig: { thinkingBudget: 8000 },
        },
      })

      const history = this.history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const chat = model.startChat({ history })
      const result = await chat.sendMessage(baseMessage)

      // thought: true 파트 제외, 텍스트 파트만 추출
      const parts = result.response.candidates?.[0]?.content?.parts ?? []
      rawResponse = parts
        .filter((p: any) => !p.thought && p.text)
        .map((p: any) => p.text as string)
        .join('')

      // thought 파트 없이 일반 텍스트로 응답한 경우 폴백
      if (!rawResponse.trim()) {
        rawResponse = result.response.text()
      }

      if (!rawResponse.trim()) throw new Error('Thinking 응답 비어있음')

      const elapsed = Date.now() - t0
      log.ok(tag, `Thinking 완료 (${elapsed}ms) — ${rawResponse.length}자`)
      log.ai(tag, `응답 미리보기: ${rawResponse.slice(0, 150).replace(/\n/g, ' ')}${rawResponse.length > 150 ? '...' : ''}`)

    } catch (err: any) {
      const elapsed = Date.now() - t0
      log.warn(tag, `Thinking 실패 (${elapsed}ms): ${err.message} — 3단계 루프로 폴백`)
      this.history.splice(historySnapshot)
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
