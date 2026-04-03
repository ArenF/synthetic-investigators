/**
 * Synthetic Investigators — Express + WebSocket API server
 * Port: 3001
 */

import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { CoCCharacter, TurnContext, TurnRecord } from './characters/types.js'
import { createPlayer, type BasePlayer } from './players/index.js'
import { GameState } from './game/state.js'
import { ScenarioManager } from './game/scenario.js'
import { ExperimentLogger } from './game/logger.js'
import { skillCheck, outcomeLabel, d100 } from './game/dice.js'
import { generateSystemPrompt, buildTurnMessage, parseResponse } from './characters/prompt-generator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface CharacterState {
  id: string
  name: string
  hp: number
  hpMax: number
  san: number
  sanMax: number
  mp: number
  mpMax: number
  luck: number
  provider: string
  model: string
  temporaryInsanity: boolean
  indefiniteInsanity: boolean
}

export interface NPC {
  id: string
  name: string
  description: string
  traits: string[]
}

export interface SessionSetupData {
  sessionName: string
  characterIds: string[]
  npcs: NPC[]
  items: { name: string; location: string; description: string }[]
  openingBriefing: string
}

export interface GameSession {
  id: string
  name: string
  characters: Map<string, CoCCharacter>
  players: Map<string, BasePlayer>
  state: GameState
  scenario: ScenarioManager
  logger: ExperimentLogger
  turnNumber: number
  npcs: NPC[]
  items: { name: string; location: string; description: string }[]
  openingBriefing: string
  turnOrder: string[]
  chatLog: ChatMessage[]
  clients: Set<WebSocket>
}

export interface ChatMessage {
  id: string
  type: 'gm_scene' | 'ai_response' | 'npc_speech' | 'dice_result' | 'system'
  targetLabel?: string
  charId?: string
  charName?: string
  npcName?: string
  text: string
  timestamp: string
  done?: boolean
  diceData?: {
    skill: string
    difficulty: string
    roll: number
    target: number
    outcome: string
    resultText: string
  }
}

// ─────────────────────────────────────────
// In-Memory Session Store
// ─────────────────────────────────────────

const sessions = new Map<string, GameSession>()

// ─────────────────────────────────────────
// Helper: load character JSON
// ─────────────────────────────────────────

function loadCharacter(id: string): CoCCharacter {
  const paths = [
    join(ROOT, 'characters', `${id}.json`),
    join(ROOT, 'src', 'characters', 'templates', `${id}.json`),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf-8')) as CoCCharacter
      } catch {
        throw new Error(`Failed to parse character file: ${p}`)
      }
    }
  }
  throw new Error(`Character file not found for: ${id}`)
}

// ─────────────────────────────────────────
// Helper: broadcast to all clients in session
// ─────────────────────────────────────────

function broadcast(session: GameSession, msg: object): void {
  const data = JSON.stringify(msg)
  for (const client of session.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

// ─────────────────────────────────────────
// Helper: get character states
// ─────────────────────────────────────────

function getCharacterStates(session: GameSession): CharacterState[] {
  const states: CharacterState[] = []
  for (const [id, char] of session.characters) {
    const s = session.state.getState(id)
    states.push({
      id,
      name: char.name,
      hp: s.hp,
      hpMax: char.derived.hp.max,
      san: s.san,
      sanMax: char.derived.san.starting,
      mp: s.mp,
      mpMax: char.derived.mp.max,
      luck: s.luck,
      provider: char.modelConfig.provider,
      model: char.modelConfig.model,
      temporaryInsanity: s.temporaryInsanity,
      indefiniteInsanity: s.indefiniteInsanity,
    })
  }
  return states
}

// ─────────────────────────────────────────
// Create new session from setup data
// ─────────────────────────────────────────

function createSession(sessionId: string, setup: SessionSetupData): GameSession {
  const characters = new Map<string, CoCCharacter>()
  const players = new Map<string, BasePlayer>()
  const state = new GameState()

  for (const charId of setup.characterIds) {
    const char = loadCharacter(charId)
    characters.set(char.id, char)
    players.set(char.id, createPlayer(char))
    state.addCharacter(char)
  }

  const scenario = new ScenarioManager(
    sessionId,
    setup.sessionName,
    setup.characterIds,
  )
  const logger = new ExperimentLogger(sessionId)

  const session: GameSession = {
    id: sessionId,
    name: setup.sessionName,
    characters,
    players,
    state,
    scenario,
    logger,
    turnNumber: scenario.turnCount + 1,
    npcs: setup.npcs,
    items: setup.items,
    openingBriefing: setup.openingBriefing,
    turnOrder: setup.characterIds,
    chatLog: [],
    clients: new Set(),
  }

  sessions.set(sessionId, session)
  return session
}

// ─────────────────────────────────────────
// Resume session from saved scenario
// ─────────────────────────────────────────

function resumeSession(sessionId: string): GameSession | null {
  const path = join(ROOT, 'scenarios', `${sessionId}.json`)
  if (!existsSync(path)) return null

  let saved: any
  try {
    saved = JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    console.error(`Failed to parse session file: ${path}`)
    return null
  }
  const characterIds: string[] = saved.characters ?? []

  const setup: SessionSetupData = {
    sessionName: saved.scenarioName ?? sessionId,
    characterIds,
    npcs: saved.npcs ?? [],
    items: saved.items ?? [],
    openingBriefing: saved.openingBriefing ?? '',
  }

  return createSession(sessionId, setup)
}

// ─────────────────────────────────────────
// Run turn: send GM message to AIs sequentially
// ─────────────────────────────────────────

async function runTurn(
  session: GameSession,
  gmText: string,
  targetLabel: string,
  targetIds: string[],
  previousResponses: { charName: string; text: string }[],
): Promise<void> {
  const { players, state, scenario, logger } = session

  // Build accumulated context from previous AI responses in this turn
  let accumulatedContext = gmText
  if (previousResponses.length > 0) {
    accumulatedContext += '\n\n[이번 턴 다른 탐사자들의 행동]\n'
    for (const prev of previousResponses) {
      accumulatedContext += `\n${prev.charName}: ${prev.text}`
    }
  }

  for (const charId of targetIds) {
    const player = players.get(charId)
    if (!player) continue

    const char = session.characters.get(charId)
    if (!char) throw new Error(`Character ${charId} not found in session`)
    const sessionState = state.getState(charId)
    const history = scenario.getCharacterHistory(charId, 3)

    const ctx: TurnContext = {
      character: char,
      sessionState,
      scenarioId: scenario.scenarioId,
      turnNumber: session.turnNumber,
      gmMessage: accumulatedContext,
      visibleHistory: history,
    }

    // Notify clients that this character is responding
    broadcast(session, {
      type: 'ai_response',
      charId,
      charName: char.name,
      text: '',
      done: false,
    })

    const record = await player.takeTurn(ctx)
    const responseText = record.response.rawText

    // Send complete response
    broadcast(session, {
      type: 'ai_response',
      charId,
      charName: char.name,
      text: responseText,
      done: true,
    })

    // Add to accumulated context for next AI
    previousResponses.push({ charName: char.name, text: record.response.action })
    accumulatedContext = gmText + '\n\n[이번 턴 다른 탐사자들의 행동]\n'
    for (const prev of previousResponses) {
      accumulatedContext += `\n${prev.charName}: ${prev.text}`
    }

    // Save turn record
    scenario.addTurn(record)
    logger.record(record)

    // Add to chat log
    const chatMsg: ChatMessage = {
      id: `${Date.now()}-${charId}`,
      type: 'ai_response',
      targetLabel,
      charId,
      charName: char.name,
      text: responseText,
      timestamp: new Date().toISOString(),
      done: true,
    }
    session.chatLog.push(chatMsg)
  }

  session.turnNumber++

  // Send updated character states
  broadcast(session, {
    type: 'state_update',
    characters: getCharacterStates(session),
  })

  broadcast(session, { type: 'turn_complete' })
}

// ─────────────────────────────────────────
// Express App
// ─────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json())

// Serve static client in production
const clientDist = join(ROOT, 'client', 'dist')
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
}

// ─── Sessions ───

app.get('/api/sessions', (_req, res) => {
  const scenariosDir = join(ROOT, 'scenarios')
  if (!existsSync(scenariosDir)) {
    res.json([])
    return
  }
  const files = readdirSync(scenariosDir).filter(f => f.endsWith('.json'))
  const sessions = files.map(f => {
    try {
      const data = JSON.parse(readFileSync(join(scenariosDir, f), 'utf-8'))
      return {
        id: data.scenarioId,
        name: data.scenarioName,
        characters: data.characters,
        startedAt: data.startedAt,
        lastUpdatedAt: data.lastUpdatedAt,
        turnCount: data.turns?.length ?? 0,
      }
    } catch {
      return null
    }
  }).filter(Boolean)
  res.json(sessions)
})

app.post('/api/sessions', (req, res) => {
  try {
    const setup: SessionSetupData = req.body
    const sessionId = `session-${Date.now()}`
    const session = createSession(sessionId, setup)
    res.json({ sessionId, name: session.name })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/sessions/:id', (req, res) => {
  const { id } = req.params
  const scenarioPath = join(ROOT, 'scenarios', `${id}.json`)
  if (!existsSync(scenarioPath)) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  try {
    const data = JSON.parse(readFileSync(scenarioPath, 'utf-8'))
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to parse session data' })
  }
})

// ─── Characters ───

app.get('/api/characters', (_req, res) => {
  const charsDir = join(ROOT, 'characters')
  if (!existsSync(charsDir)) {
    res.json([])
    return
  }
  const files = readdirSync(charsDir).filter(f => f.endsWith('.json'))
  const chars = files.map(f => {
    try {
      const data = JSON.parse(readFileSync(join(charsDir, f), 'utf-8'))
      return {
        id: data.id,
        name: data.name,
        occupation: data.occupation,
        age: data.age,
        gender: data.gender,
        provider: data.modelConfig?.provider,
        model: data.modelConfig?.model,
      }
    } catch {
      return null
    }
  }).filter(Boolean)
  res.json(chars)
})

app.post('/api/characters', (req, res) => {
  try {
    const char: CoCCharacter = req.body
    const charsDir = join(ROOT, 'characters')
    if (!existsSync(charsDir)) mkdirSync(charsDir, { recursive: true })
    const path = join(charsDir, `${char.id}.json`)
    writeFileSync(path, JSON.stringify(char, null, 2), 'utf-8')
    res.json({ success: true, id: char.id })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/characters/:id', (req, res) => {
  const { id } = req.params
  const paths = [
    join(ROOT, 'characters', `${id}.json`),
    join(ROOT, 'src', 'characters', 'templates', `${id}.json`),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        res.json(JSON.parse(readFileSync(p, 'utf-8')))
      } catch {
        res.status(500).json({ error: 'Failed to parse character data' })
      }
      return
    }
  }
  res.status(404).json({ error: 'Character not found' })
})

// SPA fallback
app.get('*', (_req, res) => {
  const indexPath = join(ROOT, 'client', 'dist', 'index.html')
  if (existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.json({ status: 'API server running. Start the client dev server separately.' })
  }
})

// ─────────────────────────────────────────
// HTTP + WebSocket Server
// ─────────────────────────────────────────

const server = createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  // Extract sessionId from query param: ws://host:3001?sessionId=xxx
  const url = new URL(req.url ?? '/', `http://localhost`)
  const sessionId = url.searchParams.get('sessionId')

  let currentSession: GameSession | null = null

  if (sessionId) {
    // Attach to existing session or create a placeholder
    currentSession = sessions.get(sessionId) ?? null
    if (currentSession) {
      currentSession.clients.add(ws)
      // Send current state
      ws.send(JSON.stringify({
        type: 'state_update',
        characters: getCharacterStates(currentSession),
      }))
      // Send chat history
      ws.send(JSON.stringify({
        type: 'chat_history',
        messages: currentSession.chatLog,
      }))
    }
  }

  ws.on('message', async (raw) => {
    let msg: any
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      return
    }

    switch (msg.type) {
      case 'join_session': {
        const sid: string = msg.sessionId
        let sess = sessions.get(sid)
        if (!sess) {
          // Try to resume from disk
          const resumed = resumeSession(sid)
          if (resumed) sess = resumed
        }
        if (sess) {
          if (currentSession) currentSession.clients.delete(ws)
          currentSession = sess
          sess.clients.add(ws)
          ws.send(JSON.stringify({
            type: 'state_update',
            characters: getCharacterStates(sess),
          }))
          ws.send(JSON.stringify({
            type: 'chat_history',
            messages: sess.chatLog,
          }))
        } else {
          ws.send(JSON.stringify({ type: 'error', message: `Session not found: ${sid}` }))
        }
        break
      }

      case 'start_session': {
        const setup: SessionSetupData = msg.setup
        const sid: string = msg.sessionId
        const sess = createSession(sid, setup)
        if (currentSession) currentSession.clients.delete(ws)
        currentSession = sess
        sess.clients.add(ws)

        // Send opening briefing as system message if provided
        if (setup.openingBriefing) {
          const sysMsg: ChatMessage = {
            id: `opening-${Date.now()}`,
            type: 'system',
            text: setup.openingBriefing,
            timestamp: new Date().toISOString(),
          }
          sess.chatLog.push(sysMsg)
          broadcast(sess, { type: 'system_message', message: sysMsg })
        }

        broadcast(sess, {
          type: 'state_update',
          characters: getCharacterStates(sess),
        })
        ws.send(JSON.stringify({ type: 'session_started', sessionId: sid }))
        break
      }

      case 'send_turn': {
        if (!currentSession) {
          ws.send(JSON.stringify({ type: 'error', message: 'No active session' }))
          break
        }
        const { gmText, targetLabel, targetIds } = msg
        const sess = currentSession

        // Add GM message to chat log
        const gmMsg: ChatMessage = {
          id: `gm-${Date.now()}`,
          type: 'gm_scene',
          targetLabel,
          text: gmText,
          timestamp: new Date().toISOString(),
        }
        sess.chatLog.push(gmMsg)
        broadcast(sess, { type: 'gm_message', message: gmMsg })

        // Run AI turns sequentially
        try {
          const targets = (targetIds && targetIds.length > 0)
            ? targetIds
            : sess.turnOrder
          await runTurn(sess, gmText, targetLabel ?? '', targets, [])
        } catch (err: any) {
          broadcast(sess, { type: 'error', message: err.message })
        }
        break
      }

      case 'set_order': {
        if (!currentSession) break
        currentSession.turnOrder = msg.order
        broadcast(currentSession, { type: 'order_updated', order: msg.order })
        break
      }

      case 'adjust_stat': {
        if (!currentSession) break
        const { charId, stat, delta } = msg
        const sess = currentSession
        if (stat === 'hp') {
          if (delta < 0) sess.state.applyDamage(charId, Math.abs(delta))
          else sess.state.restoreHp(charId, delta)
        } else if (stat === 'san') {
          if (delta < 0) sess.state.applySanLoss(charId, Math.abs(delta))
          else sess.state.restoreSan(charId, delta)
        }
        broadcast(sess, {
          type: 'state_update',
          characters: getCharacterStates(sess),
        })
        break
      }

      case 'dice_roll': {
        if (!currentSession) break
        const { charId, skill, difficulty } = msg
        const sess = currentSession
        const char = sess.characters.get(charId)
        if (!char) break

        const baseVal = char.skills[skill] ?? 0
        let target = baseVal
        if (difficulty === 'hard') target = Math.floor(baseVal / 2)
        if (difficulty === 'extreme') target = Math.floor(baseVal / 5)

        const roll = d100()
        let outcome: string
        if (roll >= 96) outcome = 'fumble'
        else if (roll <= Math.floor(target / 5)) outcome = 'extreme_success'
        else if (roll <= Math.floor(target / 2)) outcome = 'hard_success'
        else if (roll <= target) outcome = 'regular_success'
        else outcome = 'failure'

        const resultData = {
          type: 'dice_result',
          charId,
          charName: char.name,
          skill,
          difficulty,
          roll,
          target,
          outcome,
          resultText: msg.successText && outcome !== 'failure' && outcome !== 'fumble'
            ? msg.successText
            : msg.failureText ?? '',
        }
        broadcast(sess, resultData)

        // Add to chat log
        const diceMsg: ChatMessage = {
          id: `dice-${Date.now()}`,
          type: 'dice_result',
          charId,
          charName: char.name,
          text: `${char.name} — ${skill} 판정 (목표: ${target}) → ${roll} = ${outcome}`,
          timestamp: new Date().toISOString(),
          diceData: {
            skill,
            difficulty,
            roll,
            target,
            outcome,
            resultText: resultData.resultText,
          },
        }
        sess.chatLog.push(diceMsg)
        break
      }

      case 'npc_speak': {
        if (!currentSession) break
        const { npcName, text } = msg
        const sess = currentSession
        const npcMsg: ChatMessage = {
          id: `npc-${Date.now()}`,
          type: 'npc_speech',
          npcName,
          text,
          timestamp: new Date().toISOString(),
        }
        sess.chatLog.push(npcMsg)
        broadcast(sess, { type: 'npc_message', message: npcMsg })
        break
      }

      case 'resume_session': {
        const { sessionId: sid } = msg
        let sess = sessions.get(sid)
        if (!sess) {
          const resumed = resumeSession(sid)
          if (resumed) sess = resumed
        }
        if (sess) {
          if (currentSession) currentSession.clients.delete(ws)
          currentSession = sess
          sess.clients.add(ws)
          ws.send(JSON.stringify({
            type: 'state_update',
            characters: getCharacterStates(sess),
          }))
          ws.send(JSON.stringify({
            type: 'chat_history',
            messages: sess.chatLog,
          }))
          ws.send(JSON.stringify({ type: 'session_resumed', sessionId: sid }))
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }))
        }
        break
      }

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
    }
  })

  ws.on('close', () => {
    if (currentSession) currentSession.clients.delete(ws)
  })
})

const PORT = process.env.PORT ?? 3001
server.listen(PORT, () => {
  console.log(`Synthetic Investigators server running on http://localhost:${PORT}`)
})
