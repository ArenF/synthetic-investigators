import { GoogleGenerativeAI } from '@google/generative-ai'
import { BasePlayer, type Message } from './base-player.js'
import type { CoCCharacter } from '../characters/types.js'

export class GeminiPlayer extends BasePlayer {
  private client: GoogleGenerativeAI

  constructor(character: CoCCharacter) {
    super(character)
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '')
  }

  protected async chat(systemPrompt: string, messages: Message[]): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.character.modelConfig.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: this.character.modelConfig.temperature ?? 0.7,
        maxOutputTokens: 1024,
      },
    })

    // Fix: include ALL messages in history (not slice(0, -1))
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })
    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)

    return result.response.text()
  }
}
