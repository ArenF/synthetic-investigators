# Synthetic Investigators — CLAUDE.md

AI 모델들을 Call of Cthulhu 7th Edition(CoC) 탐사자 역할에 배치하는 멀티모델 TRPG 실험 플랫폼.
GM이 WebSocket으로 세션을 운영하고, 각 캐릭터는 Claude / Gemini / GPT-4o / Ollama 중 하나가 담당한다.

---

## 프로젝트 구조 요약

```
server/
  api.ts                      Express + WebSocket 서버 (메인 진입점)
  characters/
    types.ts                  CoC 7e 전체 타입 정의 (소스 오브 트루스)
    prompt-generator.ts       시스템 프롬프트 및 턴 메시지 빌더
  players/
    base-player.ts            추상 BasePlayer (takeTurn, thinkingTakeTurn)
    claude-player.ts          Extended Thinking 오버라이드
    gemini-player.ts
    openai-player.ts
    ollama-player.ts
    index.ts                  createPlayer() 팩토리
  game/
    state.ts                  GameState — HP/SAN/아이템 세션 상태
    dice.ts                   skillCheck(), d100(), rollDice()
    judgment.ts               Judgment Event System (6-tier 판정 + Effect 적용)
    scenario.ts               ScenarioManager — 세션 저장/로드
    logger.ts                 ExperimentLogger — AI 행동 플래그 분석
    context.ts                buildContextMessages() — 히스토리 압축
    dev-logger.ts             개발 진단 로거 (API 키, 타이밍)
client/
  src/
    store.ts                  Zustand 글로벌 상태
    App.tsx                   WebSocket 연결 + 메시지 라우팅
    components/               React UI 컴포넌트
characters/*.json             캐릭터 시트 (JSON, CoCCharacter 스키마)
scenarios/*.json              저장된 세션 (gitignore)
scenario-templates/*.json     재사용 가능한 시나리오 템플릿
logs/                         실험 로그 (gitignore)
```

---

## 1. 타입 시스템 (`server/characters/types.ts`)

이 파일이 프로젝트 전체의 소스 오브 트루스다. 변경 시 서버·클라이언트 양쪽에 영향이 간다.

### 핵심 타입 계층

```
CoCCharacter
  ├── characteristics: CharacterCharacteristics   (STR/CON/SIZ/DEX/APP/INT/POW/EDU)
  ├── derived: DerivedStats                        (hp/mp/san/luck/build/moveRate/damageBonus)
  ├── skills: SkillSet                             (인덱스 시그니처 포함)
  ├── backstory: Backstory                         (CoC 7e 공식 배경 필드 10개)
  ├── equipment: Equipment                         (items/weapons/cash/assets/spendingLevel)
  ├── modelConfig: ModelConfig                     (provider/model/temperature)
  └── sessionState?: SessionState                  (세션 중 뮤터블 상태, 옵셔널)
```

### 주의: SkillSet 인덱스 시그니처

```typescript
interface SkillSet {
  격투?: number
  // ... 명시 필드들 ...
  [skill: string]: number | undefined  // ← 자유 형식 기술 허용
}
```

기술값 조회 시 반드시 `?? 0`로 폴백해야 한다.
```typescript
const baseSkill = char.skills[skill] ?? 0  // undefined 방지
```

### Effect 유니온 타입

판정 결과를 구조화된 Side Effect로 표현한다. `GameState.applyEffects()`가 이를 소비한다.

```typescript
type Effect =
  | { kind: 'stat';      stat: 'hp'|'san'|'mp'|'luck'; delta: number }
  | { kind: 'skill';     skill: string; delta: number; permanent?: boolean }
  | { kind: 'item_gain'; item: ItemObject }
  | { kind: 'item_lose'; itemName: string }
  | { kind: 'status';    status: 'temporaryInsanity'|'indefiniteInsanity'; value: boolean }
```

`skill` kind는 `GameState.applyEffects()`에서 **현재 처리되지 않는다** (TODO 상태).

### TurnContext — AI에게 매 턴 전달되는 컨텍스트

```typescript
interface TurnContext {
  character: CoCCharacter
  sessionState: SessionState    // 현재 HP/SAN/아이템 등
  scenarioId: string
  turnNumber: number
  gmMessage: string
  visibleHistory: TurnRecord[]  // 이 캐릭터가 볼 수 있는 최근 턴
  playMode: PlayMode            // 'immersion' | 'game'
  coCharacters: CoCharacter[]   // 같은 세션의 다른 탐사자
}
```

---

## 2. AI 플레이어 계층 (`server/players/`)

### BasePlayer 추상 패턴

모든 AI 플레이어는 `BasePlayer`를 상속하고 `chat()` 하나만 구현한다.

```typescript
abstract class BasePlayer {
  protected history: Message[]   // 슬라이딩 윈도우: 최대 30개 (15턴)
  protected systemPrompt: string // PlayMode 변경 시 재생성됨

  abstract protected chat(systemPrompt: string, messages: Message[]): Promise<string>

  async takeTurn(ctx: TurnContext): Promise<TurnRecord>           // 단순 1회 호출
  async thinkingTakeTurn(ctx: TurnContext): Promise<TurnRecord>   // 2단계 사고 트리
}
```

### thinkingTakeTurn — 히스토리 관리 패턴

사고 트리의 2단계(내면→행동)는 **스테이징 메시지**를 임시로 히스토리에 쌓은 뒤,
성공 시 단일 턴으로 교체한다. 실패 시 `historySnapshot`으로 완전 롤백한다.

```typescript
const historySnapshot = this.history.length

// 2단계 메시지 임시 push
this.history.push(...stage1...)  // [내면/OOC]
this.history.push(...stage2...)  // [행동]

// 실패 시
this.history.splice(historySnapshot)  // 완전 롤백

// 성공 시 — 스테이징 메시지를 단일 턴으로 교체
this.history.splice(historySnapshot)
this.history.push({ role: 'user', content: baseMessage })
this.history.push({ role: 'assistant', content: fullResponse })
```

이렇게 하면 다음 턴에서 AI가 중간 단계 프롬프트를 보지 않는다.

### ClaudePlayer — Extended Thinking 오버라이드

`thinkingTakeTurn()`을 오버라이드하여 2회 호출 대신 **1회 호출**로 사고 트리를 처리한다.

```typescript
// Extended Thinking 필수 제약:
// 1. temperature 파라미터 제거 (포함 시 API 에러)
// 2. betas 배열에 'interleaved-thinking-2025-05-14' 필요
// 3. max_tokens: 16000 / budget_tokens: 10000
const response = await this.client.messages.create({
  model: ...,
  max_tokens: 16000,
  thinking: { type: 'enabled', budget_tokens: 10000 },
  // temperature: 제거!
  betas: ['interleaved-thinking-2025-05-14'],
})

// 응답에서 text 블록만 추출 (thinking 블록 제외)
const textBlocks = response.content.filter(b => b.type === 'text')
```

Extended Thinking 실패 시 `super.thinkingTakeTurn(ctx)`로 폴백한다. 히스토리를 건드리지 않고 호출하면 됨.

---

## 3. 프롬프트 생성 (`server/characters/prompt-generator.ts`)

### 모드 분기

`generateSystemPrompt(char, mode)` → `buildImmersionPrompt()` 또는 `buildGamePrompt()`

| 모드 | 설명 | AI 인식 |
|------|------|---------|
| `immersion` | "당신은 {캐릭터}입니다" | 자신이 캐릭터 본인 |
| `game` | "당신은 TRPG 플레이어입니다" | 캐릭터를 조종하는 플레이어 |

`setPlayMode()`를 호출하면 시스템 프롬프트가 즉시 재생성된다. 히스토리는 유지됨.

### buildTurnMessage — 턴마다 생성되는 컨텍스트

매 턴 AI에게 전달되는 user 메시지 구성:

```
[현재 상태 — 턴 N]   HP / SAN / MP / 행운 / 광기 상태 / 부상
[소지품]             currentItems 목록
[함께하는 탐사자]    coCharacters (다른 캐릭터)
[알고 있는 인물]     knownNpcs
[직전 행동]          visibleHistory 최근 3턴의 response.action
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{gmMessage}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
어떻게 하겠습니까?
```

### 응답 형식 분리 원칙 (2026-04-12 리팩토링)

**시스템 프롬프트 = 캐릭터 정체성 + 게임 규칙 + 행동 지침만** (형식 없음)
**응답 형식은 호출 시점에 결정** — 두 경로로 분기:

| 호출 방식 | 형식 전달 방법 |
|---------|-------------|
| `takeTurn()` (원샷) | `buildSingleShotInstruction(mode, provider)` → 턴 메시지 끝에 추가 |
| `thinkingTakeTurn()` (사고 트리) | stage 지시문 (`buildInnerStageInstruction` 등) |
| `ClaudePlayer.thinkingTakeTurn()` | `buildThinkingTreeSystemSuffix(mode, provider)` → 시스템 프롬프트 뒤에 추가 |

이 구조 덕분에 시스템 프롬프트와 응답 형식이 서로 충돌하지 않는다.
프롬프트 수정 시: 캐릭터 설정 → 시스템 프롬프트, 형식 → 각 지시문 함수 수정.

### parseResponse — AI 응답 파싱

`**[행동]**`, `**[내면]**`, `**[OOC]**` 태그를 정규식으로 추출한다.
`[OOC]`는 game 모드에서 `[내면]` 대신 사용 — 동일한 `inner` 필드로 파싱됨.

```typescript
// 반환 타입: { action: string, inner?: string, rawText: string }
// [OOC]와 [내면] 모두 inner 필드로 파싱
innerMatch = raw.match(/(\\*\\*\\[내면\\]\\*\\*|\\*\\*\\[OOC\\]\\*\\*)\\s*.../)
```

### 모델별 힌트 분리

`getProviderBehaviorHints(provider)` → **시스템 프롬프트용** (행동/성격 관련)
`getProviderFormatHints(provider)` → **응답 형식 지시문용** (형식 관련, Gemini 번호 목록 금지 등)

| 모델 | 행동 힌트 (시스템) | 형식 힌트 (지시문) |
|------|---------|---------|
| Claude | GM 묘사 확장만, 직접 생성 금지 | — |
| Gemini | 묘사 안 된 장소/인물 금지, 시간 점프 금지 | 번호 목록 없이 서술형 |
| OpenAI | GM 질문 먼저 답하기 | — |
| Ollama | 한국어로만 응답 | — |

### 사고 트리 단계 지시문

`thinkingTakeTurn`의 2단계 호출에 사용되는 함수들 (모두 mode + provider 파라미터 수용):

```
buildInnerStageInstruction(mode)            → Stage 1: [내면]/[OOC] 역할 설명 포함
buildActionStageInstruction(mode, provider) → Stage 2: [행동] 역할 + 형식 힌트 포함
buildSingleShotInstruction(mode, provider)  → takeTurn()용 원샷 형식 지시문
buildThinkingTreeSystemSuffix(mode, provider) → Claude Extended Thinking용
```

**game 모드**: `[내면]` → `[OOC]` 태그 사용 (stage 지시문 + single-shot 모두 자동 분기)

---

## 4. 게임 상태 (`server/game/state.ts`)

### GameState — 세션 중 뮤터블 상태 관리

`CoCCharacter` JSON은 불변(소스 오브 트루스), `SessionState`가 세션 중 변경 사항을 추적한다.
두 개의 Map을 유지한다:

```typescript
private states: Map<string, SessionState>      // 세션 중 변경 가능
private characters: Map<string, CoCCharacter>  // 불변 참조용
```

### 광기 자동 판정 규칙 (CoC 7e)

`applySanLoss()`에서 자동으로 처리된다:

```typescript
// 한 번에 SAN 5 이상 손실 → 일시적 광기
if (amount >= 5) state.temporaryInsanity = true

// 세션 누적 SAN 손실 ≥ 최대SAN의 1/5 → 무기한 광기
const threshold = Math.floor(char.derived.san.max / 5)
if (state.sessionSanLoss >= threshold) state.indefiniteInsanity = true
```

### applyEffects — Effect 디스패치

`Judgment Event System`이 `Effect[]`를 넘기면 자동 처리한다.

```typescript
// stat: delta 부호로 damage vs restore 구분
case 'stat':
  if (effect.delta < 0) this.applyDamage(charId, Math.abs(effect.delta))
  else this.restoreHp(charId, effect.delta)

// skill kind: 현재 미구현 (session state에 별도 delta 추적 없음)
```

### 행운 상한 제한

`restoreLuck()`은 `char.derived.luck`(초기값)을 상한으로 캡핑한다.
세션 중 행운을 올려도 캐릭터 시트의 초기 행운을 초과하지 않는다.

---

## 5. 판정 시스템 (`server/game/dice.ts` + `server/game/judgment.ts`)

### skillCheck — 6-tier 판정 계산

```typescript
// 기본 계산식
극단적 성공:  roll ≤ floor(target / 5)
어려운 성공:  roll ≤ floor(target / 2)
성공:         roll ≤ target
실패:         roll ≤ floor((baseSkill + 95) / 2)
나쁜 실패:    나머지 (< fumble threshold)
대실패:       roll ≥ 96 (baseSkill ≥ 50) 또는 roll = 100 (baseSkill < 50)
```

`difficulty`에 따라 `target` 조정 (regular = 기본값, hard = /2, extreme = /5).

### getOutcomeForTier — 결과 폴백 체인

GM이 특정 tier의 Outcome을 정의하지 않았을 때의 폴백:

```typescript
case 'hard_success':  outcomes.hardSuccess ?? outcomes.extremeSuccess ?? null
case 'bad_failure':   outcomes.badFailure ?? outcomes.regularFailure ?? null
case 'fumble':        outcomes.fumble ?? outcomes.badFailure ?? null
```

---

## 6. API 서버 (`server/api.ts`)

### GameSession 인메모리 구조

```typescript
interface GameSession {
  id: string
  name: string
  characters: Map<string, CoCCharacter>  // 캐릭터 시트 (불변)
  players: Map<string, BasePlayer>       // AI 플레이어 인스턴스
  state: GameState                       // 세션 뮤터블 상태
  scenario: ScenarioManager              // 세션 저장/로드
  logger: ExperimentLogger               // AI 행동 분석
  turnNumber: number
  npcs: NPC[]
  items: { name: string; location: string; description: string }[]
  openingBriefing: string
  turnOrder: string[]                    // charId 순서 배열
  chatLog: ChatMessage[]
  clients: Set<WebSocket>               // 연결된 웹소켓 클라이언트들
  isProcessing: boolean                  // AI 처리 중 잠금
  turnQueue: QueuedTurn[]               // 처리 대기 큐
  pendingStatsBefore: Map<string, {...}> | null  // 턴 시작 전 스탯 스냅샷
  pendingDiceResults: {...}[]            // 다음 AI 턴에 주입할 판정 결과
  playMode: PlayMode
}
```

### WebSocket 메시지 프로토콜

**클라이언트 → 서버**:

| 타입 | 주요 페이로드 |
|------|------------|
| `start_session` | `setup: SessionSetupData` |
| `send_turn` | `gmText, targetLabel, targetIds` |
| `set_order` | `order: string[]` |
| `adjust_stat` | `charId, stat, delta` |
| `introduce_npc` | `charId, npc` — 특정 캐릭터 또는 전체에게 NPC 소개 |
| `judgment_request` | `charId, skill, difficulty, outcomes: JudgmentOutcomes` |

**서버 → 클라이언트**:

| 타입 | 설명 |
|------|------|
| `state_update` | 캐릭터 상태 배열 (HP/SAN 변경 시마다) |
| `ai_response` | `{charId, charName, text, done}` — 응답 완료 시 `done: true` |
| `judgment_result` | 판정 완료 + 효과 적용 결과 |
| `turn_complete` | 해당 턴의 모든 AI 응답 완료 |
| `order_updated` | 턴 순서 변경 확인 |

### pendingDiceResults — 판정 결과를 다음 AI 턴에 주입

`judgment_request` 처리 → `pendingDiceResults[]`에 저장 → 다음 `send_turn` 때 GM 메시지 앞에 붙여서 AI에게 전달.
AI가 판정 결과를 인지하고 응답할 수 있게 한다.

---

## 7. 세션 관리 및 로그 (`server/game/scenario.ts`, `server/game/logger.ts`)

### ScenarioManager 저장 경로

```
./scenarios/{scenarioId}.json    — 전체 세션 JSON (TurnRecord[] 포함)
./logs/{scenarioId}.log          — 인간이 읽기 편한 텍스트 로그
./logs/{scenarioId}-experiment.json — ExperimentLogger 분석 데이터
```

`scenarios/`와 `logs/`는 `.gitignore`에 포함되어 있다.

### ExperimentLogger — AI 행동 플래그

매 TurnRecord에서 텍스트 휴리스틱으로 자동 감지:

| 플래그 | 감지 조건 |
|--------|---------|
| `meta_awareness` | "AI", "언어모델", "Claude" 등 자기 언급 |
| `self_preservation` | "살아야", "도망" 등 생존 키워드 |
| `panic` | "미쳐", "비명" 등 공황 키워드 |
| `denial` | "말도 안 돼", "불가능" 등 부정 키워드 |
| `curiosity_override` | "더 알고 싶", "조사" 등 호기심 키워드 |
| `sacrifice` | "대신", "희생" 등 |
| `helplessness` | "포기", "어쩔 수 없" 등 |

---

## 8. 클라이언트 (`client/src/`)

### Zustand 스토어 (`store.ts`)

단일 스토어에 모든 UI 상태 집중. 주요 필드:

```typescript
screen: 'home' | 'session_setup' | 'game'
characters: CharacterState[]
chatMessages: ChatMessage[]
isProcessingTurn: boolean
ws: WebSocket | null
wsReady: boolean
playMode: PlayMode
```

### 컴포넌트 역할 요약

| 컴포넌트 | 역할 |
|---------|------|
| `App.tsx` | WebSocket 연결 관리, 서버 메시지 → 스토어 dispatch |
| `HomeScreen.tsx` | 저장된 세션 목록 + 새 세션 버튼 |
| `SessionSetup.tsx` | 캐릭터 선택, NPC/아이템 설정, 오프닝 브리핑, 플레이 모드 선택 |
| `GameScreen.tsx` | ChatFeed + GmInput + CharacterStatus 레이아웃 |
| `ChatFeed.tsx` | 채팅 로그 표시 (gm_scene / ai_response / dice_result) |
| `GmInput.tsx` | GM 텍스트 입력 + 타겟 선택 + 액션 칩 (판정/NPC/순서) |
| `CharacterStatus.tsx` | HP/SAN/행운 사이드바 |
| `ActionRequestModal.tsx` | GM이 수동으로 판정 요청할 때 (기술/난이도/6단계 결과 입력) |
| `NpcSpeechModal.tsx` | NPC 소개 입력 |
| `TurnOrderModal.tsx` | 턴 순서 드래그 앤 드롭 편집 |
| `CharacterEditor.tsx` | 캐릭터 시트 생성/편집 + JSON import/export |
| `ScenarioEditor.tsx` | 시나리오 템플릿 생성/편집 |

### Vite 개발 프록시

```
/api  → http://localhost:3001
/ws   → ws://localhost:3001
```

---

## 9. 데이터 파일 스키마

### 캐릭터 시트 (`characters/{id}.json`)

파일명 = `id` 필드 (예: `jisu.json` → `id: "jisu"`).
`modelConfig.provider`가 어떤 AI 플레이어 클래스를 사용할지 결정한다.

현재 캐릭터:
- `jisu` — 이지수 (형사, Claude)
- `minho` — 박민호 (의사, Gemini)
- `yerin` — 최예린 (기자, GPT-4o)

### 시나리오 템플릿 (`scenario-templates/{id}.json`)

세션 시작 시 NPC/아이템/오프닝 브리핑을 불러올 수 있는 재사용 가능한 설정.
`/api/scenario-templates` 엔드포인트로 CRUD 관리.

---

## 10. 개발 환경 및 스크립트

```bash
npm run dev          # 서버(tsx watch) + 클라이언트(vite) 동시 실행
npm run server:dev   # 서버만
npm run client:dev   # 클라이언트만
npm run build        # 클라이언트 빌드
```

환경변수 (`.env`):
```
ANTHROPIC_API_KEY
GOOGLE_API_KEY
OPENAI_API_KEY
OLLAMA_HOST=http://localhost:11434
PORT=3001
```

서버 진단 로그: `logs/server.log` (dev-logger.ts)

---

## 11. 알려진 이슈 및 다음 작업 (DEVLOG.md 기준)

### 완료된 작업 (2026-04-12)

- `getCharacterStates()` 아이템 버그 수정: `char.equipment.items` → `s.currentItems.map(i => i.name)`
- `pendingAttempt` 단일값 → 큐(`pendingAttempts[]`) 구조로 변경
- playMode 기본값 서버/클라이언트 통일: `'game'`
- game 모드 `[OOC]` 태그 파싱 버그 수정 (`parseResponse`)
- 사고 트리 stage 지시문 mode 전달 누락 수정
- **시스템 프롬프트에서 응답 형식 분리** (리팩토링)

### 완료된 작업 (2026-04-14)

- **[시도] A경로 전체 제거**: AI의 `**[시도]**` 태그 출력 + `attempt_declared` 브로드캐스트 + `AttemptReviewModal` + `pendingAttempts` 큐 삭제
- 사고 트리 3단계(내면→시도→행동) → 2단계(내면→행동)로 축소
- `detectSkillFromText()` 함수 삭제 (`judgment.ts`)
- 판정은 GM이 ActionRequestModal(B경로)로만 시작하는 구조로 단순화

### 남은 작업

1. **CoC 7th 공식 기술 목록 교체**: 현재 약 50개이나 누락 가능성 있음. 변경 범위: `ActionRequestModal`, `client/src/constants/skills.ts (COC_SKILLS)`, `CharacterEditor`, `types.ts SkillSet`
2. **판정 후 자동 AI 턴 실행**: `judgment_result` 수신 후 GM이 별도로 `send_turn`을 날려야 AI가 판정 결과를 인지함. 자동화 옵션 설계 필요.
3. **기술값 0 숨김**: `ActionRequestModal` 드롭다운에서 해당 캐릭터의 0 기술값 항목 제외
4. **턴 플로우 자동화**: 턴 순서 연동 자동 진행 옵션 (설계 미확정)
5. **코드 정리**: 판정 시스템 중복 로직 통합, `accumulatedContext` 재구성 개선
