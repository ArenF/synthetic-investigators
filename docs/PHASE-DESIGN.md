# 게임 페이즈 시스템 설계

> 2026-04-22

---

## 전체 레이아웃 변경

### 현재

```
┌─ header ──────────────────────────────────────────────┐
├─ sidebar(210px) ─┬─ ChatFeed ────────────────────────┤
│  CharacterStatus │                                    │
│                  │                                    │
│                  ├─ GmInput ─────────────────────────┤
│                  │  [target] [판정] [NPC] [순서]       │
│                  │  [________________input____________]│
└──────────────────┴────────────────────────────────────┘
```

### 변경 후

```
┌─ header ──────────────────────────────────────────────────────────┐
├─ sidebar(210px) ─┬─ ChatFeed ────────────────────┬─ OrderPanel ─┤
│  CharacterStatus │                                │  (우측 탭)    │
│                  │                                │  DEX 순서 큐  │
│                  │                                │  현재 턴 표시 │
│                  ├─ GmInput ─────────────────────┤              │
│                  │  [조사][전투][대화][이성][추격]  │              │
│                  │  ─────────────────────────────│              │
│                  │  [페이즈별 칩들]                │              │
│                  │  [________textarea________]    │              │
└──────────────────┴───────────────────────────────┴──────────────┘
```

**변경 포인트 3가지:**
1. GmInput 상단에 **페이즈 탭** 추가 (항상 표시)
2. GmInput의 칩 행이 **페이즈별로 동적** 전환
3. 우측에 **OrderPanel** 추가 (조사/대화/전투에서 순서 큐 표시)

---

## 페이즈 탭 (공통)

5개 탭이 GmInput 칩 행 위에 항상 표시.

```
[🔍 조사]  [⚔️ 전투]  [💬 대화]  [🧠 이성]  [🏃 추격]
```

- 현재 활성 페이즈: teal 하이라이트 + 하단 바
- 비활성: muted 색상
- 클릭으로 전환 (서버에 `set_phase` 전송)
- 전환 시 칩 행 + 입력 폼이 해당 페이즈용으로 교체

---

## 우측 OrderPanel (조사/대화/전투 공통)

ChatFeed 오른쪽에 접이식 패널. 좌측 사이드바의 CharacterStatus와 대칭.

```
┌─ OrderPanel (160px) ──────┐
│  순서 (DEX)               │
│  ─────────────────────── │
│  ▶ 1. 이지수  (DEX 70)   │  ← 현재 턴 하이라이트
│    2. 박민호  (DEX 60)   │
│    3. 최예린  (DEX 65)   │
│  ─────────────────────── │
│  [↑][↓] 수동 조정         │
│  [DEX 정렬] 자동 정렬     │
└───────────────────────────┘
```

- **DEX 값 기준 자동 정렬** 버튼 (캐릭터의 DEX 스탯 참조)
- 수동으로 순서 조정도 가능 (↑↓)
- 현재 턴 캐릭터를 `▶`로 표시
- 조사/대화 모드: 자유 순서 (참고용)
- 전투 모드: 강제 순서 (라운드 내 순차 진행)
- 접기/펼치기 토글 가능 (공간 확보)

---

## 페이즈별 칩 + 입력 상세

---

### 1. 조사 모드 (Exploration)

**칩 행:**
```
[target:all▾]  [스킬]  [대항]
```

| 칩 | 동작 |
|----|------|
| `target` | 현재와 동일. 클릭으로 순환 (all → 캐릭터1 → 캐릭터2 → all) |
| `스킬` | 클릭 → **SkillCheckModal** 열림 (현재 ActionRequestModal 리네임) |
| `대항` | 클릭 → **OpposedCheckModal** 열림 (신규: 탐사자 vs 탐사자/NPC 대항 판정) |

**입력 폼:**
```
┌──────────────────────────────────────────────┐
│ ▶ [장면을 묘사하세요... (Shift+Enter 줄바꿈)] │
│   textarea (3줄 기본, 자동 확장)              │
└──────────────────────────────────────────────┘
```

**턴 처리:**
- 현재와 동일: `send_turn` → targetIds 순서대로 AI 순차 응답
- OrderPanel의 순서를 따름

**상태 인디케이터 (우측):**
```
● AI 응답 중...          (isProcessing)
● AI 응답 중 (대기 2턴)  (turnQueue)
```

---

### 2. 전투 모드 (Combat)

**칩 행:**
```
[target:all▾]  [R3 · 2/4]  [순차↔즉시]
```

| 칩 | 동작 |
|----|------|
| `target` | 조사와 동일 |
| `R3 · 2/4` | **라운드 카운터 디스플레이** (읽기 전용 + 클릭으로 라운드 수동 조정) |
| `순차↔즉시` | 토글 칩. 두 가지 상태: |

**라운드 카운터 상세:**
```
R3 · 2/4
│    │ └─ 이번 라운드 전체 캐릭터 수
│    └─── 이번 라운드에서 행동 완료한 캐릭터 수
└──────── 현재 라운드 번호
```

- 클릭하면 작은 팝오버로 `[R+]` `[R-]` `[리셋]` 표시
- 모든 캐릭터 행동 완료 → 자동으로 다음 라운드 증가

**순차/즉시 토글 상세:**

| 상태 | 칩 표시 | 동작 |
|------|--------|------|
| **순차** | `[순차 ▸]` (teal) | AI가 OrderPanel 순서대로 **한 명씩** 응답. 대화 모드와 동일한 직렬 처리. |
| **즉시** | `[즉시 ⚡]` (orange) | AI가 **병렬**로 동시 응답. `Promise.all`로 처리. accumulatedContext 없음. |

순차: 서로의 행동을 보고 반응 (공격 → 회피 → 반격 같은 순서 의존)
즉시: 동시 행동 (같은 타이밍에 각자 행동, 서로의 행동을 모름)

**입력 폼:**
```
┌──────────────────────────────────────────────┐
│ ▶ [전투 상황을 묘사하세요...]                  │
│   textarea                                   │
└──────────────────────────────────────────────┘
```

**OrderPanel 전투 모드 변화:**
```
┌─ 전투 순서 (R3) ──────────┐
│  ✓ 1. 이지수  (DEX 70)   │  ← 행동 완료 (회색)
│  ✓ 2. 최예린  (DEX 65)   │  ← 행동 완료 (회색)
│  ▶ 3. 박민호  (DEX 60)   │  ← 현재 턴 (teal 하이라이트)
│  ─────────────────────── │
│  [다음 라운드]             │
│  [전투 종료 → 조사]        │
└───────────────────────────┘
```

---

### 3. 대화 모드 (Social)

**칩 행:**
```
[target:all▾]  [NPC:김경장▾]  [대항]
```

| 칩 | 동작 |
|----|------|
| `target` | 조사와 동일 |
| `NPC:김경장▾` | 드롭다운. 세션 NPC 목록에서 선택. 선택 시 입력 폼 플레이스홀더가 해당 NPC 대사 모드로 변경 |
| `대항` | 클릭 → **OpposedCheckModal** (설득 vs 심리학 등) |

**NPC 칩 선택 시 입력 동작 변화:**
```
NPC 미선택:  입력 = GM 장면 묘사 → send_turn
NPC 선택됨:  입력 = NPC 대사 → npc_speak + AI 히스토리에 주입
```

NPC가 선택된 상태에서 Enter를 치면:
1. `npc_speak`로 채팅에 NPC 대사 표시
2. **동시에** 해당 NPC 대사를 AI 히스토리에 주입 (현재 누락된 기능)
3. AI가 NPC 대사에 반응할 수 있게 됨

NPC 선택 해제 (칩을 다시 클릭하거나 "없음" 선택) → 일반 GM 입력 모드로 복귀.

**입력 폼:**
```
NPC 미선택:
┌──────────────────────────────────────────────┐
│ ▶ [대화 장면을 묘사하세요...]                  │
└──────────────────────────────────────────────┘

NPC 선택됨 (김경장):
┌──────────────────────────────────────────────┐
│ 💬 [김경장의 대사를 입력하세요...]              │
└──────────────────────────────────────────────┘
```

**턴 처리:**
- NPC 대사 입력 → AI 응답 (자동 send_turn 옵션)
- 또는 GM이 직접 send_turn으로 상황 묘사 후 AI 응답

---

### 4. 이성 판정 모드 (Sanity)

**칩 행:**
```
[target:이지수▾]  [SAN 체크]  [광기 테이블]
```

| 칩 | 동작 |
|----|------|
| `target` | 단일 캐릭터 선택 (이 모드에서는 "all" 비활성 권장) |
| `SAN 체크` | 클릭 → **SanCheckForm** 인라인 폼 표시 (모달 아님) |
| `광기 테이블` | 클릭 → **MadnessTableForm** 인라인 폼 표시 |

**SAN 체크 폼 (칩 아래에 인라인 확장):**
```
┌─ SAN 체크 ──────────────────────────────────────────┐
│                                                      │
│  대상: [이지수 ▾]         현재 SAN: 47/60            │
│                                                      │
│  성공 시 손실: [0   ] (0 = 손실 없음)                 │
│  실패 시 손실: [1d6 ] (주사위 표현식 or 숫자)          │
│                                                      │
│  공포 상황 묘사:                                      │
│  [_____________________________________________]      │
│  (AI에게 전달될 상황 설명)                             │
│                                                      │
│  [취소]  [SAN 체크 실행]                              │
└──────────────────────────────────────────────────────┘
```

실행 시 서버 처리 체인:
```
1. POW 판정 (d100 vs 현재 SAN) → 성공/실패
2. 실패 시 → 손실량 굴림 (1d6 등)
3. 손실량에 따라:
   - 5 이상: 일시적 광기 자동 플래그
   - 누적 ≥ 최대SAN/5: 무기한 광기 자동 플래그
4. 결과를 AI에게 전달 (공포 상황 + 판정 결과 + 광기 발생 여부)
5. AI 자동 응답 (공포에 대한 반응)
```

**광기 테이블 폼 (칩 아래에 인라인 확장):**
```
┌─ 광기 테이블 ────────────────────────────────────────┐
│                                                      │
│  대상: [이지수 ▾]    상태: ⚠️ 일시적 광기             │
│                                                      │
│  증상 유형:                                           │
│  ○ 자동 (d10 랜덤)                                   │
│  ○ 수동 선택:                                        │
│     [1.건망증] [2.공포증] [3.편집증] [4.환각]          │
│     [5.폭력충동] [6.도피본능] [7.기절] [8.강박행동]    │
│     [9.기이한 식습관] [10.히스테리]                    │
│                                                      │
│  지속 기간:                                           │
│  ○ 일시적 (1d10 라운드)                               │
│  ○ 무기한 (세션 지속)                                 │
│                                                      │
│  [취소]  [광기 적용]                                  │
└──────────────────────────────────────────────────────┘
```

적용 시:
```
1. 선택된 증상을 SessionState에 기록
2. AI 히스토리에 "광기 발현: {증상}" 주입
3. 시스템 프롬프트에 광기 증상 행동 지침 추가 가능
```

**기본 입력 폼 (폼이 닫혀있을 때):**
```
┌──────────────────────────────────────────────┐
│ ▶ [공포 상황을 묘사하세요...]                  │
└──────────────────────────────────────────────┘
```

---

### 5. 추격 모드 (Chase)

**칩 행:**
```
[target:all▾]  [거리 0/50m]  [이동 다이스]
```

| 칩 | 동작 |
|----|------|
| `target` | 조사와 동일 |
| `거리 0/50m` | **거리 디스플레이** (읽기 전용 + 클릭으로 수동 조정 팝오버) |
| `이동 다이스` | 클릭 → 이동 판정 폼 (CON/DEX 체크) |

**거리 디스플레이 상세:**
```
거리 0/50m
│     │  └─ 총 추격 거리 (GM 설정)
│     └──── 현재 거리 (도주자 기준)
└────────── 레이블
```

- 클릭 시 팝오버: `[+5m]` `[-5m]` `[총거리 설정]` `[리셋]`
- ChatFeed 상단에 **거리 바** 오버레이:

```
[추격자 ●━━━━━━━━━━━━━━━━━━━━○ 도주자]  15/50m
                 ▲ 장애물
```

**이동 다이스 폼 (인라인 확장):**
```
┌─ 이동 판정 ──────────────────────────────────────────┐
│                                                      │
│  대상: [이지수 ▾]                                     │
│  판정 기술: ○ CON  ○ DEX  ○ 직접입력: [____]          │
│  성공 시 이동: [+10m]                                 │
│  실패 시 이동: [+5m ]                                 │
│                                                      │
│  장애물: (선택사항)                                    │
│  [장애물 설명 입력...]                                 │
│  장애물 판정 기술: [점프 ▾]                            │
│                                                      │
│  [취소]  [이동 판정 실행]                              │
└──────────────────────────────────────────────────────┘
```

**OrderPanel 추격 모드 변화:**
```
┌─ 추격 ────────────────────────┐
│  🏃 도주자                     │
│    이지수    15m  (DEX 70)    │
│  ──────────────────────────  │
│  👤 추격자                     │
│    NPC: 깊은자  10m  (DEX 50) │
│  ──────────────────────────  │
│  거리 차: 5m                   │
│  [추격 종료 → 조사]            │
└───────────────────────────────┘
```

**입력 폼:**
```
┌──────────────────────────────────────────────┐
│ ▶ [추격 상황을 묘사하세요...]                  │
└──────────────────────────────────────────────┘
```

---

## 공통 입력 변경: input → textarea

모든 페이즈에서 `<input type="text">` → `<textarea>` 교체.

```
기본 높이: 3줄 (약 64px)
최대 높이: 8줄 (약 170px, 자동 확장)
전송: Enter (Shift+Enter = 줄바꿈)
```

---

## 상태 구조 (store.ts 추가 필드)

```typescript
type GamePhase = 'exploration' | 'combat' | 'social' | 'sanity' | 'chase'

type CombatProcessing = 'sequential' | 'immediate'

interface CombatState {
  round: number
  completedInRound: string[]     // 이번 라운드 행동 완료한 charId[]
  processing: CombatProcessing   // 순차 or 즉시
}

interface ChaseState {
  totalDistance: number           // 총 거리 (m)
  currentDistance: number         // 현재 도주자 위치
  pursuers: string[]             // 추격자 charId or NPC id
  fleers: string[]               // 도주자 charId
  barriers: {
    position: number
    description: string
    skill: string
  }[]
}

interface SanityFormState {
  activeForm: 'none' | 'san_check' | 'madness_table'
}

// AppState에 추가
gamePhase: GamePhase
combatState: CombatState | null
chaseState: ChaseState | null
sanityForm: SanityFormState
orderPanelOpen: boolean
```

---

## 서버 추가 필요 메시지

| 메시지 타입 | 방향 | 페이로드 |
|-----------|------|---------|
| `set_phase` | client → server | `{ phase: GamePhase }` |
| `phase_changed` | server → client | `{ phase: GamePhase }` |
| `combat_next_round` | client → server | `{}` |
| `combat_state_update` | server → client | `CombatState` |
| `san_check` | client → server | `{ charId, successLoss, failureLoss, description }` |
| `san_check_result` | server → client | `{ charId, roll, target, success, loss, madnessTriggered }` |
| `apply_madness` | client → server | `{ charId, symptom, duration }` |
| `chase_move` | client → server | `{ charId, skill, successMove, failureMove }` |
| `chase_state_update` | server → client | `ChaseState` |

---

## 컴포넌트 파일 구조 (변경/신규)

```
components/
  GmInput.tsx                   ← 대폭 리팩토링 (페이즈 탭 + 동적 칩)
  GameScreen.tsx                ← OrderPanel 추가
  OrderPanel.tsx                ← 신규: 우측 순서 패널
  
  phase-chips/
    ExplorationChips.tsx        ← 신규: [타깃] [스킬] [대항]
    CombatChips.tsx             ← 신규: [타깃] [라운드] [순차↔즉시]
    SocialChips.tsx             ← 신규: [타깃] [NPC선택] [대항]
    SanityChips.tsx             ← 신규: [타깃] [SAN체크] [광기테이블]
    ChaseChips.tsx              ← 신규: [타깃] [거리] [이동다이스]

  forms/
    SanCheckForm.tsx            ← 신규: SAN 체크 인라인 폼
    MadnessTableForm.tsx        ← 신규: 광기 테이블 인라인 폼
    ChaseMoveForm.tsx           ← 신규: 이동 판정 인라인 폼

  ActionRequestModal.tsx        → SkillCheckModal.tsx (리네임)
  OpposedCheckModal.tsx         ← 신규: 대항 판정 모달
  NpcSpeechModal.tsx            → 삭제 (대화 모드 인라인으로 흡수)
  TurnOrderModal.tsx            → 삭제 (OrderPanel로 흡수)
  ChaseDistanceBar.tsx          ← 신규: ChatFeed 상단 거리 바
```

---

## 구현 순서

```
Phase 1: 기반 작업
  ├── store.ts에 gamePhase, combatState 등 추가
  ├── GmInput을 페이즈 탭 + 동적 칩 구조로 리팩토링
  ├── input → textarea 교체
  └── ExplorationChips (현재 동작 그대로 래핑)

Phase 2: OrderPanel + 조사 모드 완성
  ├── OrderPanel.tsx 신규 (DEX 정렬, 수동 조정)
  ├── GameScreen 레이아웃에 OrderPanel 추가
  └── 서버 set_phase 메시지 추가

Phase 3: 전투 모드
  ├── CombatChips (라운드 카운터, 순차↔즉시 토글)
  ├── 서버: 즉시 모드 병렬 처리 (Promise.all)
  ├── 서버: combat_next_round 메시지
  └── OrderPanel 전투 모드 표시 (행동 완료 체크)

Phase 4: 대화 모드
  ├── SocialChips (NPC 드롭다운, 대항)
  ├── NPC 대사 → AI 히스토리 주입 구현 (서버)
  ├── OpposedCheckModal 신규
  └── NpcSpeechModal 삭제 (인라인 흡수)

Phase 5: 이성 판정 모드
  ├── SanityChips + SanCheckForm + MadnessTableForm
  ├── 서버: san_check 체인 (POW 판정 → 손실 → 광기 판정)
  └── 광기 증상 → AI 히스토리 주입

Phase 6: 추격 모드
  ├── ChaseChips + ChaseMoveForm + ChaseDistanceBar
  ├── 서버: chase_move 판정 + chase_state_update
  └── OrderPanel 추격 모드 (도주자/추격자 분리)
```
