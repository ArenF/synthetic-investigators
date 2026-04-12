import type { CoCCharacter, PlayMode } from '../characters/types.js'
import { ClaudePlayer } from './claude-player.js'
import { GeminiPlayer } from './gemini-player.js'
import { OpenAIPlayer } from './openai-player.js'
import { OllamaPlayer } from './ollama-player.js'
import type { BasePlayer } from './base-player.js'

export function createPlayer(character: CoCCharacter, mode: PlayMode = 'immersion'): BasePlayer {
  switch (character.modelConfig.provider) {
    case 'claude':  return new ClaudePlayer(character, mode)
    case 'gemini':  return new GeminiPlayer(character, mode)
    case 'openai':  return new OpenAIPlayer(character, mode)
    case 'ollama':  return new OllamaPlayer(character, mode)
    default:
      throw new Error(`Unknown provider: ${character.modelConfig.provider}`)
  }
}

export { BasePlayer } from './base-player.js'
export { ClaudePlayer } from './claude-player.js'
export { GeminiPlayer } from './gemini-player.js'
export { OpenAIPlayer } from './openai-player.js'
export { OllamaPlayer } from './ollama-player.js'
