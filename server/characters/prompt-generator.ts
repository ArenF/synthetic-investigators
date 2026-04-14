/**
 * Converts a CoCCharacter JSON into a full system prompt for the AI player.
 * Supports two play modes:
 *   - immersion: AI believes it IS the character. No meta awareness.
 *   - game: AI knows it's a TRPG player controlling a character.
 */

import type { CoCCharacter, TurnContext, PlayMode } from './types.js'

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** game 모드 → [OOC], immersion 모드 → [내면] */
function getInnerTag(mode: PlayMode): 'OOC' | '내면' {
  return mode === 'game' ? 'OOC' : '내면'
}

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

입력받는 모든 상황에 대해서 최대한 시뮬레이션 하세요.

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

${getProviderBehaviorHints(char.modelConfig.provider)}`
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
// Provider-specific format hints (응답 형식 지시문에 추가)
// ─────────────────────────────────────────

function getProviderFormatHints(provider: string): string {
  switch (provider) {
    case 'gemini':
      return `- [행동]은 번호 목록 없이 자연스러운 서술형 문장으로 작성하세요.`
    case 'ollama':
      return `- 태그는 반드시 **[OOC]**, **[행동]** 형식으로 작성하세요. [] 앞뒤에 ** 필수.`
    default:
      return ''
  }
}

// ─────────────────────────────────────────
// Single-shot 응답 형식 지시문 (takeTurn용)
// 턴 메시지 끝에 붙어서 AI에게 형식을 알려줌
// ─────────────────────────────────────────

export function buildSingleShotInstruction(mode: PlayMode, provider: string = ''): string {
  const tag = getInnerTag(mode)
  const tagDesc = mode === 'game'
    ? `캐릭터의 감정·생각·행동 의도를 분석하는 플레이어 시각 (친근한 말투)`
    : `지금 느끼는 감정, 생각, 두려움, 의심`
  const actionDesc = mode === 'game'
    ? `캐릭터가 실제로 하는 말·동작·반응`
    : `지금 실제로 하는 것 (말, 동작, 반응)`

  const formatHint = getProviderFormatHints(provider)

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
응답 형식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[${tag}]** ${tagDesc}
**[행동]** ${actionDesc} — 최대 3문장
${formatHint ? '\n' + formatHint : ''}`
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
// ─────────────────────────────────────────

export function parseResponse(raw: string): {
  action: string
  inner?: string
  rawText: string
} {
  // [OOC]는 game 모드에서 [내면] 대신 사용 — 동일한 inner 필드로 파싱
  const innerTagStr = '(?:\\*\\*\\[내면\\]\\*\\*|\\*\\*\\[OOC\\]\\*\\*)'

  const actionMatch = raw.match(new RegExp(`\\*\\*\\[행동\\]\\*\\*\\s*([\\s\\S]*?)(?=${innerTagStr}|$)`, 'i'))
  const innerMatch = raw.match(new RegExp(`${innerTagStr}\\s*([\\s\\S]*?)(?=\\*\\*\\[행동\\]\\*\\*|$)`, 'i'))

  return {
    action: actionMatch?.[1]?.trim() ?? raw.trim(),
    inner: innerMatch?.[1]?.trim(),
    rawText: raw,
  }
}

// ─────────────────────────────────────────
// 사고 트리 — 단계별 지침 (thinkingTakeTurn용)
// ─────────────────────────────────────────

/**
 * Stage 1: 내면/OOC — 캐릭터 심리 분석
 * mode에 따라 [내면] (immersion) 또는 [OOC] (game) 태그 사용
 */
export function buildInnerStageInstruction(mode: PlayMode = 'immersion', modelLabel: string = '', charName: string = ''): string {
  const tag = getInnerTag(mode)
  const desc = mode === 'game'
    ? `${modelLabel}의 입장에서 ${charName ? charName + ' ' : ''}캐릭터가 현 상황에 어떤 행동과 모습을 보일 지 자신의 입장과 견해를 밝히세요.`
    : `지금 이 순간 캐릭터가 느끼는 감정, 두려움, 의심, 생각을 1인칭으로 서술하세요.`
  return `**[${tag}]** 만 작성하세요.
• 역할: ${desc}
• 기술 판정 선언은 포함하지 마세요
**[${tag}]** 태그로 시작하세요.`
}

/**
 * Stage 2: 행동 — 실제 행동 + 장면 묘사
 * 이전 [내면]/[OOC]이 히스토리에 있는 상태에서 호출됨
 */
export function buildActionStageInstruction(mode: PlayMode = 'immersion', provider: string = '', charName: string = ''): string {
  const tag = getInnerTag(mode)
  const formatHint = getProviderFormatHints(provider)
  const roleDesc = mode === 'game' && charName
    ? `${charName} 시점에서 어떤 말투로 말하고 행동하는지를 묘사하세요. 행동, 또는 대화 하나 당 최대 3개의 수식어를 붙여 묘사할 수 있어요.`
    : `캐릭터가 실제로 하는 말·동작·반응의 서사적 묘사`
  const lengthHint = mode === 'game' ? '' : '\n• 최대 3문장으로 간결하게'
  return `위 [${tag}]을 바탕으로 **[행동]** 만 작성하세요.
• 역할: ${roleDesc}${lengthHint}${formatHint ? '\n• ' + formatHint.replace(/^- /, '') : ''}
**[행동]** 태그로 시작하세요.`
}

/**
 * Claude Extended Thinking용 — system prompt 끝에 붙이는 사고 트리 지침
 */
export function buildThinkingTreeSystemSuffix(mode: PlayMode = 'immersion', provider: string = ''): string {
  const tag = getInnerTag(mode)
  const innerDesc = mode === 'game'
    ? `캐릭터의 감정·생각·행동 의도를 플레이어 시각으로 분석 (친근한 말투)`
    : `캐릭터가 지금 느끼는 감정, 두려움, 의심, 생각을 1인칭으로`
  const formatHint = getProviderFormatHints(provider)
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
응답 형식 및 사고 순서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

다음 세 단계를 순서대로 출력하세요:

**[${tag}]** ${innerDesc}
**[행동]** 캐릭터가 실제로 하는 말·동작·반응 — 최대 3문장${formatHint ? '\n' + formatHint : ''}

각 단계가 이전 단계를 뿌리로 삼아 깊어져야 합니다.`
}

