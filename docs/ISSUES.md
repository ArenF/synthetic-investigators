# Code Issues — 2026-04-24

전체 코드 리뷰 후 발견된 이슈 목록. 심각도 순 정리.

---

## 1. 버그 — 수정 완료

### 1-1. ~~`applySanLoss()` — 무기한 광기 threshold 계산 오류~~ (수정됨)

- **파일**: `server/game/state.ts`
- **심각도**: 높음 (게임 밸런스 직결)
- **수정일**: 2026-04-24

**문제**: `Math.floor(state.san / 5)` — 현재 SAN 기준으로 threshold를 계산.
SAN이 감소할수록 threshold도 줄어들어 무기한 광기가 점점 쉽게 발동되는 양성 피드백 루프 발생.

**수정**: `char.derived.san.starting / 5`로 변경. CoC 7e 규칙(시작 SAN의 1/5) 준수.

---

### 1-2. ~~`yerin.json` — 비표준 기술명 2개~~ (수정됨)

- **파일**: `characters/yerin.json`
- **심각도**: 중간 (판정 시 기술값 0% 처리)
- **수정일**: 2026-04-24

| 수정 전 | 수정 후 | 기술값 |
|---|---|---|
| `말돌리기` | `언변` | 65% |
| `자동차운전` | `운전` | 50% |

---

### 1-3. ~~`rollCombinedCheck()` — `bad_failure` tier 미계산~~ (수정됨)

- **파일**: `server/game/judgment.ts`
- **심각도**: 중간 (combined roll 한정)
- **수정일**: 2026-04-24

**문제**: fumble 아닌 실패가 전부 `regular_failure`로 처리됨. `regularFailureMax` 분기 누락.

**수정**: `regularFailureMax = Math.floor((baseSkill + 95) / 2)` 분기 추가. `skillCheck()`와 동일한 6-tier 판정 적용.

---

## 2. 설계 이슈

### 2-1. ~~`dice_roll` 서버 핸들러 — 데드 코드~~ (삭제됨)

- **파일**: `server/api.ts`
- **수정일**: 2026-04-24

클라이언트에서 미사용. judgment 시스템 도입 전 레거시. 핸들러 + `skillCheck` import 제거.

---

### 2-2. `performSanCheck()` — GameState 캡슐화 위반

- **파일**: `server/game/judgment.ts:600`
- **심각도**: 낮음 (아키텍처)
- **상태**: 미수정

```typescript
updatedState.temporaryInsanity = true  // GameState 메서드 대신 직접 변이
```

`GameState`에 `setTemporaryInsanity(charId, value)` 같은 메서드를 추가하거나,
기존 `applyEffects()`의 `status` kind를 사용하는 것이 일관적이다.

---

### 2-3. `applyEffects()` skill kind — 불변 `CoCCharacter` 직접 변이

- **파일**: `server/game/state.ts:185-189`
- **심각도**: 낮음 (아키텍처)
- **상태**: 미수정

```typescript
// "CoC 7e에서 기술 변경은 영구적이므로 CoCCharacter 직접 변이"
const char = this.getCharacter(charId)
char.skills[effect.skill] = Math.max(0, Math.min(99, current + effect.delta))
```

`CoCCharacter`는 "불변 참조용"으로 설계됐으나 skill effect에서 직접 수정한다.
JSON 파일은 업데이트되지 않으므로 세션 종료 시 변경 소실.
"영구적"이라면 파일도 저장해야 일관적. 아니면 `SessionState`에 skill delta 추적 필드를 두는 것이 정석.

---

### 2-4. ~~`ActionRequestModal` — "전체" 대상 선택 시 첫 번째 캐릭터만 판정~~ (수정됨)

- **파일**: `client/src/components/ActionRequestModal.tsx`
- **수정일**: 2026-04-24

**문제**: `pendingJudgment`가 하나만 유지 가능한데 "전체" 옵션이 존재. 첫 번째 캐릭터만 판정됨.

**수정**: 단순 판정 탭에서 "전체" 옵션 제거. 개별 캐릭터 선택으로 변경. 복수 대상 판정은 그룹 판정 탭 사용.

---

### 2-5. 세션 메모리 관리 — 모든 클라이언트 disconnect 시 세션 즉시 삭제

- **파일**: `server/api.ts:1189-1197`
- **심각도**: 중간 (데이터 유실)
- **상태**: 미수정

```typescript
if (currentSession.clients.size === 0 && !currentSession.isProcessing) {
  sessions.delete(currentSession.id)
}
```

브라우저 새로고침이나 일시적 네트워크 끊김 시 세션이 메모리에서 즉시 삭제된다.
디스크 데이터는 유지되지만, `pendingDiceResults`, `pendingJudgment`, `chatLog` 등 인메모리 상태가 소실된다.
클라이언트 auto-reconnect가 작동할 때 세션이 이미 없는 상태가 된다.

**개선 방향**: TTL 기반 지연 삭제 (예: 5분 후 삭제) 또는 세션 상태 디스크 직렬화.

---

## 3. 경미한 이슈

### 3-1. `DiceResult.outcome` — `'failure'` backward compat 타입 잔존

- **파일**: `server/characters/types.ts:261`
- **상태**: 미수정

`'failure'`가 union 타입에 존재하지만 `skillCheck()`는 이 값을 반환하지 않는다.
`isFailure()`에서만 체크됨. 제거하거나 주석 표기 필요.

---

### 3-2. `sanMax` — `san.starting` vs `san.max` 불일치

- **파일**: `server/api.ts:188`
- **상태**: 미수정

```typescript
sanMax: char.derived.san.starting,  // POW 기반 시작 SAN
```

UI에서 SAN 바의 최대값이 시작 SAN(POW)으로 표시된다.
`restoreSan()`은 `char.derived.san.max` (99 - 크툴루신화%)를 상한으로 사용한다.
일반적으로 SAN이 starting을 초과하는 일은 드물지만, 의미상 불일치.

---

### 3-3. `CharacterStatus` — MP/행운 수동 조정 UI 없음

- **파일**: `client/src/components/CharacterStatus.tsx`
- **상태**: 미수정

HP와 SAN만 ±1 버튼이 있다.
서버의 `adjust_stat`은 `mp`와 `luck`도 지원하지만 UI에 버튼이 없다.

---

## 처리 이력

| # | 이슈 | 상태 | 수정일 |
|---|------|------|--------|
| 1-1 | `applySanLoss()` threshold: `state.san` → `char.derived.san.starting` | **수정됨** | 2026-04-24 |
| 1-2 | yerin 기술명: `말돌리기` → `언변`, `자동차운전` → `운전` | **수정됨** | 2026-04-24 |
| 1-3 | combined roll `bad_failure` 분기 추가 | **수정됨** | 2026-04-24 |
| 2-1 | `dice_roll` 데드 코드 + `skillCheck` import 삭제 | **삭제됨** | 2026-04-24 |
| 2-2 | `performSanCheck()` 캡슐화 위반 | 미수정 | — |
| 2-3 | `applyEffects()` skill kind 직접 변이 | 미수정 | — |
| 2-4 | 단순 판정 "전체" 옵션 제거, 개별 선택으로 변경 | **수정됨** | 2026-04-24 |
| 2-5 | 세션 disconnect 시 즉시 삭제 | 미수정 | — |
| 3-1 | `'failure'` backward compat 타입 | 미수정 | — |
| 3-2 | `sanMax` starting vs max 불일치 | 미수정 | — |
| 3-3 | MP/행운 수동 조정 UI 없음 | 미수정 | — |
