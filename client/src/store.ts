import { create } from 'zustand'

// ─── Types ───

export type PlayMode = 'immersion' | 'game'

export type Screen = 'home' | 'session_setup' | 'game' | 'character_editor' | 'log_viewer' | 'scenario_list' | 'scenario_editor'

export interface CharacterState {
  id: string
  name: string
  age: number
  occupation: string
  residence: string
  equipment: string[]
  skills: Record<string, number>  // 기술명 → 기술값 (0 포함)
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

export interface ChatMessage {
  id: string
  type: 'gm_scene' | 'ai_response' | 'npc_speech' | 'dice_result' | 'system'
  targetLabel?: string
  charId?: string
  charName?: string
  npcName?: string
  text: string
  innerText?: string   // Stage 1 — 심리/OOC
  actionText?: string  // Stage 2 — 행동
  playMode?: string    // 메시지 생성 시점 모드
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

export interface NPC {
  id: string
  name: string
  description: string
  traits: string[]
}

export interface SessionInfo {
  id: string
  name: string
  characters: string[]
  startedAt: string
  lastUpdatedAt: string
  turnCount: number
}

export interface CharacterSummary {
  id: string
  name: string
  occupation: string
  age: number
  gender: string
  provider: string
  model: string
}

export interface ClientRollResult {
  charId: string
  charName: string
  skill: string
  baseSkill: number
  target: number
  roll: number
  tensDice?: number[]
  outcome: string
}

export interface ClientPendingJudgment {
  id: string
  request: {
    type: 'simple' | 'opposed' | 'combined' | 'group'
    difficulty?: string
    bonusPenalty?: { bonus: number; penalty: number }
    charId?: string
    skill?: string
    [key: string]: unknown
  }
  rolls: ClientRollResult[]
  outcome: string
  appliedOutcome: { desc: string; effects?: unknown[] } | null
  canPush: boolean
  canSpendLuck: boolean
  luckCost: number | null
  currentLuck: number
  pushed: boolean
  timestamp: string
}

export interface SessionSetupData {
  sessionName: string
  characterIds: string[]
  npcs: NPC[]
  items: { name: string; location: string; description: string }[]
  openingBriefing: string
  playMode?: PlayMode
}

export interface ScenarioTemplate {
  id: string
  title: string
  description: string
  npcs: NPC[]
  items: { name: string; location: string; description: string }[]
  openingBriefing: string
  createdAt: string
  updatedAt: string
}

export interface AppState {
  // Navigation
  screen: Screen
  sessionId: string | null
  sessionName: string | null

  // Game state
  characters: CharacterState[]
  turnOrder: string[]
  chatMessages: ChatMessage[]
  isProcessingTurn: boolean
  turnQueueSize: number
  npcs: NPC[]

  // WebSocket
  ws: WebSocket | null
  wsReady: boolean

  // Data
  savedSessions: SessionInfo[]
  availableCharacters: CharacterSummary[]

  // Pending setup (used when transitioning to game screen)
  pendingSetup: SessionSetupData | null

  // Pending judgment (multi-step flow)
  pendingJudgment: ClientPendingJudgment | null

  // Play mode
  playMode: PlayMode

  // Scenario editor state
  editingScenarioId: string | null

  // Actions
  setScreen: (screen: Screen) => void
  setSession: (id: string, name: string) => void
  setCharacters: (chars: CharacterState[]) => void
  setTurnOrder: (order: string[]) => void
  addMessage: (msg: ChatMessage) => void
  setMessages: (msgs: ChatMessage[]) => void
  updateMessage: (id: string, update: Partial<ChatMessage>) => void
  setProcessing: (v: boolean) => void
  setTurnQueueSize: (size: number) => void
  setNpcs: (npcs: NPC[]) => void
  setWs: (ws: WebSocket | null) => void
  setWsReady: (ready: boolean) => void
  setSavedSessions: (sessions: SessionInfo[]) => void
  setAvailableCharacters: (chars: CharacterSummary[]) => void
  setPendingSetup: (setup: SessionSetupData | null) => void
  setPendingJudgment: (j: ClientPendingJudgment | null) => void
  setEditingScenarioId: (id: string | null) => void
  setPlayMode: (mode: PlayMode) => void
  reset: () => void
}

export const useStore = create<AppState>((set) => ({
  screen: 'home',
  sessionId: null,
  sessionName: null,
  characters: [],
  turnOrder: [],
  chatMessages: [],
  isProcessingTurn: false,
  turnQueueSize: 0,
  npcs: [],
  ws: null,
  wsReady: false,
  savedSessions: [],
  availableCharacters: [],
  pendingSetup: null,
  pendingJudgment: null,
  playMode: 'game',
  editingScenarioId: null,
  setScreen: (screen) => set({ screen }),
  setSession: (id, name) => set({ sessionId: id, sessionName: name }),
  setCharacters: (chars) => set({ characters: chars }),
  setTurnOrder: (order) => set({ turnOrder: order }),
  addMessage: (msg) => set(s => ({ chatMessages: [...s.chatMessages, msg] })),
  setMessages: (msgs) => set({ chatMessages: msgs }),
  updateMessage: (id, update) => set(s => ({
    chatMessages: s.chatMessages.map(m => m.id === id ? { ...m, ...update } : m),
  })),
  setProcessing: (v) => set({ isProcessingTurn: v }),
  setTurnQueueSize: (size) => set({ turnQueueSize: size }),
  setNpcs: (npcs) => set({ npcs }),
  setWs: (ws) => set({ ws }),
  setWsReady: (ready) => set({ wsReady: ready }),
  setSavedSessions: (sessions) => set({ savedSessions: sessions }),
  setAvailableCharacters: (chars) => set({ availableCharacters: chars }),
  setPendingSetup: (setup) => set({ pendingSetup: setup }),
  setPendingJudgment: (j) => set({ pendingJudgment: j }),
  setEditingScenarioId: (id) => set({ editingScenarioId: id }),
  setPlayMode: (mode) => set({ playMode: mode }),
  reset: () => set((state) => {
    state.ws?.close()
    return {
      sessionId: null,
      sessionName: null,
      characters: [],
      turnOrder: [],
      chatMessages: [],
      isProcessingTurn: false,
      turnQueueSize: 0,
      npcs: [],
      ws: null,
      wsReady: false,
      pendingSetup: null,
      pendingJudgment: null,
      playMode: 'game',
      editingScenarioId: null,
    }
  }),
}))
