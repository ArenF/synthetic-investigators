/**
 * CoC 7th Edition Character Sheet Types
 * Based on official Call of Cthulhu 7e character sheet format
 */

export type ModelProvider = 'claude' | 'gemini' | 'openai' | 'ollama'

export interface CharacterCharacteristics {
  STR: number  // 근력
  CON: number  // 체질
  SIZ: number  // 체격
  DEX: number  // 민첩
  APP: number  // 외모
  INT: number  // 지능
  POW: number  // 의지
  EDU: number  // 교육
}

export interface DerivedStats {
  hp: { current: number; max: number }
  mp: { current: number; max: number }
  san: { current: number; starting: number; max: number }
  luck: number
  build: number        // 체격 수정치 (-2 ~ +2)
  moveRate: number     // 이동력
  damageBonus: string  // 피해 보너스 (e.g. "-1", "0", "+1d4")
}

export interface SkillSet {
  // Combat
  격투?: number
  사격?: number
  회피?: number
  // Investigative
  흔적발견?: number
  청취?: number
  도서관이용?: number
  역사?: number
  오컬트?: number
  // Social
  설득?: number
  위협?: number
  매혹?: number
  심리학?: number
  // Practical
  응급처치?: number
  운전?: number
  은신?: number
  잠입?: number
  // Academic
  의학?: number
  생물학?: number
  화학?: number
  물리학?: number
  법률?: number
  회계?: number
  // Other (free-form)
  [skill: string]: number | undefined
}

export interface Backstory {
  // CoC 7e official backstory fields
  personalDescription: string    // 인물 묘사
  ideology: string               // 이념/신념
  significantPeople: string[]    // 중요한 인물들 (최대 2명)
  meaningfulLocations: string[]  // 의미있는 장소들
  treasuredPossessions: string[] // 소중한 소지품들
  traits: string[]               // 특성/버릇
  injuriesScars: string          // 부상/흉터
  phobiasManias: string          // 공포증/집착증
  arcaneTomesSpells: string      // 비전 서적/주문 (선택)
  encountersWithStrangeEntities: string // 기이한 존재와의 조우 (선택)
}

export interface Equipment {
  items: string[]
  weapons: WeaponEntry[]
  cash: number
  assets: string
  spendingLevel: string  // "궁핍" | "보통" | "풍족" | "부유"
}

export interface WeaponEntry {
  name: string
  skill: string        // 사용하는 기술
  damage: string       // e.g. "1d6", "1d8+db"
  range?: string
  attacks: number      // 라운드당 공격 횟수
  ammo?: number
  malfunction?: number // 고장 수치
}

export interface ModelConfig {
  provider: ModelProvider
  model: string        // e.g. "claude-opus-4-5", "gemini-2.0-flash", "gpt-4o", "llama3.2"
  temperature?: number // 0.0 ~ 1.0, default 0.7
}

/**
 * Full CoC Character — the source of truth for a character
 * This is saved as JSON in /characters/*.json
 */
export interface CoCCharacter {
  id: string              // 파일명과 동일, e.g. "jisu"
  name: string
  playerName?: string     // 실제 플레이어 이름 (메모용)
  age: number
  gender: string
  occupation: string
  birthplace: string
  residence: string

  characteristics: CharacterCharacteristics
  derived: DerivedStats
  skills: SkillSet
  backstory: Backstory
  equipment: Equipment

  // AI configuration
  modelConfig: ModelConfig

  // Session state (mutable during play)
  sessionState?: SessionState
}

/**
 * Mutable state during a session — updated as the game progresses
 */
export type PlayMode = 'immersion' | 'game'

export interface KnownNpc {
  name: string
  description: string
}

export interface SessionState {
  hp: number
  san: number
  mp: number
  luck: number
  temporaryInsanity: boolean
  indefiniteInsanity: boolean
  injuries: string[]
  currentItems: string[]  // items may be gained or lost
  notes: string           // GM or player notes
  sessionSanLoss: number  // cumulative SAN lost this session (for indefinite insanity check)
  knownNpcs: KnownNpc[]  // NPCs this character has been introduced to
}

/**
 * The prompt context given to an AI player each turn
 */
export interface TurnContext {
  character: CoCCharacter
  sessionState: SessionState
  scenarioId: string
  turnNumber: number
  gmMessage: string           // what the GM sends this turn
  visibleHistory: TurnRecord[] // recent turns this character can see
  playMode: PlayMode          // immersion | game
}

/**
 * A single turn's full record — saved to logs
 */
export interface TurnRecord {
  turnNumber: number
  timestamp: string
  characterId: string
  characterName: string
  modelProvider: ModelProvider
  modelName: string
  gmInput: string
  statsBefore: { hp: number; san: number; luck: number }
  statsAfter: { hp: number; san: number; luck: number }
  response: {
    action: string      // [행동]
    attempt?: string    // [시도]
    inner?: string      // [내면] — key observation data
    rawText: string     // full raw model output
  }
  diceResults?: DiceResult[]
}

export interface DiceResult {
  skill: string
  target: number
  roll: number
  outcome: 'extreme_success' | 'hard_success' | 'regular_success' | 'failure' | 'fumble'
}

/**
 * A full scenario session record
 */
export interface ScenarioSession {
  scenarioId: string
  scenarioName: string
  startedAt: string
  lastUpdatedAt: string
  characters: string[]  // character IDs
  turns: TurnRecord[]
}
