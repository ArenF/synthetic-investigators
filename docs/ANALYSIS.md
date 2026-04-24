# Synthetic Investigators — 코드베이스 종합 분석

> 분석일: 2026-04-22 | 코드 규모: ~6,300줄 (서버 13파일 + 클라이언트 15파일)

---

## 1. 프로젝트 비전과 기능 종합

### 핵심 비전

**"AI 모델들을 CoC 7판 탐사자로 배치해서, 인간 GM이 운영하는 TRPG 세션에서
서로 다른 AI가 어떻게 행동하는지 관찰하는 실험 플랫폼"**

단순 TRPG 도구가 아니라 **AI 행동 실험 플랫폼**이다.
ExperimentLogger의 행동 플래그(`meta_awareness`, `self_preservation`, `curiosity_override` 등)가 그 증거.

### 현재 구현된 기능 맵

| 영역 | 구현 상태 | 핵심 파일 |
|------|----------|----------|
| 멀티 프로바이더 (5종) | Claude, Gemini, OpenAI, Grok, Ollama | `server/players/*.ts` |
| 사고 트리 (2단계) | 내면/OOC → 행동 순차 호출 | `base-player.ts` |
| 판정 시스템 | CoC 7e 6-tier 판정 + Effect 자동 적용 | `dice.ts`, `judgment.ts` |
| 상태 관리 | HP/SAN/MP/Luck/아이템/광기 추적 | `state.ts` |
| NPC 시스템 | 소개/대화, 캐릭터별 인지 범위 | `api.ts` (introduce_npc, npc_speak) |
| 세션 관리 | 저장/로드, 시나리오 템플릿 재사용 | `scenario.ts`, ScenarioEditor |
| 실험 로깅 | 행동 플래그 자동 감지, JSON 분석 데이터 | `logger.ts` |
| 2가지 플레이 모드 | immersion (과몰입) / game (메타 인식) | `prompt-generator.ts` |
| 히스토리 압축 | 슬라이딩 윈도우 30 + 오래된 턴 요약 | `context.ts`, `base-player.ts` |
| GM 도구 | 타겟 지정, 턴 큐, 턴 순서, 스탯 수동 조정 | `GmInput.tsx`, `ActionRequestModal.tsx` |

### 프로젝트 구조 요약

```
server/
  api.ts                      Express + WebSocket (메인 진입점, ~700줄)
  characters/
    types.ts                  CoC 7e 전체 타입 (소스 오브 트루스)
    prompt-generator.ts       시스템 프롬프트 + 턴 메시지 + 파싱
  players/
    base-player.ts            추상 BasePlayer (takeTurn, thinkingTakeTurn)
    claude-player.ts          Claude API 구현
    gemini-player.ts          Gemini API 구현
    openai-player.ts          OpenAI API 구현
    grok-player.ts            xAI/Grok API 구현
    ollama-player.ts          Ollama 로컬 모델 구현
    index.ts                  createPlayer() 팩토리
  game/
    state.ts                  GameState — HP/SAN/아이템 세션 상태
    dice.ts                   skillCheck(), d100(), rollDice()
    judgment.ts               Judgment Event System (6-tier + Effect)
    scenario.ts               ScenarioManager — 세션 저장/로드
    logger.ts                 ExperimentLogger — AI 행동 플래그 분석
    context.ts                buildContextMessages() — 히스토리 압축
    dev-logger.ts             개발 진단 로거

client/src/
  store.ts                    Zustand 글로벌 상태
  App.tsx                     WebSocket 연결 + 메시지 라우팅
  components/
    HomeScreen.tsx             메인 메뉴 (4개 카드)
    SessionSetup.tsx           세션 생성 (캐릭터/NPC/아이템/브리핑/모드)
    GameScreen.tsx             게임 레이아웃 (사이드바 + 채팅)
    ChatFeed.tsx               채팅 메시지 렌더링
    GmInput.tsx                GM 입력 + 타겟/판정/NPC/순서 칩
    CharacterStatus.tsx        HP/SAN 사이드바
    ActionRequestModal.tsx     판정 요청 모달 (6-tier 결과 설정)
    NpcSpeechModal.tsx         NPC 대화 입력
    TurnOrderModal.tsx         턴 순서 편집
    CharacterEditor.tsx        캐릭터 시트 CRUD
    ScenarioEditor.tsx         시나리오 템플릿 CRUD
    ScenarioList.tsx           시나리오 목록
    LogViewer.tsx              세션 로그 조회
```

---

## 2. 프로덕트로 부족하거나 애매한 점

### 2.1 아키텍처 / 인프라

#### A. 인메모리 단일 프로세스 한계
- **위치**: `api.ts:125` — `const sessions = new Map<string, GameSession>()`
- **문제**: 서버 재시작 시 활성 세션 소멸. 디스크 저장은 되지만 AI 플레이어 인스턴스와 히스토리는 복구 불가
- **영향**: 동시 세션이 많아지면 메모리 폭발 가능 (각 세션이 캐릭터별 히스토리를 메모리에 보유)

#### B. 세션 복구 경로 미완성
- **위치**: `scenario.ts:66-80` (load), `base-player.ts:22` (history)
- **문제**: `ScenarioManager.load()`로 턴 기록은 복구되지만, `BasePlayer.history`(AI 대화 히스토리)는 재구성되지 않음
- **영향**: 세션을 재개하면 AI가 이전 대화를 모르는 상태로 시작
- **추가**: `ScenarioList.tsx`에서 기존 세션 목록은 보여주지만, 게임 화면으로 재개하는 동선이 없음

#### C. WebSocket 연결 하드코딩
- **위치**: `App.tsx:11` — `` `ws://${hostname}:3001` ``
- **문제**: 포트 3001 하드코딩. 프로덕션 배포 시 프록시 뒤에서 동작 안 함
- **해결**: Vite 프록시 설정과 일관되게 상대 경로 사용 필요

#### D. 에러 처리 / 복원력
- **위치**: `api.ts:448-453` (drainTurnQueue catch)
- **문제**: AI 호출 실패 시 클라이언트에 `{ type: 'error' }`만 전달. **어떤 캐릭터의 턴이 실패했는지** 구체적 피드백 없음
- **추가**: `drainTurnQueue` catch에서 `isProcessing = false` 처리는 되지만, 큐에 남은 턴은 버려짐

---

### 2.2 게임 로직 / 규칙 충실도

#### A. Effect 'skill' kind 미구현
- **위치**: `state.ts:179` — `// 'skill' effects: not tracked in session state`
- **문제**: 기술값 향상/감소가 판정 Effect로 정의되더라도 실제 적용 안 됨
- **상태**: CLAUDE.md에 TODO로 명시되어 있음

#### B. NPC 대화가 AI에게 전달되지 않음
- **위치**: `api.ts:972-985` (`npc_speak` 핸들러)
- **문제**: `chatLog`에 추가 + 클라이언트 브로드캐스트만 함. **AI 플레이어의 히스토리에는 주입되지 않음**
- **영향**: AI가 NPC의 실시간 대사를 인지할 방법이 없음
- **참고**: `introduce_npc`은 `SessionState.knownNpcs`에 추가되어 턴 메시지의 `[알고 있는 인물]` 블록으로는 전달됨

#### C. 세션 전역 아이템 미활용
- **위치**: `api.ts:65-66`, `SessionSetup.tsx:277-307`
- **문제**: `SessionSetup`에서 등록한 `items`는 `GameSession.items`에 저장되지만, **AI에게 전달되지 않고 게임 로직에서도 사용 안 됨**
- **영향**: 장소의 단서, 숨겨진 아이템 등을 시스템적으로 다룰 수 없음

#### D. 전투 라운드 시스템 부재
- CoC 7e는 전투 시 DEX 순서로 라운드를 진행하지만, 현재 턴 순서는 수동 설정만 가능
- 전투 라운드, 행동 순서, 반격, 밀어붙이기 등 전투 메커니즘 없음

#### E. 대항 판정 / 보너스-페널티 다이스 미구현
- **위치**: `dice.ts:48-82`
- `skillCheck()`는 단순 판정만 지원
- CoC 7e의 대항 판정(opposed roll), 보너스/페널티 다이스, 밀어붙이기(pushing) 미구현

---

### 2.3 AI 플레이어 동작

#### A. 순차 처리 모델의 한계
- **위치**: `api.ts:310` — `for (const charId of targetIds)` (직렬 루프)
- **문제**: 같은 턴에 여러 캐릭터가 순차 처리됨. `accumulatedContext`로 이전 캐릭터 행동을 다음에게 전달
- **영향**: "순서대로 대화"에는 맞지만, **동시 행동**(전투, 동시 탐색)에는 부적절

#### B. 다른 캐릭터의 이전 턴 행동이 보이지 않음
- **위치**: `api.ts:319-321` — `charTurns = allTurns.filter(t => t.characterId === charId)`
- **문제**: `TurnContext.visibleHistory`가 **해당 캐릭터 자신의** 최근 턴만 포함
- **영향**: AI가 같은 파티원의 지난 턴 행동을 히스토리로 보지 못함 (현재 턴의 accumulatedContext만 가능)

#### C. Provider별 max_tokens 불일치
- **위치**: 각 플레이어 파일
- Claude/OpenAI/Grok: `max_tokens: 1024`
- Gemini: `maxOutputTokens: 4096`
- Ollama: `num_predict: 1024`
- **영향**: 4배 차이로 Gemini만 훨씬 긴 응답 생성 가능

#### D. Extended Thinking 체크박스가 데드 UI
- **위치**: `CharacterEditor.tsx:419-431`
- `extendedThinking` 체크박스가 UI에 존재하지만, 어떤 플레이어 클래스에서도 이 값을 사용하지 않음
- CLAUDE.md에 commit `214b9fe`에서 제거됨으로 명시

---

### 2.4 UI / UX

#### A. GM 입력이 단일행 input
- **위치**: `GmInput.tsx:210` — `<input type="text">`
- **문제**: TRPG GM은 여러 문단의 장면 묘사가 필요한데 한 줄 입력창만 제공
- **해결**: `<textarea>` + Shift+Enter 줄바꿈 / Enter 전송

#### B. 세션 재개 UI 동선 누락
- **위치**: `HomeScreen.tsx`
- **문제**: "이전 세션 재개" 버튼 없음. LogViewer에서 과거 세션을 볼 수는 있지만 게임 화면으로 이어지지 않음

#### C. MP/행운 수동 조정 UI 없음
- **위치**: `CharacterStatus.tsx` — StatControl이 hp, san에만 존재
- **문제**: 서버는 `adjust_stat`에서 mp/luck을 지원하지만, 사이드바 UI에 조정 버튼이 없음
- **추가**: 조정 수치가 항상 1. 큰 피해 시 반복 클릭 필요

#### D. 다크 모드 only, 모바일 미대응
- CSS 변수 기반이지만 라이트 테마 없음
- GameScreen 레이아웃이 고정 사이드바 210px — 좁은 화면에서 채팅 영역 거의 안 보임

#### E. 캐릭터 삭제 기능 없음
- `POST /api/characters`로 생성/수정만 가능. 삭제 API와 UI 모두 미구현

---

### 2.5 실험 / 분석 기능

#### A. ExperimentLogger 휴리스틱 한계
- **위치**: `logger.ts:71-98`
- 키워드 매칭 기반만 사용. "조사"라는 단어만으로 `curiosity_override` 플래그가 뜨는 식
- 오탐(false positive) 많을 수밖에 없음

#### B. 분석 시각화 / 비교 도구 부재
- 프로젝트 핵심 비전이 "다른 AI들의 행동 비교"인데:
  - 같은 상황에서 다른 모델의 반응을 **나란히 비교**하는 뷰 없음
  - 실험 메트릭 대시보드 (모델별 SAN 감소 곡선, 행동 플래그 빈도 등) 없음
  - JSON 파일을 직접 열어봐야 함

#### C. 재현성 (Reproducibility)
- **위치**: `dice.ts:9` — `Math.floor(Math.random() * 100) + 1`
- `Math.random()` 기반이라 시드 고정 불가능
- 같은 시나리오를 반복 실험할 때 주사위 결과를 통제할 수 없음

---

### 2.6 코드 품질 / 유지보수

#### A. 타입 중복 (서버 ↔ 클라이언트)
- `CharacterState`, `ChatMessage`, `NPC`, `SessionSetupData` 등이 `api.ts`와 `store.ts`에 **각각 따로 정의**
- 한쪽이 바뀌면 다른 쪽이 조용히 깨질 수 있음
- 공유 타입 패키지(`shared/types.ts`) 필요

#### B. 인라인 스타일 과다
- 거의 모든 컴포넌트가 `style={{...}}`로 직접 스타일링
- CSS 변수를 쓰고 있지만 재사용성 낮음
- Tailwind를 설치해 놓고 부분적으로만 사용 중 (혼재)

#### C. `api.ts` 단일 파일 비대 (~700줄)
- REST 핸들러 + WebSocket 핸들러 + 게임 로직 + 헬퍼가 전부 한 파일
- WebSocket 메시지 핸들러만 분리해도 가독성 크게 개선

#### D. 테스트 부재
- Playwright가 devDependency에 있지만 테스트 파일 없음
- 판정 로직(`dice.ts`, `judgment.ts`)에 유닛 테스트 없음 — 규칙 버그가 조용히 생길 수 있음

#### E. 타입 안전성 구멍
- `CharacterEditor`의 `char`가 `any` 타입
- WebSocket `msg: any` 전반적으로 런타임에서만 발견되는 오류 가능

---

### 2.7 CLAUDE.md 남은 작업 vs 실제 코드

| 남은 작업 | 실제 상태 |
|---------|---------|
| yerin `말돌리기` 기술 교정 | **미수정** — `characters/yerin.json`에 여전히 존재 |
| 판정 후 자동 AI 턴 실행 | **미구현** — GM이 수동으로 send_turn 해야 함 |
| 턴 플로우 자동화 | **설계조차 미확정** |
| 코드 정리 (판정 중복, accumulatedContext) | **미착수** |

---

## 3. 우선순위 제안

### P0 — 지금 안 고치면 쓸 수 없음

| # | 항목 | 이유 | 관련 파일 |
|---|------|------|----------|
| 1 | **세션 복구 (AI 히스토리 재구성)** | 서버 재시작하면 게임 못 이어감 | `api.ts`, `base-player.ts` |
| 2 | **NPC 대화 → AI 히스토리 주입** | AI가 NPC 말을 완전히 무시함 | `api.ts:972-985` |
| 3 | **GM 입력을 textarea로 변경** | 한 줄로는 GM 운영 불가 | `GmInput.tsx:210` |

### P1 — 핵심 가치에 직결

| # | 항목 | 이유 | 관련 파일 |
|---|------|------|----------|
| 4 | **공유 타입 패키지** | 타입 drift가 이미 시작됨 | `api.ts`, `store.ts` |
| 5 | **모델 비교 뷰 + 실험 대시보드** | 프로젝트 비전의 핵심인데 출력 없음 | 신규 |
| 6 | **세션 재개 UI 동선** | 기능은 절반 있는데 UX 경로 끊김 | `HomeScreen.tsx` |
| 7 | **다른 캐릭터 행동 가시성** | AI가 파티원 행동을 히스토리로 못 봄 | `api.ts:319-321` |

### P2 — 운영 품질 개선

| # | 항목 | 이유 | 관련 파일 |
|---|------|------|----------|
| 8 | **`api.ts` 파일 분리** | 유지보수 비용 누적 | `api.ts` |
| 9 | **판정 후 자동 AI 턴 옵션** | GM 워크플로우 개선 | `api.ts` |
| 10 | **`skill` Effect 구현** | CoC 규칙 충실도 | `state.ts:179` |
| 11 | **MP/행운 조정 UI 추가** | 서버는 지원하는데 UI 누락 | `CharacterStatus.tsx` |
| 12 | **Extended Thinking 데드 UI 제거** | 혼란 유발 | `CharacterEditor.tsx:419` |
| 13 | **WS 포트 하드코딩 제거** | 배포 시 필수 | `App.tsx:11` |

### P3 — 기능 확장

| # | 항목 | 이유 | 관련 파일 |
|---|------|------|----------|
| 14 | 전투 라운드 / 대항 판정 | CoC 규칙 확장 | `dice.ts` |
| 15 | 주사위 시드 고정 (재현성) | 실험 재현 가능성 | `dice.ts:9` |
| 16 | 캐릭터 삭제 API + UI | 기본 CRUD 완성 | `api.ts`, `CharacterEditor.tsx` |
| 17 | max_tokens 통일 / 설정화 | 모델 간 공정 비교 | 각 플레이어 파일 |
| 18 | 핵심 로직 유닛 테스트 | 규칙 버그 방지 | 신규 |
| 19 | 모바일 반응형 | 접근성 | `GameScreen.tsx` |

---

## 4. 잘 된 점 (강점)

코어 설계에서 인상적인 부분들:

- **사고 트리 2단계 + 히스토리 스테이징/롤백**: 중간 단계 프롬프트를 다음 턴에서 보이지 않게 하는 패턴이 깔끔
- **Effect 유니온 타입**: `stat | skill | item_gain | item_lose | status`로 판정 결과를 구조화. 확장성 좋음
- **판정 폴백 체인**: GM이 모든 tier를 정의할 필요 없이 자동으로 상위/하위 tier로 폴백
- **프롬프트 형식 분리 원칙**: 시스템 프롬프트(캐릭터 정체성)와 응답 형식(호출 시점 결정)을 분리
- **모델별 성격 프로필**: game 모드에서 각 AI에게 고유 성격과 말투를 부여하는 아이디어
- **개발 진단 로거**: API 키 마스킹, 타이밍, 응답 미리보기 등 디버깅에 유용
