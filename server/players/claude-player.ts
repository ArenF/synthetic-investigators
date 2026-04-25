import Anthropic from '@anthropic-ai/sdk'
import { BasePlayer, type Message } from './base-player.js'
import type { CoCCharacter, PlayMode } from '../characters/types.js'

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
}
