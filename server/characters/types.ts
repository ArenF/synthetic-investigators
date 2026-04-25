/**
 * CoC 7th Edition Character Sheet Types
 * Based on official Call of Cthulhu 7e character sheet format
 */

export type ModelProvider = 'claude' | 'gemini' | 'openai' | 'ollama' | 'grok'

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
  // 전투
  격투?: number
  도검?: number
  사격?: number
  소총?: number
  투척?: number
  회피?: number
  // 탐색 / 인지
  흔적발견?: number
  청취?: number
  추적?: number
  // 대인 관계
  설득?: number
  위협?: number
  매혹?: number
  언변?: number
  심리학?: number
  정신분석?: number
  // 학술 / 지식
  도서관이용?: number
  역사?: number
  오컬트?: number
  크툴루신화?: number
  고고학?: number
  인류학?: number
  자연사?: number
  법률?: number
  회계?: number
  // 의학 / 과학
  의학?: number
  응급처치?: number
  생물학?: number
  화학?: number
  물리학?: number
  지질학?: number
  전자공학?: number
  // 기술 / 수리
  전기수리?: number
  기계수리?: number
  컴퓨터?: number
  자물쇠따기?: number
  운전?: number
  항법?: number
  조종?: number
  승마?: number
  // 신체
  은신?: number
  잠입?: number
  수영?: number
  등반?: number
  점프?: number
  야생생존?: number
  // 예술 / 기타
  '예술/공예'?: number
  사진술?: number
  변장?: number
  동물조련?: number
  손재주?: number
  감정?: number
  // 자유 형식 기술 (캐릭터별 특수 기술 등)
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

export interface ItemObject {
  name: string
  type: 'weapon' | 'clue' | 'tool' | 'consumable' | 'misc'
  description?: string
  weaponStats?: {
    skill: string
    damage: string
    range?: string
    attacks?: number
    ammo?: number
  }
}

export type Effect =
  | { kind: 'stat'; stat: 'hp' | 'san' | 'mp' | 'luck'; delta: number }
  | { kind: 'skill'; skill: string; delta: number; permanent?: boolean }
  | { kind: 'item_gain'; item: ItemObject }
  | { kind: 'item_lose'; itemName: string }
  | { kind: 'status'; status: 'temporaryInsanity' | 'indefiniteInsanity'; value: boolean }

export interface Outcome {
  desc: string
  effects?: Effect[]
}

export interface JudgmentOutcomes {
  extremeSuccess?: Outcome
  hardSuccess?: Outcome
  regularSuccess?: Outcome
  regularFailure?: Outcome
  badFailure?: Outcome
  fumble?: Outcome
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
  model: string              // e.g. "claude-opus-4-5", "gemini-2.0-flash", "gpt-4o", "llama3.2"
  temperature?: number       // 0.0 ~ 1.0, default 0.7
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
  currentItems: ItemObject[]  // items may be gained or lost
  notes: string           // GM or player notes
  sessionSanLoss: number  // cumulative SAN lost this session (for indefinite insanity check)
  knownNpcs: KnownNpc[]  // NPCs this character has been introduced to
}

/**
 * The prompt context given to an AI player each turn
 */
export interface CoCharacter {
  id: string
  name: string
  occupation: string
}

export interface TurnContext {
  character: CoCCharacter
  sessionState: SessionState
  scenarioId: string
  turnNumber: number
  gmMessage: string           // what the GM sends this turn
  visibleHistory: TurnRecord[] // recent turns this character can see
  playMode: PlayMode          // immersion | game
  coCharacters: CoCharacter[] // other characters in the same session
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
    inner?: string      // [내면] — key observation data
    rawText: string     // full raw model output
  }
  diceResults?: DiceResult[]
}

export interface DiceResult {
  skill: string
  target: number
  roll: number
  outcome: 'extreme_success' | 'hard_success' | 'regular_success' | 'regular_failure' | 'bad_failure' | 'fumble' | 'failure'
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

// ─────────────────────────────────────────
// Judgment System — CoC 7e 다단계 판정
// ─────────────────────────────────────────

export type Difficulty = 'regular' | 'hard' | 'extreme'

export type JudgmentOutcomeKey =
  | 'extreme_success'
  | 'hard_success'
  | 'regular_success'
  | 'regular_failure'
  | 'bad_failure'
  | 'fumble'

export interface BonusPenaltyDice {
  bonus: number   // 0~2
  penalty: number // 0~2
}

// ── 판정 요청 유형 ──

export interface SimpleCheckRequest {
  type: 'simple'
  charId: string
  skill: string
  difficulty: Difficulty
  bonusPenalty?: BonusPenaltyDice
  outcomes?: JudgmentOutcomes
}

export interface OpposedRollRequest {
  type: 'opposed'
  sideA: { charId: string; skill: string; bonusPenalty?: BonusPenaltyDice }
  sideB: { charId?: string; npcName?: string; skillValue?: number; skill: string; bonusPenalty?: BonusPenaltyDice }
  tieBreaker?: 'attacker' | 'defender'
  outcomes?: JudgmentOutcomes  // optional: applied to winner's result
}

export interface CombinedRollRequest {
  type: 'combined'
  charId: string
  skills: string[]         // 2+ skills to check against a single roll
  condition: 'and' | 'or'
  difficulty?: Difficulty
  bonusPenalty?: BonusPenaltyDice
  outcomes?: JudgmentOutcomes
}

export interface GroupRollRequest {
  type: 'group'
  charIds: string[]
  skill: string
  difficulty?: Difficulty
  mode: 'cooperative' | 'all_must_succeed'
  bonusPenalty?: BonusPenaltyDice
  outcomes?: JudgmentOutcomes
}

export type JudgmentRequest = SimpleCheckRequest | OpposedRollRequest | CombinedRollRequest | GroupRollRequest

// ── 굴림 결과 (개�� 참가자) ──

export interface RollResult {
  charId: string
  charName: string
  skill: string
  baseSkill: number
  target: number
  roll: number
  tensDice?: number[]  // 보��스/페널티 텐다이스 (표시용)
  outcome: JudgmentOutcomeKey
}

// ── 중간 결과 (Effect 미적용, GM 결정 대기) ──

export interface PendingJudgment {
  id: string
  request: JudgmentRequest
  rolls: RollResult[]
  outcome: JudgmentOutcomeKey
  appliedOutcome: Outcome | null
  canPush: boolean
  canSpendLuck: boolean
  luckCost: number | null    // 성공까지 필요한 행운 (null = 해당 없음)
  currentLuck: number
  pushed: boolean            // 이�� push된 상태?
  timestamp: string
}

// ── GM의 후속 결정 ──

export type JudgmentResolution =
  | { action: 'accept' }
  | { action: 'push'; pushConsequence: string }
  | { action: 'luck_spend' }

// ── 확정 결과 (Effect 적용 완료) ──

export interface JudgmentFinalResult {
  judgmentId: string
  charId: string
  charName: string
  skill: string
  difficulty: Difficulty
  roll: number
  target: number
  baseSkill: number
  outcome: JudgmentOutcomeKey
  appliedOutcome: Outcome | null
  effectsApplied: Effect[]
  naturalLanguage: string
  wasPush: boolean
  wasLuckSpend: boolean
  luckSpent: number
  tensDice?: number[]
}

// ── SAN 체크 결과 (즉시 실행, pending 없음) ──

export interface SanCheckResult {
  charId: string
  charName: string
  sanRoll: number
  sanTarget: number
  sanOutcome: JudgmentOutcomeKey
  lossRoll: string         // e.g. "1d6"
  lossAmount: number
  intRoll?: number
  intTarget?: number
  intOutcome?: JudgmentOutcomeKey
  temporaryInsanity: boolean
  indefiniteInsanity: boolean
  insanityDuration?: number  // 1d10 hours
  naturalLanguage: string
}
