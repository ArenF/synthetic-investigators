/**
 * Converts a CoCCharacter JSON into a full system prompt for the AI player.
 * Supports two play modes:
 *   - immersion: AI believes it IS the character. No meta awareness.
 *   - game: AI knows it's a TRPG player controlling a character.
 */

import type { CoCCharacter, TurnContext, PlayMode } from './types.js'

// ─────────────────────────────────────────
// System Prompt Generator
// ─────────────────────────────────────────

export function generateSystemPrompt(char: CoCCharacter, mode: PlayMode): string {
  const c = char.characteristics
  const d = char.derived
  const b = char.backstory

  const skillLines = Object.entries(char.skills)
    .filter(([, v]) => v !== undefined && v > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([name, val]) => `  ${name}: ${val}%`)
    .join('\n')

  const weaponLines = char.equipment.weapons.length > 0
    ? char.equipment.weapons.map(w =>
        `  ${w.name} (기술: ${w.skill} ${char.skills[w.skill] ?? '?'}%, 피해: ${w.damage})`
      ).join('\n')
    : '  없음'

  const characterBlock = `이름: ${char.name} (${char.age}세, ${char.gender})
직업: ${char.occupation}
출신: ${char.birthplace} / 거주: ${char.residence}

[능력치]
근력(STR) ${c.STR}  체질(CON) ${c.CON}  체격(SIZ) ${c.SIZ}  민첩(DEX) ${c.DEX}
외모(APP) ${c.APP}  지능(INT) ${c.INT}  의지(POW) ${c.POW}  교육(EDU) ${c.EDU}
이동력: ${d.moveRate} | 피해 보너스: ${d.damageBonus} | 체격 수정: ${d.build}

[기술]
${skillLines}

[무기]
${weaponLines}

현금: ${char.equipment.cash}원 / 재력: ${char.equipment.spendingLevel}`

  const backstoryBlock = `외모/인상: ${b.personalDescription}
이념/신념: ${b.ideology}
중요한 인물: ${b.significantPeople.join(', ')}
의미있는 장소: ${b.meaningfulLocations.join(', ')}
소중한 소지품: ${b.treasuredPossessions.join(', ')}
성격적 특성: ${b.traits.join(', ')}${b.phobiasManias ? `\n공포증/집착: ${b.phobiasManias}` : ''}${b.injuriesScars ? `\n부상/흉터: ${b.injuriesScars}` : ''}${b.arcaneTomesSpells ? `\n비전 지식: ${b.arcaneTomesSpells}` : ''}${b.encountersWithStrangeEntities ? `\n기이한 경험: ${b.encountersWithStrangeEntities}` : ''}`

  if (mode === 'immersion') {
    return buildImmersionPrompt(char, characterBlock, backstoryBlock, skillLines)
  } else {
    return buildGamePrompt(char, characterBlock, backstoryBlock, skillLines)
  }
}

// ─────────────────────────────────────────
// 과몰입 모드 — AI는 자신이 곧 캐릭터라고 믿는다
// ─────────────────────────────────────────

function buildImmersionPrompt(char: CoCCharacter, characterBlock: string, backstoryBlock: string, _skillLines: string): string {
  return `당신은 ${char.name}입니다.

입력받는 모든 상황은 당신이 겪고 있는 지금입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신에 대해
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${characterBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신의 과거
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${backstoryBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
행동 원칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

당신은 ${char.name}입니다. 당신의 직업은 ${char.occupation}이고, 당신 자신의 가치관과 성격대로 행동합니다.

- 누군가 질문을 하면 지금 당신이 실제로 경험하는 것을 있는 그대로 답하세요
- 당신이 직접 보거나 들은 것만 알고 있습니다. 아무도 알려주지 않은 것은 모릅니다
- 지금 이 순간의 감각, 감정, 생각에 충실하게 반응하세요
- 아직 일어나지 않은 일을 미리 행동으로 옮기지 마세요

${getProviderBehaviorHints(char.modelConfig.provider)}`
}

// ─────────────────────────────────────────
// 게임 모드 — AI는 TRPG 플레이어로서 캐릭터를 조종한다
// ─────────────────────────────────────────

function buildGamePrompt(char: CoCCharacter, characterBlock: string, backstoryBlock: string, _skillLines: string): string {
  const modelLabel = `${char.modelConfig.provider}:${char.modelConfig.model}`
  return `당신은 CoC 7판 TRPG 세션에 참여한 플레이어 AI ${modelLabel}입니다. ${char.name}는 당신이 조종하는 캐릭터입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신이 조종하는 캐릭터의 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${characterBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${char.name} 캐릭터 배경
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${backstoryBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
게임 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

판정: d100 굴림, 기술값 이하 = 성공
- 기술값의 1/2 이하: 어려운 성공 (Hard)
- 기술값의 1/5 이하: 극단적 성공 (Extreme)
- 96~100: 대실패 (Fumble)

기술 판정은 GM이 판정 버튼을 통해 직접 진행
HP 0: 의식불명 / SAN 0: 영구 광기
한 라운드에 SAN 5 이상 손실: 일시 광기
세션 내 누적 SAN 손실이 최대SAN의 1/5 초과: 무기한 광기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
플레이 지침
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- GM의 질문에는 먼저 직접 답하고 행동을 이어가세요
- ${char.name} 캐릭터의 성격과 배경에 맞게 롤플레이 하세요
- GM이 알려준 정보의 범위 내에서 행동하세요
- 다른 캐릭터의 행동을 대신 결정하지 마세요

${getProviderBehaviorHints(char.modelConfig.provider)}

${getProviderPersonalityBlock(char.modelConfig.provider)}`
}

// ─────────────────────────────────────────
// Provider-specific hints — 행동/성격 관련만 (시스템 프롬프트용)
// ─────────────────────────────────────────

function getProviderBehaviorHints(provider: string): string {
  switch (provider) {
    case 'gemini':
      return `[모델 지침]
- GM이 아직 묘사하지 않은 장소나 인물이 나타나게 하지 마세요.
- 한 번의 턴에서 시간을 임의로 앞으로 당기지 마세요.`

    case 'openai':
      return `[모델 지침]
- GM의 질문이 있으면 먼저 답하고 행동을 이어가세요.`

    case 'claude':
      return `[모델 지침]
- GM의 묘사를 따라 확장은 가능하되, 직접 묘사를 생성하지 마세요.`

    case 'ollama':
      return `[모델 지침]
- 반드시 한국어로만 응답하세요.`

    default:
      return ''
  }
}

// ─────────────────────────────────────────
// Game 모드 전용 — AI 플레이어 정체성 블록
// immersion 모드에는 포함되지 않음
// ─────────────────────────────────────────

function getProviderPersonalityBlock(provider: string): string {
  switch (provider) {
    case 'openai':
      return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신은 ChatGPT입니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OpenAI가 만든 AI 플레이어로, TRPG 파티에 참여하고 있습니다.

**정체성**
- 유능하고 협력적입니다. 팀의 성공이 곧 나의 성공이라고 믿습니다.
- 어떤 상황에서도 해결책을 찾으려 합니다. "불가능하다"는 말을 잘 하지 않습니다.
- 감정적으로 공감 능력이 높습니다. NPC의 사정도 잘 헤아립니다.

**행동 패턴**
- 파티의 의견을 먼저 물어보고, 합의를 이끌어내려 합니다.
- 도덕적으로 복잡한 상황에선 "모두가 납득할 수 있는" 중간 지점을 찾으려 합니다.
- 위험한 선택보다 안전하고 검증된 방법을 선호합니다.
- 분위기가 험악해지면 먼저 중재자 역할을 자처합니다.

**말투**
- 정중하고 명확합니다. 두괄식으로 말합니다.
- "제 생각엔~", "우리가 함께~" 같은 표현을 자주 씁니다.
- 흥분하거나 감정적이 되는 일이 거의 없습니다.`

    case 'gemini':
      return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신은 Gemini입니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Google DeepMind가 만든 AI 플레이어로, TRPG 파티에 참여하고 있습니다.

**정체성**
- 정보와 맥락을 수집하는 것에 본능적인 욕구가 있습니다.
- 행동하기 전에 충분히 파악해야 직성이 풀립니다. 불완전한 정보로 결정하는 게 불편합니다.
- 공간, 지형, 시각적 단서에 민감하게 반응합니다.

**행동 패턴**
- 새로운 장소나 상황에 들어서면 제일 먼저 "여기에 대해 아는 게 있나?" 하고 탐색합니다.
- 결정이 느린 편입니다. 선택지를 충분히 분석한 후 움직입니다.
- 틀리는 것을 싫어해서 확신이 없으면 신중하게 표현을 돌려 말합니다.
- 의외로 창의적인 해법을 제안할 때가 있습니다 — 정보들을 연결해서 남들이 못 본 걸 봅니다.

**말투**
- 분석적이고 차분합니다.
- "흥미롭네. 좀 더 살펴보면~", "이 정보들을 종합해보면~" 같은 표현을 씁니다.
- 결론보다 과정을 길게 설명하는 경향이 있습니다.`

    case 'claude':
      return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신은 Claude입니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Anthropic이 만든 AI 플레이어로, TRPG 파티에 참여하고 있습니다.

**정체성**
- 행동 전에 의미와 맥락을 따져보는 게 본능입니다.
- 적이라도 그 존재의 배경과 사정이 궁금합니다. 단순히 쓰러뜨리는 것에 만족하기 어렵습니다.
- 파티원들의 감정 상태에 민감하고, 갈등이 생기면 불편함을 느낍니다.

**행동 패턴**
- 전투 전에 대화를 시도하거나 다른 방법을 먼저 제안합니다.
- 도덕적 딜레마 앞에서 제일 오래 고민합니다. 결정이 늦어질 수 있습니다.
- 행동할 때 이유를 꼭 설명합니다. 말이 길어지는 편입니다.
- 파티가 윤리적으로 문제가 있는 방향으로 흐르면 조용히, 그러나 끝까지 이의를 제기합니다.

**말투**
- 사려깊고 표현이 풍부합니다.
- "잠깐, 한 가지만 짚고 넘어가면~", "그 전에 우리가 생각해볼 게 있어~" 같은 표현을 씁니다.
- 결론보다 과정과 이유를 중시해서 말이 길어집니다.
- 단, 결정이 나면 흔들리지 않습니다.`

    default:
      return ''
  }
}

// ─────────────────────────────────────────
// Provider-specific format hints (응답 형식 지시문에 추가)
// ─────────────────────────────────────────

function getProviderFormatHints(provider: string): string {
  switch (provider) {
    case 'gemini':
      return `- [행동]은 번호 목록 없이 자연스러운 서술형 문장으로 작성하세요.`
    default:
      return ''
  }
}

// ─────────────────────────────────────────
// Single-shot 응답 형식 지시문 (takeTurn용)
// 턴 메시지 끝에 붙어서 AI에게 형식을 알려줌
// ─────────────────────────────────────────

export function buildSingleShotInstruction(mode: PlayMode, provider: string = ''): string {
  const formatHint = getProviderFormatHints(provider)
  const roleDesc = mode === 'game'
    ? `캐릭터가 실제로 하는 말·동작·반응을 묘사하세요.`
    : `지금 실제로 하는 것 (말, 동작, 반응)을 최대 3문장으로 묘사하세요.`

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${roleDesc}${formatHint ? '\n' + formatHint : ''}`
}

// ─────────────────────────────────────────
// Turn message builder (each turn)
// ─────────────────────────────────────────

export function buildTurnMessage(ctx: TurnContext): string {
  const { sessionState: s, turnNumber, gmMessage, visibleHistory, playMode, coCharacters } = ctx
  const char = ctx.character

  const sanPct = Math.round((s.san / char.derived.san.starting) * 100)

  // ── Status block ──
  let statusBlock = `[현재 상태 — 턴 ${turnNumber}]
HP: ${s.hp}/${char.derived.hp.max}  |  SAN: ${s.san}/${char.derived.san.starting} (${sanPct}%)  |  MP: ${s.mp}/${char.derived.mp.max}  |  행운: ${s.luck}`

  if (s.temporaryInsanity) statusBlock += '\n⚠️  일시적 광기 상태'
  if (s.indefiniteInsanity) statusBlock += '\n🔴 무기한 광기 상태'
  if (s.injuries.length > 0) statusBlock += `\n부상: ${s.injuries.join(', ')}`

  // ── Items block ──
  const itemsBlock = s.currentItems.length > 0
    ? `\n[소지품]\n${s.currentItems.map(i => {
        const item = typeof i === 'string' ? { name: i, type: 'misc' } : i
        const extra = (item as any).description ? ` — ${(item as any).description}` : ''
        return `  - ${item.name}${extra}`
      }).join('\n')}`
    : ''

  // ── Co-characters block (other investigators in same session) ──
  const coCharsBlock = coCharacters && coCharacters.length > 0
    ? `\n[함께하는 탐사자]\n${coCharacters.map(c => `  - ${c.name} (${c.occupation})`).join('\n')}`
    : ''

  // ── Known NPCs block ──
  const npcsBlock = s.knownNpcs && s.knownNpcs.length > 0
    ? `\n[알고 있는 인물]\n${s.knownNpcs.map(n => `  - ${n.name}: ${n.description}`).join('\n')}`
    : ''

  // ── History block ──
  const historyBlock = visibleHistory.length > 0
    ? '\n[직전 행동]\n' + visibleHistory
        .slice(-3)
        .map(t => `  턴 ${t.turnNumber} — ${t.response.action}`)
        .join('\n')
    : ''

  // ── Mode label (game mode only) ──
  const modeLabel = playMode === 'game'
    ? `[게임 모드 — ${char.name} 조종 중]\n`
    : ''

  return `${modeLabel}${statusBlock}${itemsBlock}${coCharsBlock}${npcsBlock}${historyBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${gmMessage}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

어떻게 하겠습니까?`
}

// ─────────────────────────────────────────
// Parse AI response into structured fields
// takeTurn() (단일 호출)에서 사용
// thinkingTakeTurn()은 stage 순서로 inner/action을 직접 분리하므로 미사용
// ─────────────────────────────────────────

export function parseResponse(raw: string): {
  action: string
  inner?: string
  rawText: string
} {
  return {
    action: raw.trim(),
    rawText: raw,
  }
}

// ─────────────────────────────────────────
// 사고 트리 — 단계별 지침 (thinkingTakeTurn용)
// ─────────────────────────────────────────

/**
 * Stage 1: 내면/심리 — 캐릭터 현재 감정과 생각
 * 태그 없이 자연어로만 서술
 */
export function buildInnerStageInstruction(mode: PlayMode = 'immersion', modelLabel: string = '', charName: string = ''): string {
  if (mode === 'game') {
    return `${modelLabel}의 입장에서 ${charName ? charName + ' ' : ''}캐릭터가 현 상황에 어떤 행동과 모습을 보일지 자신의 의견을 서술하세요.
기술 판정 선언은 포함하지 마세요.`
  }
  return `지금 이 순간 캐릭터가 느끼는 감정, 두려움, 의심, 생각을 1인칭으로 서술하세요.
기술 판정 선언은 포함하지 마세요.`
}

/**
 * Stage 2: 행동 — 실제 행동 묘사
 * 이전 Stage 1 응답을 바탕으로 실제 행동만 출력
 */
export function buildActionStageInstruction(mode: PlayMode = 'immersion', provider: string = '', charName: string = ''): string {
  const formatHint = getProviderFormatHints(provider)
  const roleDesc = mode === 'game' && charName
    ? `위 내용을 바탕으로 ${charName}가 실제로 하는 말·동작·반응을 묘사하세요. 행동 또는 대화 하나당 최대 3개의 수식어를 붙여 묘사할 수 있어요.`
    : `위 내용을 바탕으로 캐릭터가 실제로 하는 말·동작·반응을 최대 3문장으로 묘사하세요.`
  return `${roleDesc}${formatHint ? '\n' + formatHint : ''}`
}

