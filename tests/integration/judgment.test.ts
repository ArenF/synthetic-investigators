/**
 * tests/integration/judgment.test.ts
 * 판정 시스템 통합 테스트 (B 카테고리)
 *
 * 실행 전 서버가 localhost:3001에 떠 있어야 함.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type WebSocket from 'ws'
import {
  openWs,
  sendStartSession,
  collectUntil,
  requestAndResolveJudgment,
  WsMessage,
} from '../helpers/ws-client.js'

let ws: WebSocket

async function startSession(characterIds = ['jisu']) {
  const promise = collectUntil(ws, 'session_started', 10000)
  sendStartSession(ws, { characterIds, playMode: 'game' })
  await promise
}

beforeEach(async () => {
  ws = await openWs()
  await startSession()
}, 20000)

afterEach(() => {
  if (ws?.readyState === WebSocket.OPEN) ws.close()
})

// ════════════════════════════════════════════════════════════════
// B-1. 단순 판정 — 6-tier 결과 수신 확인
// ════════════════════════════════════════════════════════════════
describe('B-1: 단순 판정 (일반 난이도)', () => {
  it('judgment_request → judgment_final 수신, 6-tier outcome 중 하나', async () => {
    const result = await requestAndResolveJudgment(ws, {
      charId: 'jisu', skill: '스팟히든', difficulty: 'regular',
    })
    expect(result).toBeTruthy()

    const validOutcomes = [
      'extreme_success', 'hard_success', 'regular_success',
      'regular_failure', 'bad_failure', 'fumble',
    ]
    expect(validOutcomes).toContain(result.outcome)
  }, 20000)

  it('judgment_final에 roll, target, skill 필드 포함', async () => {
    const result = await requestAndResolveJudgment(ws, {
      charId: 'jisu', skill: '심리학', difficulty: 'regular',
    })
    expect(typeof result.roll).toBe('number')
    expect(typeof result.target).toBe('number')
    expect(result.skill).toBeTruthy()
  }, 20000)
})

// ════════════════════════════════════════════════════════════════
// B-2. 단순 판정 — 어려움/극한 난이도
// ════════════════════════════════════════════════════════════════
describe('B-2: 단순 판정 — 어려움/극한 난이도', () => {
  it('hard 난이도 판정 완료', async () => {
    const result = await requestAndResolveJudgment(ws, {
      charId: 'jisu', skill: '도서관이용', difficulty: 'hard',
    })
    expect(result).toBeTruthy()
    expect(typeof result.target).toBe('number')
  }, 20000)

  it('extreme 난이도 판정 완료', async () => {
    const result = await requestAndResolveJudgment(ws, {
      charId: 'jisu', skill: '스팟히든', difficulty: 'extreme',
    })
    expect(result).toBeTruthy()
  }, 20000)
})

// ════════════════════════════════════════════════════════════════
// B-3. 보너스/페널티 다이스
// ════════════════════════════════════════════════════════════════
describe('B-3: 보너스/페널티 다이스', () => {
  it('보너스 다이스 1개 — judgment_final 수신', async () => {
    const result = await requestAndResolveJudgment(ws, {
      charId: 'jisu', skill: '청취', bonus: 1,
    })
    expect(result).toBeTruthy()
    expect(result.outcome).toBeTruthy()
  }, 20000)

  it('페널티 다이스 1개 — judgment_final 수신', async () => {
    const result = await requestAndResolveJudgment(ws, {
      charId: 'jisu', skill: '언변', penalty: 1,
    })
    expect(result).toBeTruthy()
  }, 20000)
})

// ════════════════════════════════════════════════════════════════
// B-4. HP/SAN 효과 적용 확인
// ════════════════════════════════════════════════════════════════
describe('B-4: 판정 결과 효과 적용', () => {
  it('판정 완료 후 judgment_final 수신 + 효과 필드 확인', async () => {
    const result = await requestAndResolveJudgment(ws, {
      charId: 'jisu', skill: '심리학', difficulty: 'extreme',
    })

    expect(result).toBeTruthy()
    expect(result.outcome).toBeTruthy()
    // effectsApplied 배열 존재 확인 (bad_failure/fumble 시 값 있음)
    expect(Array.isArray(result.effectsApplied)).toBe(true)

    console.log(`  → outcome: ${result.outcome}, roll: ${result.roll}/${result.target}`)
    console.log(`  → effects: ${JSON.stringify(result.effectsApplied)}`)
  }, 20000)
})
