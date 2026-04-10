# Synthetic Investigators — Dev Log

CoC 7th Edition AI TRPG 실험 플랫폼. AI 플레이어들이 실제 CoC 규칙으로 탐사자 역할을 수행하고, GM이 실시간으로 세션을 운영.

---

## 현재 상태 (2026-04-11)

**브랜치:** `dev`
**스택:** Node.js + Express + WebSocket (서버), React + Vite + Zustand (클라이언트), TypeScript
**AI 지원:** Claude (Anthropic), Gemini (Google), GPT (OpenAI), Ollama (로컬)

---

## 구현 완료 기능

### 세션 / GM 시스템
- 세션 생성 (캐릭터 선택, NPC/아이템 설정, 오프닝 브리핑)
- 플레이 모드 선택 (세션 시작 전): **게임 모드** (기본) / **과몰입 모드**
- 턴 순서 설정 (드래그 앤 드롭)
- NPC 실시간 소개 (`introduce_npc` → 특정 캐릭터에게만 전달)
- 세션 히스토리 저장 (`scenarios/*.json`)

### AI 플레이어
- **동행 탐사자 인식**: 매 턴 `[동행 탐사자]` 블록으로 같은 세션 캐릭터 정보 제공
- **라이브 상태 주입**: 현재 HP/SAN/MP/행운/아이템/알고 있는 NPC 실시간 전달
- **모드별 프롬프트**: 게임 모드(메카닉 인식, 전략적) / 과몰입 모드(완전 몰입형)
- **프로바이더별 힌트**: Gemini는 질문 우선 직접 답변, GPT는 간결하게
- **오프닝 브리핑**: 세션 시작 시 최소 컨텍스트만 주입 (NPC/아이템 스포일러 없음)

### 판정 시스템 (Judgment Event System)
- **6단계 결과**: 극단적 성공 / 어려운 성공 / 성공 / 실패 / 나쁜 실패 / 대실패
- **Effect 객체**: 능력치 변화 / 아이템 획득·분실 / 광기 상태 자동 적용
- **AI 시도 감지**: `[시도]` 선언 감지 → `attempt_declared` 이벤트 → GM 팝업
- **판정 처리**: `judgment_request` → 주사위 롤 → 효과 적용 → AI 컨텍스트 전달

### 시나리오 관리
- 재사용 가능한 시나리오 파일 생성/편집/삭제 (`/api/scenario-templates`)
- 세션 시작 시 저장된 시나리오에서 NPC/아이템/오프닝 로드

### 인프라
- 개발 로거: API 키 상태, 턴 요청/응답 타이밍, Ollama 오류 진단 (`logs/server.log`)
- `.gitignore`: `logs/`, `scenarios/` 제외

---

## 알려진 이슈 / 개선 예정

### 🔴 판정 시스템 개편 (다음 작업)

**1. 판정 신청 플로우 수정**

현재 플로우:
```
AI [시도] → attempt_declared → AttemptReviewModal (기술/난이도만) → judgment_request → 결과 브로드캐스트
```

목표 플로우:
```
AI [시도] → attempt_declared → AttemptReviewModal (풀 에디터)
  → GM이 기술 변경 + 난이도 설정 + 6단계 결과/보상/묘사 입력
  → [주사위 판정] 클릭
  → 시스템 판정 처리 (judgment_request)
  → AI에게 결과 자동 전달 + 묘사 응답 자동 요청
  → ⚠️ 이 묘사 턴에서는 AI가 [시도] 선언 불가
```

구현 포인트:
- `AttemptReviewModal`에 ActionRequestModal의 6단계 결과 에디터 통합
- 서버: `judgment_request` 처리 후 해당 캐릭터에게 자동 AI 턴 실행
- 자동 턴 실행 시 `isJudgmentResponse: true` 플래그 → `[시도]` 감지 skip

**2. 기술 목록 CoC 7th 공식 기준으로 전체 교체**

공식 기술 목록:
```
근력, 건강, 크기, 민첩, 외모, 지능, 정신, 교육, 행운,
감정, 고고학, 관찰력, 근접전(격투), 기계수리, 도약, 듣기,
말재주, 매혹, 법률, 변장, 사격(권총), 사격(라이플/산탄총),
설득, 손놀림, 수영, 승마, 심리학, 언어(모국어), 역사,
열쇠공, 오르기, 오컬트, 위협, 은밀, 응급처치, 의료,
인류학, 운전, 자료조사, 자연, 재력, 전기수리, 정신분석,
중장비 조작, 추적, 크툴루 신화, 투척, 항법, 회계, 회피
```

변경 범위:
- `ActionRequestModal.tsx` — `COC_SKILLS` 배열 교체
- `AttemptReviewModal.tsx` — `COC_SKILLS` 배열 교체
- `judgment.ts` — `detectSkillFromText()` 스킬 목록 교체
- `CharacterEditor.tsx` (클라이언트) — 스킬 입력 필드 교체
- `types.ts` — `SkillSet` 인터페이스 업데이트

**3. 캐릭터 스탯 0인 기술 → 판정 드롭다운에서 숨김**
- `ActionRequestModal`: 현재 캐릭터의 해당 스킬 값이 0이면 선택 불가 (`disabled` 또는 목록에서 제외)
- `AttemptReviewModal`: 동일 처리
- AI 자동 감지(`detectSkillFromText`)는 값과 무관하게 동작 (GM이 최종 결정하므로)

**4. 턴 플로우 구조 개편 (미정 / 설계 필요)**

현재 문제: GM이 매 턴마다 타겟 캐릭터를 직접 지정해야 해서 세션 진행이 복잡해질 수 있음

방향성 (미정):
- 턴 단위로 각 캐릭터의 행동을 명확하게 구분하는 구조
- GM이 "전체 턴 진행" / "특정 캐릭터 턴" / "자유 행동" 등을 쉽게 선택할 수 있도록
- 턴 순서(현재 드래그 앤 드롭)와 연계해 자동으로 다음 캐릭터로 넘어가는 옵션 고려
- 설계 확정 후 구현 예정

**5. 현재 `getCharacterStates()`에서 `char.equipment.items` 사용**
- 세션 중 변경된 아이템 반영 안 됨 → `s.currentItems` 사용으로 변경 필요

---

## 커밋 히스토리 요약

| 커밋 | 내용 |
|------|------|
| `6ee3f22` | 서버 개발 로거 (API 키, AI 타이밍, Ollama 진단) |
| `9752ca3` | 동행 탐사자 인식 + 세션 시작 시 플레이 모드 선택 |
| `2cd12eb` | Judgment Event System (6단계 결과, Effect 객체) |
| `ff61dd8` | 과몰입/게임 모드, NPC 실시간 소개, 라이브 상태 주입 |
| `6e175ca` | 프로바이더별 프롬프트 힌트 |
| `f74c0ce` | 오프닝 브리핑 최소화 (NPC/아이템 스포일러 제거) |
| `44d3544` | restoreLuck 캡, sessionSanLoss 리셋, order_updated, 세션 정리 |
| `2c7e8d9` | 다중 캐릭터 턴 diceContext 유실 수정 |
| `537b603` | 시나리오 파일 시스템 |
