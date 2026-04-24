/**
 * tests/integration/session.test.ts
 * WebSocket 세션 통합 테스트
 *
 * 실행 전 서버가 localhost:3001에 떠 있어야 함.
 * npm run server:dev 또는 npx tsx server/api.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import WebSocket from 'ws'
import {
  openWs,
  sendStartSession,
  sendTurn,
  collectUntil,
  WsMessage,
} from '../helpers/ws-client.js'

// 각 테스트마다 새 WebSocket으로 깔끔하게 시작
let ws: WebSocket

beforeEach(async () => {
  ws = await openWs()
}, 10000)

afterEach(() => {
  if (ws?.readyState === WebSocket.OPEN) ws.close()
})

// ════════════════════════════════════════════════════════════════
// A-1. 세션 생성
// ════════════════════════════════════════════════════════════════
describe('A-1: 세션 생성', () => {
  it('start_session → session_started 수신', async () => {
    // 리스너를 먼저 세팅, 그 다음 전송 (레이스 컨디션 방지)
    const promise = collectUntil(ws, 'session_started', 10000)
    sendStartSession(ws, { characterIds: ['jisu'] })

    const msgs = await promise
    const started = msgs.find(m => m.type === 'session_started')
    expect(started).toBeTruthy()
    expect(started?.sessionId).toBeTruthy()
  }, 15000)
})

// ════════════════════════════════════════════════════════════════
// A-2. GM 턴 → AI 응답
// ════════════════════════════════════════════════════════════════
describe('A-2: GM 턴 → AI 응답', () => {
  it('send_turn → ai_response(done=true) + turn_complete 수신', async () => {
    // 세션 시작
    const setupP = collectUntil(ws, 'session_started', 10000)
    sendStartSession(ws, { characterIds: ['jisu'] })
    await setupP

    // GM 턴 전송
    const turnP = collectUntil(ws, 'turn_complete', 90000)
    sendTurn(ws, '철문을 밀고 들어서자 낡은 복도가 나타났다. 어떻게 행동하겠는가?')

    const msgs = await turnP
    const aiResponses = msgs.filter(m => m.type === 'ai_response' && m.done === true)
    expect(aiResponses.length).toBeGreaterThanOrEqual(1)

    const aiMsg = aiResponses[0]
    expect(aiMsg.charId).toBe('jisu')
    expect(typeof aiMsg.text).toBe('string')
    expect((aiMsg.text as string).length).toBeGreaterThan(0)
  }, 120000)
})

// ════════════════════════════════════════════════════════════════
// A-3. innerText / actionText 분리
// ════════════════════════════════════════════════════════════════
describe('A-3: innerText / actionText 분리', () => {
  it('ai_response에 innerText, actionText 필드 존재', async () => {
    const setupP = collectUntil(ws, 'session_started', 10000)
    sendStartSession(ws, { characterIds: ['jisu'], playMode: 'game' })
    await setupP

    const turnP = collectUntil(ws, 'turn_complete', 90000)
    sendTurn(ws, '복도 끝에서 신음 소리가 들린다. 어떻게 반응하겠는가?')

    const msgs = await turnP
    const aiMsg = msgs.find(m => m.type === 'ai_response' && m.done === true) as WsMessage

    expect(aiMsg).toBeTruthy()
    expect(typeof aiMsg.innerText).toBe('string')
    expect(typeof aiMsg.actionText).toBe('string')
    expect((aiMsg.actionText as string).length).toBeGreaterThan(0)
  }, 120000)
})
