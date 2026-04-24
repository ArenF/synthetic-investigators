/**
 * tests/helpers/ws-client.ts
 * WebSocket 테스트용 헬퍼 클라이언트
 */

import WebSocket from 'ws'

export const WS_URL = 'ws://localhost:3001'
export const API_URL = 'http://localhost:3001'

export type WsMessage = Record<string, unknown>

/**
 * WebSocket 연결을 열고 첫 메시지(ready 등)를 기다린다
 */
export function openWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL)
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
    setTimeout(() => reject(new Error('WS connection timeout')), 5000)
  })
}

/**
 * 다음 메시지 수신까지 기다린다
 */
export function nextMessage(ws: WebSocket, timeout = 30000): Promise<WsMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`nextMessage timeout (${timeout}ms)`)), timeout)
    ws.once('message', (data) => {
      clearTimeout(timer)
      resolve(JSON.parse(data.toString()))
    })
  })
}

/**
 * 특정 type의 메시지가 올 때까지 기다린다 (다른 타입은 무시)
 */
export function waitForMessage(
  ws: WebSocket,
  type: string,
  timeout = 60000,
): Promise<WsMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`waitForMessage('${type}') timeout`)),
      timeout,
    )

    const handler = (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString()) as WsMessage
      if (msg.type === type) {
        clearTimeout(timer)
        ws.off('message', handler)
        resolve(msg)
      }
    }

    ws.on('message', handler)
  })
}

/**
 * 여러 메시지를 수집하다가 terminator type이 오면 반환
 */
export function collectUntil(
  ws: WebSocket,
  terminator: string,
  timeout = 60000,
): Promise<WsMessage[]> {
  return new Promise((resolve, reject) => {
    const collected: WsMessage[] = []
    const timer = setTimeout(
      () => reject(new Error(`collectUntil('${terminator}') timeout`)),
      timeout,
    )

    const handler = (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString()) as WsMessage
      collected.push(msg)
      if (msg.type === terminator) {
        clearTimeout(timer)
        ws.off('message', handler)
        resolve(collected)
      }
    }

    ws.on('message', handler)
  })
}

/**
 * 세션 시작 메시지 전송
 */
export function sendStartSession(ws: WebSocket, params: {
  name?: string
  characterIds: string[]
  playMode?: 'game' | 'immersion'
  openingBriefing?: string
}) {
  const sessionId = `test-${Date.now()}`
  ws.send(JSON.stringify({
    type: 'start_session',
    sessionId,
    setup: {
      sessionName: params.name ?? '테스트 세션',
      characterIds: params.characterIds,
      playMode: params.playMode ?? 'game',
      openingBriefing: params.openingBriefing ?? '1925년, 어두운 밤.',
      npcs: [],
      items: [],
      turnOrder: params.characterIds,
    },
  }))
  return sessionId
}

/**
 * GM 턴 전송
 */
export function sendTurn(ws: WebSocket, gmText: string, targetIds?: string[]) {
  ws.send(JSON.stringify({
    type: 'send_turn',
    gmText,
    targetIds: targetIds ?? [],
    targetLabel: targetIds?.length ? '지정' : '전체',
  }))
}

/**
 * 판정 요청 전송
 */
export function sendJudgmentRequest(ws: WebSocket, params: {
  charId: string
  skill: string
  difficulty?: 'regular' | 'hard' | 'extreme'
  bonus?: number
  penalty?: number
}) {
  ws.send(JSON.stringify({
    type: 'judgment_request',
    charId: params.charId,
    skill: params.skill,
    difficulty: params.difficulty ?? 'regular',
    bonus: params.bonus ?? 0,
    penalty: params.penalty ?? 0,
    outcomes: {
      extremeSuccess: { description: '극단적 성공!', effects: [] },
      hardSuccess:    { description: '어려운 성공!', effects: [] },
      regularSuccess: { description: '성공!',        effects: [] },
      regularFailure: { description: '실패.',         effects: [] },
      badFailure:     { description: '나쁜 실패.',    effects: [{ kind: 'stat', stat: 'hp', delta: -1 }] },
      fumble:         { description: '대실패!',       effects: [{ kind: 'stat', stat: 'hp', delta: -2 }] },
    },
  }))
}

/**
 * 판정 수락 전송 (judgment_pending → judgment_final)
 */
export function sendJudgmentResolve(ws: WebSocket, judgmentId?: string) {
  ws.send(JSON.stringify({
    type: 'judgment_resolve',
    judgmentId,
    resolution: { action: 'accept' },
  }))
}

/**
 * 판정 요청 → 자동 수락 → judgment_final 반환
 * (테스트용 one-shot 헬퍼)
 */
export async function requestAndResolveJudgment(
  ws: WebSocket,
  params: Parameters<typeof sendJudgmentRequest>[1],
  timeout = 15000,
): Promise<WsMessage> {
  // pending / final 리스너를 요청 전에 미리 등록
  const pendingP = waitForMessage(ws, 'judgment_pending', timeout)
  const finalP   = waitForMessage(ws, 'judgment_final',   timeout)

  sendJudgmentRequest(ws, params)

  const pending = await pendingP
  sendJudgmentResolve(ws, pending.id as string | undefined)

  return finalP
}

/**
 * HTTP API 호출 헬퍼
 */
export async function fetchApi(path: string): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'no-proxy': '1' },
  })
  return res.json()
}
