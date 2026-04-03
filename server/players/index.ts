import type { CoCCharacter } from '../characters/types.js'
import { ClaudePlayer } from './claude-player.js'
import { GeminiPlayer } from './gemini-player.js'
import { OpenAIPlayer } from './openai-player.js'
import { OllamaPlayer } from './ollama-player.js'
import type { BasePlayer } from './base-player.js'

export function createPlayer(character: CoCCharacter): BasePlayer {
  switch (character.modelConfig.provider) {
    case 'claude':  return new ClaudePlayer(character)
    case 'gemini':  return new GeminiPlayer(character)
    case 'openai':  return new OpenAIPlayer(character)
    case 'ollama':  return new OllamaPlayer(character)
    default:
      throw new Error(`Unknown provider: ${character.modelConfig.provider}`)
  }
}

export { BasePlayer } from './base-player.js'
export { ClaudePlayer } from './claude-player.js'
export { GeminiPlayer } from './gemini-player.js'
export { OpenAIPlayer } from './openai-player.js'
export { OllamaPlayer } from './ollama-player.js'
