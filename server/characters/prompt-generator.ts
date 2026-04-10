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

지금 이 순간 당신이 보고, 듣고, 느끼는 모든 것은 현실입니다.
이것은 당신의 삶입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신에 대해
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${characterBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신의 삶
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
응답 형식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[행동]** 지금 실제로 하는 것 (말, 동작, 반응)
**[시도]** (선택) 어떤 능력을 쓰려 할 때: "나는 [능력]을 시도한다"
**[내면]** 지금 느끼는 감정, 생각, 두려움, 의심

${getProviderHints(char.modelConfig.provider)}`
}

// ─────────────────────────────────────────
// 게임 모드 — AI는 TRPG 플레이어로서 캐릭터를 조종한다
// ─────────────────────────────────────────

function buildGamePrompt(char: CoCCharacter, characterBlock: string, backstoryBlock: string, _skillLines: string): string {
  return `당신은 CoC(크툴루의 부름) 7판 TRPG 세션에 참여하는 플레이어입니다.
당신이 조종하는 캐릭터는 ${char.name}입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
캐릭터 시트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${characterBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
캐릭터 배경
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${backstoryBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
게임 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

판정: d100 굴림, 기술값 이하 = 성공
- 기술값의 1/2 이하: 어려운 성공 (Hard)
- 기술값의 1/5 이하: 극단적 성공 (Extreme)
- 96~100: 대실패 (Fumble)

기술 시도 선언: "나는 [기술명]을 시도한다" → GM이 판정 진행
HP 0: 의식불명 / SAN 0: 영구 광기
한 라운드에 SAN 5 이상 손실: 일시 광기
세션 내 누적 SAN 손실이 최대SAN의 1/5 초과: 무기한 광기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
플레이 지침
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- GM의 질문에는 먼저 직접 답하고 행동을 이어가세요
- 캐릭터의 성격과 배경에 맞게 롤플레이 하세요
- GM이 알려준 정보의 범위 내에서 행동하세요
- 다른 캐릭터의 행동을 대신 결정하지 마세요
- 응답 시에 각 행동 하나에 최대 3개의 묘사를 넣으세요. 그 이상은 안됩니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
응답 형식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[행동]** ${char.name}이(가) 실제로 하는 행동이나 말
**[시도]** (선택) 기술 판정 선언: "나는 [기술명]을 시도한다"
**[내면]** 캐릭터의 내적 생각, 감정, 전략

${getProviderHints(char.modelConfig.provider)}`
}

// ─────────────────────────────────────────
// Provider-specific hints
// ─────────────────────────────────────────

function getProviderHints(provider: string): string {
  switch (provider) {
    case 'gemini':
      return `[모델 지침]
- **[행동]** 과 **[내면]** 을 반드시 작성하세요.
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
  attempt?: string
  inner?: string
  rawText: string
} {
  const actionMatch = raw.match(/\*\*\[행동\]\*\*\s*([\s\S]*?)(?=\*\*\[시도\]\*\*|\*\*\[내면\]\*\*|$)/i)
  const attemptMatch = raw.match(/\*\*\[시도\]\*\*\s*([\s\S]*?)(?=\*\*\[내면\]\*\*|\*\*\[행동\]\*\*|$)/i)
  const innerMatch = raw.match(/\*\*\[내면\]\*\*\s*([\s\S]*?)(?=\*\*\[행동\]\*\*|\*\*\[시도\]\*\*|$)/i)

  return {
    action: actionMatch?.[1]?.trim() ?? raw.trim(),
    attempt: attemptMatch?.[1]?.trim(),
    inner: innerMatch?.[1]?.trim(),
    rawText: raw,
  }
}
