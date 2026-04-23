# CoC 7e 판정 시스템 리빌드

> 작업일: 2026-04-23  
> 브랜치: `dev`

---

## 개요

기존 fire-and-forget 단일 판정 시스템을 CoC 7th Edition 공식 규칙에 맞게 전면 재설계했다.

**핵심 변경**: 판정 요청 → 즉시 Effect 적용 (fire-and-forget) 구조를  
**판정 요청 → 결과 대기(pending) → GM 후속 선택(수락/밀어붙이기/행운소비) → Effect 적용(final)** 다단계 플로우로 전환.

### 지원하는 판정 유형

| 유형 | 설명 | Push/Luck |
|------|------|-----------|
| **단순 판정** (Simple) | 1인 1기술 d100 | Push O / Luck O |
| **대항 판정** (Opposed) | 양측 각각 d100, 성공 등급 비교 | X / X |
| **결합 판정** (Combined) | 1회 d100, 복수 기술 대조 (AND/OR) | Push O / X |
| **그룹 판정** (Group) | 인원별 d100, 협력/전원필수 | X / X |
| **SAN 체크** | d100 vs 현재SAN → 손실 → INT 굴림 → 광기 | X / X |

---

## Phase 1: 다단계 플로우 + 보너스/페널티 다이스

### 1-1. 타입 추가 (`server/characters/types.ts`)

새로 추가된 타입:

```
Difficulty           — 'regular' | 'hard' | 'extreme'
JudgmentOutcomeKey   — 6단계 결과 키
BonusPenaltyDice     — { bonus: 0~2, penalty: 0~2 }
SimpleCheckRequest   — 단순 판정 요청
RollResult           — 개별 굴림 결과
PendingJudgment      — 중간 상태 (Effect 미적용, GM 결정 대기)
JudgmentResolution   — GM 후속 선택 (accept | push | luck_spend)
JudgmentFinalResult  — 확정 결과 (Effect 적용 완료)
```

### 1-2. 보너스/페널티 다이스 (`server/game/dice.ts`)

**`d100WithBonusPenalty(bonus, penalty)`**
- 일다이스(0-9) 1개 고정, 텐다이스(0,10,...,90) 1+|net|개 굴림
- net > 0 (보너스): 최저 텐다이스 채택
- net < 0 (페널티): 최고 텐다이스 채택
- 00+0 = 100 (not 0)

**`skillCheckWithBP(skillValue, skillName, difficulty, bonusPenalty?)`**
- 보너스/페널티 없으면 기존 `skillCheck()`에 위임
- 있으면 `d100WithBonusPenalty()`로 굴림 후 6-tier 판정

### 1-3. 2단계 분리 (`server/game/judgment.ts`)

기존 `performJudgment()` → 삭제, 두 함수로 분리:

**`rollJudgment(session, request) → PendingJudgment`**
- 주사위만 굴림, Effect 미적용
- `canPush`, `canSpendLuck`, `luckCost` 계산
- 반환된 `PendingJudgment`를 세션에 저장

**`resolveJudgment(session, pending, resolution) → JudgmentFinalResult`**
- GM의 결정에 따라 분기:
  - `accept` → 현재 결과 그대로 Effect 적용
  - `push` → 동일 난이도 재굴림 + 대가 텍스트
  - `luck_spend` → 행운 차감 → regular_success로 전환

### 1-4. WS 핸들러 교체 (`server/api.ts`)

**삭제**: `judgment_result` (기존 fire-and-forget)

**신규 프로토콜**:

| 방향 | 타입 | 설명 |
|------|------|------|
| C→S | `judgment_request` | 판정 요청 (simple/opposed/combined/group) |
| S→C | `judgment_pending` | 굴림 완료, GM 결정 대기 |
| C→S | `judgment_resolve` | GM 후속 선택 |
| S→C | `judgment_final` | 확정, Effect 적용 완료 |
| C→S | `judgment_cancel` | 판정 폐기 |
| S→C | `judgment_cancelled` | 폐기 확인 |

`GameSession`에 `pendingJudgment: PendingJudgment | null` 필드 추가. 동시에 1개 판정만 진행 가능.

### 1-5. 클라이언트 상태 (`client/src/store.ts`)

- `pendingJudgment: any | null` 상태 추가
- `setPendingJudgment()` 액션 추가
- `diceData` 타입 확장: `wasPush`, `wasLuckSpend`, `luckSpent`, `tensDice`

### 1-6. 메시지 라우팅 (`client/src/App.tsx`)

- `judgment_result` 핸들러 삭제
- `judgment_pending` → `setPendingJudgment(msg)`
- `judgment_final` → `setPendingJudgment(null)` + ChatFeed에 dice_result 추가
- `judgment_cancelled` → `setPendingJudgment(null)`

### 1-7. 보너스/페널티 UI (`client/src/components/ActionRequestModal.tsx`)

난이도 선택 아래에 ±2 스테퍼 2개 (보너스/페널티) 추가.
상쇄 규칙 자동 표시 (예: "상쇄: 실질 보너스 1개").

### 1-8. 판정 결과 오버레이 (`client/src/components/JudgmentResultOverlay.tsx`) — 신규

`pendingJudgment`가 있을 때 GameScreen 우하단에 표시되는 비차단 패널.

구성:
- 큰 roll 숫자 + 결과 등급 (DiceMessage 스타일)
- 기술/난이도/목표값/기본값 정보
- 텐다이스 breakdown (보너스/페널티 사용 시)
- Outcome 설명 (GM이 설정한 경우)
- 대항/그룹 판정 시 참가자별 결과 표시
- 버튼: [수락] [밀어붙이기] [행운 소비 N점] [취소]
- 상태 힌트 (성공 시 "수락만 가능", 대실패 시 "밀어붙이기/행운 불가")

### 1-9. GameScreen 연동 (`client/src/components/GameScreen.tsx`)

```tsx
{pendingJudgment && <JudgmentResultOverlay />}
```

채팅 영역 내부에 `position: relative` 컨테이너, 오버레이는 `position: absolute`로 배치.

---

## Phase 2: 밀어붙이기 + 행운 소비

### 서버 (`server/game/judgment.ts`)

**밀어붙이기 (`resolvePush`)**:
- 동일 난이도, 동일 보너스/페널티로 재굴림
- 성공 시: 성공 tier outcome 적용
- 실패 시: 실패 tier outcome 적용 + `pushConsequence`(GM 입력 대가) naturalLanguage에 추가
- 1회만 가능 (대항/SAN/전투에서 불가)

**행운 소비 (`resolveLuckSpend`)**:
- `luckCost = roll - target` 만큼 행운 차감
- `regular_success`로 전환, 해당 outcome 적용
- 대실패에서 불가, SAN 체크에서 불가

### 클라이언트 (`client/src/components/ChatFeed.tsx`)

DiceMessage에 배지 추가:
- `wasPush: true` → 주황 "밀어붙이기" 배지
- `wasLuckSpend: true` → 오렌지 "행운 N점" 배지

---

## Phase 3: SAN 체크 시퀀스

### state.ts 수정 (`server/game/state.ts`)

**`applySanLoss()` 수정**:
- **제거**: `amount >= 5` 시 자동 `temporaryInsanity = true` (이제 INT 굴림으로 판정)
- **수정**: 무기한 광기 기준 `char.derived.san.max / 5` → `state.san / 5` (현재 SAN 기준, CoC 7e 정확한 규칙)

**`applyEffects()` 확장**:
- `skill` kind 구현: `char.skills[effect.skill] += effect.delta` (0~99 범위)

### SAN 체크 함수 (`server/game/judgment.ts`)

**`performSanCheck(session, charId, successLoss, failureLoss) → SanCheckResult`**

즉시 실행 (pending 없음 — push/luck 불가):

1. d100 vs 현재 SAN
2. 성공 → `rollDice(successLoss)` SAN 차감
3. 실패 → `rollDice(failureLoss)` SAN 차감
4. 손실 >= 5 → INT 굴림 (d100 vs INT):
   - INT 성공 → 공포 인지 → `temporaryInsanity = true` + 1d10시간
   - INT 실패 → 억압 (즉시 광기 없음)
5. `applySanLoss()` 호출 (누적 + 무기한 광기 자동 체크)

### SanCheckResult 타입 (`server/characters/types.ts`)

```typescript
interface SanCheckResult {
  charId, charName, sanRoll, sanTarget, sanOutcome,
  lossRoll, lossAmount,
  intRoll?, intTarget?, intOutcome?,
  temporaryInsanity, indefiniteInsanity, insanityDuration?,
  naturalLanguage
}
```

### WS 핸들러 (`server/api.ts`)

`san_check` → 즉시 실행 → `san_check_result` 브로드캐스트 + pendingDiceResults 저장 + state_update.

### 클라이언트

- `App.tsx`: `san_check_result` → dice_result ChatMessage로 변환
- `ActionRequestModal.tsx`: [SAN 체크] 탭 추가 (대상 + 성공/실패 손실 입력)

---

## Phase 4: 대항 / 결합 / 그룹 판정

### 타입 확장 (`server/characters/types.ts`)

```typescript
interface OpposedRollRequest {
  type: 'opposed'
  sideA: { charId, skill, bonusPenalty? }
  sideB: { charId?, npcName?, skillValue, skill, bonusPenalty? }
  tieBreaker?: 'attacker' | 'defender'
}

interface CombinedRollRequest {
  type: 'combined'
  charId, skills: string[], condition: 'and' | 'or',
  difficulty?, bonusPenalty?
}

interface GroupRollRequest {
  type: 'group'
  charIds: string[], skill, difficulty?,
  mode: 'cooperative' | 'all_must_succeed', bonusPenalty?
}

type JudgmentRequest = Simple | Opposed | Combined | Group
```

### 성공 등급 비교 (`server/game/dice.ts`)

**`compareSuccessLevels(a, b, tieRule?) → 'a_wins' | 'b_wins' | 'tie'`**

- 등급 순위: extreme(3) > hard(2) > regular(1) > fail(0) > fumble(-1)
- 동일 등급 → 기술값 높은 쪽 승리
- 완전 동점 → `tieRule`로 결정, 없으면 `'tie'`

### 판정 로직 (`server/game/judgment.ts`)

**대항 (`rollOpposedCheck`)**:
- 양측 각각 `skillCheckWithBP()` (난이도 regular 고정)
- `compareSuccessLevels()`로 승패 결정
- Push/Luck 불가

**결합 (`rollCombinedCheck`)**:
- 1회 `d100WithBonusPenalty()` 굴림
- 각 기술의 target에 대해 성공/실패 개별 판정
- `condition: 'and'` → 모두 성공해야 전체 성공
- `condition: 'or'` → 하나 이상 성공이면 전체 성공
- Push 가능, Luck 불가

**그룹 (`rollGroupCheck`)**:
- 인원별 각각 `skillCheckWithBP()` 굴림
- `cooperative` → 1명이라도 성공하면 전체 성공
- `all_must_succeed` → 전원 성공해야 전체 성공
- Push/Luck 불가

### API 변경 (`server/api.ts`)

`judgment_request` 핸들러가 `request` 필드로 전체 `JudgmentRequest` 객체를 직접 수신.
레거시 flat 포맷(charId/skill/difficulty)도 하위 호환 지원.

### 클라이언트 UI (`client/src/components/ActionRequestModal.tsx`)

5탭 구조: **[단순] [대항] [결합] [그룹] [SAN]**

| 탭 | 입력 필드 |
|----|----------|
| 단순 | 대상, 기술, 난이도, 보너스/페널티, 결과 설정 |
| 대항 | A측(캐릭터+기술), B측(캐릭터 or NPC+기술값), 동점 우선 |
| 결합 | 대상, 기술 체크리스트, AND/OR 토글, 난이도 |
| 그룹 | 참가 캐릭터 체크리스트, 기술, 협력/전원 모드, 난이도 |
| SAN | 대상, 성공시 손실, 실패시 손실 |

### 오버레이 확장 (`client/src/components/JudgmentResultOverlay.tsx`)

대항/그룹 판정 시 참가자별 결과 목록 표시 (이름, 기술, 굴림, 결과 등급).

---

## 변경 파일 요약

### 신규 생성

| 파일 | 설명 |
|------|------|
| `client/src/components/JudgmentResultOverlay.tsx` | 판정 결과 + 후속 선택 오버레이 |
| `docs/judgment-system-rebuild.md` | 이 문서 |

### 수정

| 파일 | 주요 변경 |
|------|----------|
| `server/characters/types.ts` | 판정 타입 9종 + SanCheckResult + Opposed/Combined/Group 요청 타입 |
| `server/game/dice.ts` | d100WithBonusPenalty, skillCheckWithBP, compareSuccessLevels |
| `server/game/judgment.ts` | rollJudgment, resolveJudgment, performSanCheck, 대항/결합/그룹 |
| `server/game/state.ts` | SAN 로직 수정 (INT 굴림 분리, 현재SAN 기준), skill Effect 구현 |
| `server/api.ts` | pendingJudgment, 3개 핸들러 교체, san_check, request 객체 지원 |
| `client/src/store.ts` | pendingJudgment 상태, diceData 확장 |
| `client/src/App.tsx` | judgment_pending/final/cancelled/san_check_result 라우팅 |
| `client/src/components/ActionRequestModal.tsx` | 5탭 UI, 보너스/페널티, SAN/대항/결합/그룹 폼 |
| `client/src/components/GameScreen.tsx` | JudgmentResultOverlay 조건부 렌더 |
| `client/src/components/ChatFeed.tsx` | push/luck 배지 |

---

## CoC 7e 규칙 검증 결과

웹 검색을 통해 확인하고 수정한 규칙들:

| 항목 | 기존 (오류) | 수정 (CoC 7e 정확) |
|------|-----------|------------------|
| 밀어붙이기 | 난이도 상향 (regular→hard→extreme), 3회 | 동일 난이도, 1회, GM 서사 대가 |
| 행운 소비 | 미구현 | 1점 = roll 1 감소, 대실패/SAN 불가 |
| SAN 일시적 광기 | 5+ 손실 시 자동 발동 | 5+ 손실 → INT 굴림 → 성공 시 발동 |
| SAN 무기한 광기 | `san.max / 5` 기준 | `현재SAN / 5` 기준 |
| 결합 판정 | 기술별 개별 d100 | 단일 d100, 복수 기술 대조 |
| 대항 방어 | 단순 판정 | 양측 대항 굴림, 성공 등급 비교 |

---

## WS 프로토콜 전체 정리

### Client → Server

| 타입 | 페이로드 |
|------|---------|
| `judgment_request` | `{ request: JudgmentRequest }` 또는 레거시 flat |
| `judgment_resolve` | `{ judgmentId, resolution: JudgmentResolution }` |
| `judgment_cancel` | `{ judgmentId }` |
| `san_check` | `{ charId, successLoss, failureLoss }` |

### Server → Client

| 타입 | 페이로드 |
|------|---------|
| `judgment_pending` | `PendingJudgment` 전체 |
| `judgment_final` | `JudgmentFinalResult` (확정 + Effect) |
| `judgment_cancelled` | `{ judgmentId }` |
| `san_check_result` | `SanCheckResult` 전체 |
