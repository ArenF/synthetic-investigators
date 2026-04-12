import { Ollama } from 'ollama'
import { BasePlayer, type Message } from './base-player.js'
import type { CoCCharacter, PlayMode } from '../characters/types.js'
import { log } from '../game/dev-logger.js'

export class OllamaPlayer extends BasePlayer {
  private client: Ollama
  private host: string

  constructor(character: CoCCharacter, mode: PlayMode = 'immersion') {
    super(character, mode)
    this.host = process.env.OLLAMA_HOST ?? 'http://localhost:11434'
    this.client = new Ollama({ host: this.host })
    log.info('OLLAMA', `플레이어 생성 — ${character.name}, 모델: ${character.modelConfig.model}, 호스트: ${this.host}`)
  }

  protected async chat(systemPrompt: string, messages: Message[]): Promise<string> {
    const model = this.character.modelConfig.model
    log.ai('OLLAMA', `chat 요청 — 모델: ${model}, 메시지 수: ${messages.length + 1} (system 포함)`)

    try {
      const response = await this.client.chat({
        model,
        options: {
          temperature: this.character.modelConfig.temperature ?? 0.7,
          num_predict: 1024,
        },
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      })

      const content = response.message?.content
      if (!content) throw new Error(`Ollama 응답에 content 없음 (model: ${model})`)
      log.ok('OLLAMA', `응답 수신 — ${content.length}자`)
      return content
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
        log.error('OLLAMA', `연결 거부됨 (${this.host}) — ollama serve 가 실행 중인지 확인하세요`)
      } else if (err.message?.includes('model') && err.message?.includes('not found')) {
        log.error('OLLAMA', `모델 "${model}" 을 찾을 수 없습니다 — ollama pull ${model} 로 다운로드하세요`)
      } else {
        log.error('OLLAMA', `알 수 없는 오류: ${err.message}`)
      }
      throw err
    }
  }
}
