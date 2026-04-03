import { Ollama } from 'ollama'
import { BasePlayer, type Message } from './base-player.js'
import type { CoCCharacter } from '../characters/types.js'

export class OllamaPlayer extends BasePlayer {
  private client: Ollama

  constructor(character: CoCCharacter) {
    super(character)
    this.client = new Ollama({
      host: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    })
  }

  protected async chat(systemPrompt: string, messages: Message[]): Promise<string> {
    const response = await this.client.chat({
      model: this.character.modelConfig.model,
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
    if (!content) throw new Error('No content in Ollama response')
    return content
  }
}
