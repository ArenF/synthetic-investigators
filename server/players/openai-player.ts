import OpenAI from 'openai'
import { BasePlayer, type Message } from './base-player.js'
import type { CoCCharacter } from '../characters/types.js'

export class OpenAIPlayer extends BasePlayer {
  private client: OpenAI

  constructor(character: CoCCharacter) {
    super(character)
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.')
    this.client = new OpenAI({ apiKey })
  }

  protected async chat(systemPrompt: string, messages: Message[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.character.modelConfig.model,
      max_tokens: 1024,
      temperature: this.character.modelConfig.temperature ?? 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No content in OpenAI response')
    return content
  }
}
