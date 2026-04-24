/**
 * Synthetic Investigators — Express + WebSocket API server
 * Port: 3001
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { CoCCharacter, TurnContext, PlayMode, CoCharacter } from './characters/types.js'
import { createPlayer, type BasePlayer } from './players/index.js'
import { GameState } from './game/state.js'
import { ScenarioManager } from './game/scenario.js'
import { ExperimentLogger } from './game/logger.js'
import { rollJudgment, resolveJudgment, performSanCheck } from './game/judgment.js'
import type { JudgmentOutcomes, PendingJudgment, JudgmentRequest, JudgmentResolution } from './characters/types.js'
import { buildContextMessages } from './game/context.js'
import { log, logApiKeyStatus, testOllamaConnection } from './game/dev-logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface CharacterState {
  id: string
  name: string
  age: number
  occupation: string
  residence: string
  equipment: string[]   // equipment.items 리스트
  skills: Record<string, number>  // 기술명 → 현재 기술값 (0 포함)
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
  playMode?: PlayMode
}

export interface QueuedTurn {
  gmText: string
  targetLabel: string
  targetIds: string[]
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
  isProcessing: boolean
  turnQueue: QueuedTurn[]
  pendingStatsBefore: Map<string, { hp: number; san: number; luck: number }> | null
  pendingDiceResults: { charId: string; charName: string; skill: string; outcome: string; resultText: string }[]
  pendingJudgment: PendingJudgment | null
  playMode: PlayMode
}

export interface ChatMessage {
  id: string
  type: 'gm_scene' | 'ai_response' | 'npc_speech' | 'dice_result' | 'system'
  targetLabel?: string
  charId?: string
  charName?: string
  npcName?: string
  text: string
  innerText?: string   // Stage 1 — 심리/OOC (서버 내부 처리 후 구조화 전송)
  actionText?: string  // Stage 2 — 행동 (프론트 표시용)
  playMode?: string    // 메시지 생성 시점의 모드 (내면/OOC 레이블 결정)
  timestamp: string
  done?: boolean
  diceData?: {
    skill: string
    difficulty: string
    roll: number
    target: number
    outcome: string
    resultText: string
    wasPush?: boolean
    wasLuckSpend?: boolean
    luckSpent?: number
    tensDice?: number[]
  }
}

// ─────────────────────────────────────────
// In-Memory Session Store
// ─────────────────────────────────────────

const sessions = new Map<string, GameSession>()

// ─────────────────────────────────────────
// Helper: timeout wrapper for AI turns
// ─────────────────────────────────────────

// 타임아웃 없음 — 사고 트리 추론에 소요되는 시간은 문제 없음

// ─────────────────────────────────────────
// Helper: load character JSON
// ─────────────────────────────────────────

function loadCharacter(id: string): CoCCharacter {
  const charPath = join(ROOT, 'characters', `${id}.json`)
  if (existsSync(charPath)) {
    try {
      return JSON.parse(readFileSync(charPath, 'utf-8')) as CoCCharacter
    } catch {
      throw new Error(`Failed to parse character file: ${charPath}`)
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
      age: char.age,
      occupation: char.occupation,
      residence: char.residence,
      equipment: s.currentItems.map(i => i.name),
      skills: Object.fromEntries(
        Object.entries(char.skills).filter(([, v]) => v !== undefined) as [string, number][]
      ),
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
// Helper: capture stat snapshot for all characters
// ─────────────────────────────────────────

function captureStatSnapshot(session: GameSession, charIds: string[]): Map<string, { hp: number; san: number; luck: number }> {
  const snapshot = new Map<string, { hp: number; san: number; luck: number }>()
  for (const charId of charIds) {
    const s = session.state.getState(charId)
    snapshot.set(charId, { hp: s.hp, san: s.san, luck: s.luck })
  }
  return snapshot
}

// ─────────────────────────────────────────
// Helper: save session to disk
// ─────────────────────────────────────────

function saveSession(session: GameSession): void {
  session.scenario.save()
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
    players.set(char.id, createPlayer(char, setup.playMode ?? 'game'))
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
    isProcessing: false,
    turnQueue: [],
    pendingStatsBefore: null,
    pendingDiceResults: [],
    pendingJudgment: null,
    playMode: setup.playMode ?? 'game',
  }

  sessions.set(sessionId, session)
  return session
}

// ─────────────────────────────────────────
// Helper: build accumulated GM context for current turn
// ─────────────────────────────────────────

function buildTurnContext(
  gmText: string,
  diceContext: string,
  previousResponses: { charName: string; text: string }[],
): string {
  let ctx = diceContext ? `${diceContext}\n\n${gmText}` : gmText
  if (previousResponses.length > 0) {
    ctx += '\n\n[이번 턴 다른 탐사자들의 행동]\n'
    for (const prev of previousResponses) {
      ctx += `\n${prev.charName}: ${prev.text}`
    }
  }
  return ctx
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
  sendTurnComplete = true,
): Promise<void> {
  const { players, state, scenario, logger } = session

  // Capture statsBefore for all target characters
  const statsBefore = captureStatSnapshot(session, targetIds)
  session.pendingStatsBefore = statsBefore

  // Prepend pending dice results to GM text
  const pendingDice = session.pendingDiceResults.splice(0)
  const diceContext = pendingDice
    .map(r => `[판정 결과 — ${r.charName} · ${r.skill}: ${r.outcome}] ${r.resultText}`.trim())
    .join('\n')
  let accumulatedContext = buildTurnContext(gmText, diceContext, previousResponses)

  for (const charId of targetIds) {
    const player = players.get(charId)
    if (!player) continue

    const char = session.characters.get(charId)
    if (!char) throw new Error(`Character ${charId} not found in session`)
    const sessionState = state.getState(charId)

    // Build compressed context from full history
    const allTurns = scenario.getRecentTurns(1000)
    const charTurns = allTurns.filter(t => t.characterId === charId)
    const contextMessages = buildContextMessages(charTurns)

    // Prepend summary of older turns into GM message if available
    const gmWithContext = contextMessages.summary
      ? `${contextMessages.summary}\n\n${accumulatedContext}`
      : accumulatedContext

    // Build co-characters list (everyone else in the session)
    const coCharacters: CoCharacter[] = []
    for (const [otherId, otherChar] of session.characters) {
      if (otherId !== charId) {
        coCharacters.push({ id: otherId, name: otherChar.name, occupation: otherChar.occupation })
      }
    }

    const ctx: TurnContext = {
      character: char,
      sessionState,
      scenarioId: scenario.scenarioId,
      turnNumber: session.turnNumber,
      gmMessage: gmWithContext,
      visibleHistory: contextMessages.recentTurns,
      playMode: session.playMode,
      coCharacters,
    }

    // Notify clients that this character is responding
    broadcast(session, {
      type: 'ai_response',
      charId,
      charName: char.name,
      text: '',
      done: false,
    })

    const record = await player.thinkingTakeTurn(ctx)

    // Fix statsBefore/statsAfter: use the snapshot we captured before the turn
    const beforeSnap = statsBefore.get(charId)
    if (beforeSnap) {
      record.statsBefore = { ...beforeSnap }
    }
    // statsAfter = current state (may have been modified by adjust_stat during the turn)
    const afterState = state.getState(charId)
    record.statsAfter = { hp: afterState.hp, san: afterState.san, luck: afterState.luck }

    const responseText = record.response.rawText
    const innerText = record.response.inner ?? ''
    const actionText = record.response.action ?? responseText

    // Send complete response with structured inner/action fields
    broadcast(session, {
      type: 'ai_response',
      charId,
      charName: char.name,
      text: responseText,
      innerText,
      actionText,
      playMode: session.playMode,
      done: true,
    })

    // Update accumulated context for the next AI in this turn
    previousResponses.push({ charName: char.name, text: record.response.action })
    accumulatedContext = buildTurnContext(gmText, diceContext, previousResponses)

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
      innerText,
      actionText,
      playMode: session.playMode,
      timestamp: new Date().toISOString(),
      done: true,
    }
    session.chatLog.push(chatMsg)
  }

  session.pendingStatsBefore = null
  session.turnNumber++

  // Send updated character states
  broadcast(session, {
    type: 'state_update',
    characters: getCharacterStates(session),
  })

  if (sendTurnComplete) {
    broadcast(session, { type: 'turn_complete' })
  }
}

// ─────────────────────────────────────────
// Helper: drain the turn queue
// ─────────────────────────────────────────

async function drainTurnQueue(sess: GameSession): Promise<void> {
  while (sess.turnQueue.length > 0) {
    const next = sess.turnQueue.shift()!

    // Add GM message to chat log
    const gmMsg: ChatMessage = {
      id: `gm-${Date.now()}`,
      type: 'gm_scene',
      targetLabel: next.targetLabel,
      text: next.gmText,
      timestamp: new Date().toISOString(),
    }
    sess.chatLog.push(gmMsg)
    broadcast(sess, { type: 'gm_message', message: gmMsg })

    // Notify clients of remaining queue size (after shift)
    broadcast(sess, {
      type: 'queue_update',
      remaining: sess.turnQueue.length,
    })

    try {
      const targets = next.targetIds.length > 0 ? next.targetIds : sess.turnOrder
      // Never send turn_complete mid-queue; we'll send it after the loop
      await runTurn(sess, next.gmText, next.targetLabel, targets, [], false)
    } catch (err: any) {
      broadcast(sess, { type: 'error', message: err.message })
    }
  }

  // All queued turns processed
  sess.isProcessing = false
  broadcast(sess, { type: 'turn_complete' })
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
  const sessionList = files.map(f => {
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
  res.json(sessionList)
})

// POST /api/sessions — only validates and returns a session ID.
// Actual initialization happens in the WebSocket start_session handler.
app.post('/api/sessions', (req, res) => {
  try {
    const setup: SessionSetupData = req.body
    // Validate that all characters exist
    for (const charId of setup.characterIds) {
      loadCharacter(charId) // throws if not found
    }
    const sessionId = `session-${Date.now()}`
    res.json({ sessionId, name: setup.sessionName })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
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
    // Path traversal protection
    const safeId = char.id.replace(/[^a-zA-Z0-9_-]/g, '')
    if (safeId !== char.id) {
      res.status(400).json({ error: 'Invalid character id' })
      return
    }
    const charsDir = join(ROOT, 'characters')
    if (!existsSync(charsDir)) mkdirSync(charsDir, { recursive: true })
    const path = join(charsDir, `${safeId}.json`)
    writeFileSync(path, JSON.stringify(char, null, 2), 'utf-8')
    res.json({ success: true, id: char.id })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/characters/:id', (req, res) => {
  const { id } = req.params
  // Path traversal protection — same as POST
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  if (safeId !== id) {
    res.status(400).json({ error: 'Invalid character id' })
    return
  }
  const charPath = join(ROOT, 'characters', `${safeId}.json`)
  if (existsSync(charPath)) {
    try {
      res.json(JSON.parse(readFileSync(charPath, 'utf-8')))
    } catch {
      res.status(500).json({ error: 'Failed to parse character data' })
    }
    return
  }
  res.status(404).json({ error: 'Character not found' })
})

// ─── Scenario Templates ───

const TEMPLATES_DIR = join(ROOT, 'scenario-templates')

function safeTemplateId(id: string): string | null {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return safe === id && safe.length > 0 ? safe : null
}

app.get('/api/scenario-templates', (_req, res) => {
  if (!existsSync(TEMPLATES_DIR)) { res.json([]); return }
  const files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'))
  const templates = files.map(f => {
    try {
      return JSON.parse(readFileSync(join(TEMPLATES_DIR, f), 'utf-8'))
    } catch { return null }
  }).filter(Boolean)
  res.json(templates)
})

app.get('/api/scenario-templates/:id', (req, res) => {
  const safe = safeTemplateId(req.params.id)
  if (!safe) { res.status(400).json({ error: 'Invalid template id' }); return }
  const path = join(TEMPLATES_DIR, `${safe}.json`)
  if (!existsSync(path)) { res.status(404).json({ error: 'Template not found' }); return }
  try {
    res.json(JSON.parse(readFileSync(path, 'utf-8')))
  } catch {
    res.status(500).json({ error: 'Failed to read template' })
  }
})

app.post('/api/scenario-templates', (req, res) => {
  try {
    const { title, description = '', npcs = [], items = [], openingBriefing = '' } = req.body
    if (!title?.trim()) { res.status(400).json({ error: 'title is required' }); return }
    const id = `scenario-${Date.now()}`
    const template = { id, title: title.trim(), description, npcs, items, openingBriefing, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    if (!existsSync(TEMPLATES_DIR)) mkdirSync(TEMPLATES_DIR, { recursive: true })
    writeFileSync(join(TEMPLATES_DIR, `${id}.json`), JSON.stringify(template, null, 2), 'utf-8')
    res.json(template)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/scenario-templates/:id', (req, res) => {
  const safe = safeTemplateId(req.params.id)
  if (!safe) { res.status(400).json({ error: 'Invalid template id' }); return }
  const path = join(TEMPLATES_DIR, `${safe}.json`)
  if (!existsSync(path)) { res.status(404).json({ error: 'Template not found' }); return }
  try {
    const existing = JSON.parse(readFileSync(path, 'utf-8'))
    const { title, description, npcs, items, openingBriefing } = req.body
    const updated = { ...existing, ...(title !== undefined && { title }), ...(description !== undefined && { description }), ...(npcs !== undefined && { npcs }), ...(items !== undefined && { items }), ...(openingBriefing !== undefined && { openingBriefing }), updatedAt: new Date().toISOString() }
    writeFileSync(path, JSON.stringify(updated, null, 2), 'utf-8')
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/scenario-templates/:id', (req, res) => {
  const safe = safeTemplateId(req.params.id)
  if (!safe) { res.status(400).json({ error: 'Invalid template id' }); return }
  const path = join(TEMPLATES_DIR, `${safe}.json`)
  if (!existsSync(path)) { res.status(404).json({ error: 'Template not found' }); return }
  try {
    unlinkSync(path)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Models ───

const KNOWN_MODELS: Record<string, string[]> = {
  claude: [
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-haiku-3-5',
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  openai: [
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o',
    'gpt-4o-mini',
    'o3-mini',
  ],
  grok: [
    'grok-3',
    'grok-3-mini',
    'grok-2-1212',
  ],
}

app.get('/api/models', async (_req, res) => {
  const result: Record<string, string[]> = { ...KNOWN_MODELS, ollama: [] }

  // Query Ollama for actually installed models
  try {
    const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434'
    const r = await fetch(`${ollamaHost}/api/tags`)
    if (r.ok) {
      const data = await r.json() as { models?: { name: string }[] }
      result.ollama = (data.models ?? []).map(m => m.name)
    }
  } catch {
    // Ollama not running — return empty list
  }

  res.json(result)
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
    // Attach to existing session
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
        const sess = sessions.get(sid)
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

        // Always create a fresh session
        let sess: GameSession
        try {
          sess = createSession(sid, setup)
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'error', message: `세션 생성 실패: ${err.message}` }))
          break
        }
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

          // Inject briefing into each AI player's history so they know the scenario context
          for (const player of sess.players.values()) {
            player.injectOpeningBriefing(setup.openingBriefing)
          }
        }

        // Save session to disk immediately so it appears in session list
        saveSession(sess)

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
        const queuedTurn: QueuedTurn = {
          gmText,
          targetLabel: targetLabel ?? '',
          targetIds: targetIds ?? [],
        }

        if (sess.isProcessing) {
          // Queue the turn instead of dropping it
          sess.turnQueue.push(queuedTurn)
          broadcast(sess, {
            type: 'queue_update',
            remaining: sess.turnQueue.length,
          })
          break
        }

        sess.isProcessing = true

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

        // Run first turn (sendTurnComplete=false — drainTurnQueue handles turn_complete)
        try {
          const targets = (targetIds && targetIds.length > 0)
            ? targetIds
            : sess.turnOrder
          await runTurn(sess, gmText, targetLabel ?? '', targets, [], false)
        } catch (err: any) {
          broadcast(sess, { type: 'error', message: err.message })
        }

        // Drain queued turns then send turn_complete and clear isProcessing
        drainTurnQueue(sess).catch(err => {
          broadcast(sess, { type: 'error', message: err.message })
          sess.isProcessing = false
        })
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
        } else if (stat === 'mp') {
          if (delta < 0) sess.state.spendMp(charId, Math.abs(delta))
          else sess.state.restoreMp(charId, delta)
        } else if (stat === 'luck') {
          if (delta < 0) sess.state.spendLuck(charId, Math.abs(delta))
          else sess.state.restoreLuck(charId, delta)
        }
        broadcast(sess, {
          type: 'state_update',
          characters: getCharacterStates(sess),
        })
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


      case 'set_play_mode': {
        if (!currentSession) break
        const mode: PlayMode = msg.mode === 'game' ? 'game' : 'immersion'
        currentSession.playMode = mode
        for (const player of currentSession.players.values()) {
          player.setPlayMode(mode)
        }
        broadcast(currentSession, { type: 'mode_changed', mode })
        break
      }

      case 'introduce_npc': {
        if (!currentSession) break
        const npc = msg.npc as { name: string; description: string }
        const targetIds: string[] = msg.targetIds ?? [...currentSession.characters.keys()]
        for (const charId of targetIds) {
          try { currentSession.state.introduceNpc(charId, npc) } catch {}
        }
        broadcast(currentSession, { type: 'npc_introduced', npc, targetIds })
        break
      }

      case 'judgment_request': {
        if (!currentSession) break
        const sess = currentSession
        if (sess.pendingJudgment) {
          ws.send(JSON.stringify({ type: 'error', message: '이미 진행 중인 판정이 있습니다. 수락/취소 후 다시 시도하세요.' }))
          break
        }

        try {
          // Accept either legacy format (flat fields) or new format (request object)
          let request: JudgmentRequest
          if (msg.request) {
            request = msg.request as JudgmentRequest
          } else {
            // Legacy: flat fields for simple check
            const { charId, skill, difficulty, outcomes, bonusPenalty } = msg as {
              charId: string; skill: string; difficulty: 'regular' | 'hard' | 'extreme'
              outcomes: JudgmentOutcomes; bonusPenalty?: { bonus: number; penalty: number }
            }
            request = { type: 'simple', charId, skill, difficulty, bonusPenalty, outcomes: outcomes ?? {} }
          }

          const pending = rollJudgment(sess, request)
          sess.pendingJudgment = pending
          broadcast(sess, { type: 'judgment_pending', ...pending })
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }))
        }
        break
      }

      case 'judgment_resolve': {
        if (!currentSession) break
        const sess = currentSession
        if (!sess.pendingJudgment) {
          ws.send(JSON.stringify({ type: 'error', message: '진행 중인 판정이 없습니다.' }))
          break
        }

        const pending = sess.pendingJudgment
        if (msg.judgmentId && msg.judgmentId !== pending.id) {
          ws.send(JSON.stringify({ type: 'error', message: '판정 ID가 일치하지 않습니다.' }))
          break
        }
        sess.pendingJudgment = null  // 즉시 클리어 — 레이스 방지
        const { resolution } = msg as { resolution: JudgmentResolution }
        try {
          const final = resolveJudgment(sess, pending, resolution)

          broadcast(sess, { type: 'judgment_final', ...final })

          // Store for next AI turn
          sess.pendingDiceResults.push({
            charId: final.charId,
            charName: final.charName,
            skill: final.skill,
            outcome: final.outcome,
            resultText: final.naturalLanguage,
          })

          // Add to chat log
          const diceMsg: ChatMessage = {
            id: `judgment-${Date.now()}`,
            type: 'dice_result',
            charId: final.charId,
            charName: final.charName,
            text: `${final.charName} — ${final.skill} 판정 (목표: ${final.target}) → ${final.roll} = ${final.outcome}`,
            timestamp: new Date().toISOString(),
            diceData: {
              skill: final.skill,
              difficulty: final.difficulty,
              roll: final.roll,
              target: final.target,
              outcome: final.outcome,
              resultText: final.appliedOutcome?.desc ?? '',
              wasPush: final.wasPush,
              wasLuckSpend: final.wasLuckSpend,
              luckSpent: final.luckSpent,
              tensDice: final.tensDice,
            },
          }
          sess.chatLog.push(diceMsg)

          // Broadcast state if effects changed stats
          if (final.effectsApplied.length > 0) {
            broadcast(sess, {
              type: 'state_update',
              characters: getCharacterStates(sess),
            })
          }
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }))
        }
        break
      }

      case 'judgment_cancel': {
        if (!currentSession) break
        const sess = currentSession
        if (sess.pendingJudgment) {
          if (msg.judgmentId && msg.judgmentId !== sess.pendingJudgment.id) {
            ws.send(JSON.stringify({ type: 'error', message: '판정 ID가 일치하지 않습니다.' }))
            break
          }
          const judgmentId = sess.pendingJudgment.id
          sess.pendingJudgment = null
          broadcast(sess, { type: 'judgment_cancelled', judgmentId })
        }
        break
      }

      case 'san_check': {
        if (!currentSession) break
        const sess = currentSession
        const { charId, successLoss, failureLoss } = msg as {
          charId: string
          successLoss: string
          failureLoss: string
        }
        const DICE_EXPR = /^(\d+|\d+[dD]\d+)$/
        if (!DICE_EXPR.test(successLoss) || !DICE_EXPR.test(failureLoss)) {
          ws.send(JSON.stringify({ type: 'error', message: '잘못된 주사위 표현식입니다. (예: 0, 1, 1d6, 2d10)' }))
          break
        }
        try {
          const result = performSanCheck(sess, charId, successLoss, failureLoss)
          broadcast(sess, { type: 'san_check_result', ...result })

          // Store for next AI turn
          sess.pendingDiceResults.push({
            charId: result.charId,
            charName: result.charName,
            skill: 'SAN',
            outcome: result.sanOutcome,
            resultText: result.naturalLanguage,
          })

          // Add to chat log
          const sanMsg: ChatMessage = {
            id: `san-${Date.now()}`,
            type: 'dice_result',
            charId: result.charId,
            charName: result.charName,
            text: `${result.charName} — SAN 체크`,
            timestamp: new Date().toISOString(),
            diceData: {
              skill: 'SAN',
              difficulty: 'regular',
              roll: result.sanRoll,
              target: result.sanTarget,
              outcome: result.sanOutcome,
              resultText: result.naturalLanguage,
            },
          }
          sess.chatLog.push(sanMsg)

          // Broadcast state update (SAN changed)
          broadcast(sess, {
            type: 'state_update',
            characters: getCharacterStates(sess),
          })
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }))
        }
        break
      }

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
    }
  })

  ws.on('close', () => {
    if (currentSession) {
      currentSession.clients.delete(ws)
      // Remove session from memory when all clients disconnect (data is persisted to disk)
      if (currentSession.clients.size === 0 && !currentSession.isProcessing) {
        sessions.delete(currentSession.id)
      }
    }
  })
})

const PORT = process.env.PORT ?? 3001
server.listen(PORT, async () => {
  log.ok('STARTUP', `Synthetic Investigators server running on http://localhost:${PORT}`)
  logApiKeyStatus()
  await testOllamaConnection()
})
