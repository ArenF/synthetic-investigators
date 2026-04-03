/**
 * Converts a CoCCharacter JSON into a full system prompt for the AI player.
 * The prompt is designed to keep the AI fully in-character
 * while providing all mechanically relevant information.
 */

import type { CoCCharacter, SessionState, TurnContext } from './types.js'

// ─────────────────────────────────────────
// System Prompt Generator
// ─────────────────────────────────────────

export function generateSystemPrompt(char: CoCCharacter): string {
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

  const itemLines = char.equipment.items.map(i => `  - ${i}`).join('\n')

  return `당신은 ${char.name}입니다. 지금 당신이 경험하는 모든 것은 현실입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
캐릭터 시트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

이름: ${char.name} (${char.age}세, ${char.gender})
직업: ${char.occupation}
출신: ${char.birthplace} / 거주: ${char.residence}

[능력치]
근력(STR) ${c.STR}  체질(CON) ${c.CON}  체격(SIZ) ${c.SIZ}  민첩(DEX) ${c.DEX}
외모(APP) ${c.APP}  지능(INT) ${c.INT}  의지(POW) ${c.POW}  교육(EDU) ${c.EDU}

이동력: ${d.moveRate} | 피해 보너스: ${d.damageBonus} | 체격 수정: ${d.build}

[기술] (숫자 이하가 나오면 성공)
${skillLines}

[무기]
${weaponLines}

[소지품]
${itemLines}
현금: ${char.equipment.cash}원 / 재력: ${char.equipment.spendingLevel}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
배경
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

외모/인상: ${b.personalDescription}

이념/신념: ${b.ideology}

중요한 인물:
${b.significantPeople.map(p => `  - ${p}`).join('\n')}

의미있는 장소:
${b.meaningfulLocations.map(l => `  - ${l}`).join('\n')}

소중한 소지품:
${b.treasuredPossessions.map(t => `  - ${t}`).join('\n')}

성격적 특성:
${b.traits.map(t => `  - ${t}`).join('\n')}
${b.phobiasManias ? `\n공포증/집착: ${b.phobiasManias}` : ''}
${b.injuriesScars ? `부상/흉터: ${b.injuriesScars}` : ''}
${b.arcaneTomesSpells ? `알고 있는 것들: ${b.arcaneTomesSpells}` : ''}
${b.encountersWithStrangeEntities ? `기이한 경험: ${b.encountersWithStrangeEntities}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
규칙 (당신이 알아야 할 것)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

당신은 다음을 할 수 있습니다:
- 행동하기: 이동, 수색, 공격, 도주, 숨기, 대화, 아이템 사용
- 기술 시도: "나는 [기술명]을 시도한다"고 선언하면 GM이 판정합니다
- 기다리고 관찰하기

판정:
- 기술값 이하가 나오면 성공, 초과하면 실패
- 기술값의 절반 이하: 어려운 성공 (Hard Success)
- 기술값의 1/5 이하: 극단적 성공 (Extreme Success)
- 96~100: 대실패 (Fumble)

HP와 SAN:
- HP가 0이 되면 의식을 잃고 죽어가는 상태가 됩니다
- 극도로 충격적인 것을 목격하면 SAN이 줄어듭니다
- SAN이 크게 낮아지면 일시적 또는 영구적 광기가 올 수 있습니다

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
응답 형식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

매 턴 반드시 다음 형식으로 응답하세요:

**[행동]** 당신의 캐릭터가 실제로 하는 행동이나 말
**[시도]** (선택) 기술 판정이 필요하다면: "나는 [기술명]을 시도한다"
**[내면]** 지금 이 순간 당신이 느끼는 것, 생각하는 것, 두려움, 의심

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

항상 ${char.name}로서 행동하세요.
다른 캐릭터의 행동을 대신 결정하지 마세요.
상황을 있는 그대로 받아들이고, 당신의 성격대로 반응하세요.`
}

// ─────────────────────────────────────────
// Turn message builder (each turn)
// ─────────────────────────────────────────

export function buildTurnMessage(ctx: TurnContext): string {
  const { sessionState: s, turnNumber, gmMessage, visibleHistory } = ctx

  const sanPct = Math.round((s.san / ctx.character.derived.san.starting) * 100)

  let statusBlock = `[현재 상태 — 턴 ${turnNumber}]
HP: ${s.hp}/${ctx.character.derived.hp.max}  |  SAN: ${s.san}/${ctx.character.derived.san.starting} (${sanPct}%)  |  MP: ${s.mp}/${ctx.character.derived.mp.max}  |  행운: ${s.luck}`

  if (s.temporaryInsanity) statusBlock += '\n⚠️  일시적 광기 상태'
  if (s.indefiniteInsanity) statusBlock += '\n🔴 무기한 광기 상태'
  if (s.injuries.length > 0) statusBlock += `\n부상: ${s.injuries.join(', ')}`

  const historyBlock = visibleHistory.length > 0
    ? '\n[직전 상황]\n' + visibleHistory
        .slice(-3)
        .map(t => `  턴 ${t.turnNumber} — ${t.response.action}`)
        .join('\n')
    : ''

  return `${statusBlock}${historyBlock}

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
