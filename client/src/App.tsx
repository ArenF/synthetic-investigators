import React, { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import HomeScreen from './components/HomeScreen'
import SessionSetup from './components/SessionSetup'
import GameScreen from './components/GameScreen'
import CharacterEditor from './components/CharacterEditor'
import LogViewer from './components/LogViewer'
import ScenarioList from './components/ScenarioList'
import ScenarioEditor from './components/ScenarioEditor'

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`

export default function App() {
  const {
    screen,
    sessionId,
    pendingSetup,
    setCharacters,
    addMessage,
    setMessages,
    updateMessage,
    setProcessing,
    setTurnQueueSize,
    setWs,
    setWsReady,
    setPendingSetup,
    setNpcs,
  } = useStore()

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [reconnectKey, setReconnectKey] = useState(0)

  function handleServerMessage(msg: any) {
    const store = useStore.getState()

    switch (msg.type) {
      case 'state_update':
        setCharacters(msg.characters)
        break

      case 'chat_history':
        setMessages(msg.messages ?? [])
        break

      case 'gm_message':
        addMessage(msg.message)
        break

      case 'system_message':
        addMessage(msg.message)
        break

      case 'npc_message':
        addMessage(msg.message)
        break

      case 'ai_response': {
        const { charId, charName, text, innerText, actionText, playMode, done } = msg
        if (!done) {
          // Add thinking placeholder if not already present
          const existing = store.chatMessages.find(
            m => m.type === 'ai_response' && m.charId === charId && m.done === false
          )
          if (!existing) {
            addMessage({
              id: `thinking-${charId}-${Date.now()}`,
              type: 'ai_response',
              charId,
              charName,
              text: '',
              timestamp: new Date().toISOString(),
              done: false,
            })
          }
          setProcessing(true)
        } else {
          // Replace thinking placeholder with actual response
          const placeholder = store.chatMessages.find(
            m => m.type === 'ai_response' && m.charId === charId && m.done === false
          )
          if (placeholder) {
            updateMessage(placeholder.id, { text, innerText, actionText, playMode, done: true })
          } else {
            addMessage({
              id: `ai-${charId}-${Date.now()}`,
              type: 'ai_response',
              charId,
              charName,
              text,
              innerText,
              actionText,
              playMode,
              timestamp: new Date().toISOString(),
              done: true,
            })
          }
        }
        break
      }

      case 'judgment_pending':
        store.setPendingJudgment(msg)
        break

      case 'judgment_final':
        store.setPendingJudgment(null)
        addMessage({
          id: `judgment-${Date.now()}`,
          type: 'dice_result',
          charId: msg.charId,
          charName: msg.charName,
          text: `${msg.charName} — ${msg.skill} 판정`,
          timestamp: new Date().toISOString(),
          done: true,
          diceData: {
            skill: msg.skill,
            difficulty: msg.difficulty,
            roll: msg.roll,
            target: msg.target,
            outcome: msg.outcome,
            resultText: msg.appliedOutcome?.desc ?? '',
            wasPush: msg.wasPush,
            wasLuckSpend: msg.wasLuckSpend,
            luckSpent: msg.luckSpent,
            tensDice: msg.tensDice,
          },
        })
        break

      case 'judgment_cancelled':
        store.setPendingJudgment(null)
        break

      case 'san_check_result':
        addMessage({
          id: `san-${Date.now()}`,
          type: 'dice_result',
          charId: msg.charId,
          charName: msg.charName,
          text: `${msg.charName} — SAN 체크`,
          timestamp: new Date().toISOString(),
          done: true,
          diceData: {
            skill: 'SAN',
            difficulty: 'regular',
            roll: msg.sanRoll,
            target: msg.sanTarget,
            outcome: msg.sanOutcome,
            resultText: msg.naturalLanguage,
          },
        })
        break

      case 'dice_result':
        addMessage({
          id: `dice-${Date.now()}`,
          type: 'dice_result',
          charId: msg.charId,
          charName: msg.charName,
          text: `${msg.charName} — ${msg.skill} 판정`,
          timestamp: new Date().toISOString(),
          done: true,
          diceData: {
            skill: msg.skill,
            difficulty: msg.difficulty,
            roll: msg.roll,
            target: msg.target,
            outcome: msg.outcome,
            resultText: msg.resultText,
          },
        })
        break

      case 'order_updated':
        store.setTurnOrder(msg.order)
        break

      case 'mode_changed':
        store.setPlayMode(msg.mode)
        break

      case 'queue_update':
        setTurnQueueSize(msg.remaining ?? 0)
        break

      case 'turn_complete':
        setProcessing(false)
        break

      case 'session_started':
        break

      case 'error':
        console.error('Server error:', msg.message)
        setProcessing(false)
        break
    }
  }

  useEffect(() => {
    if (screen !== 'game' || !sessionId) return

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const socket = new WebSocket(`${WS_BASE}?sessionId=${sessionId}`)
    wsRef.current = socket

    socket.onopen = () => {
      reconnectAttempts.current = 0  // reset on successful connection
      setWsReady(true)
      setWs(socket)

      // If there's a pending setup (new session), send start_session
      const setup = useStore.getState().pendingSetup
      if (setup) {
        socket.send(JSON.stringify({
          type: 'start_session',
          sessionId,
          setup,
        }))
        // Store NPCs
        setNpcs(setup.npcs)
        setPendingSetup(null)
      }
    }

    socket.onclose = () => {
      setWsReady(false)
      setWs(null)

      // Auto-reconnect with exponential backoff (only while in game screen, max 5 attempts)
      const currentScreen = useStore.getState().screen
      if (currentScreen === 'game' && reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30_000)
        reconnectAttempts.current++
        reconnectTimer.current = setTimeout(() => {
          setReconnectKey(k => k + 1)
        }, delay)
      }
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleServerMessage(msg)
      } catch (err) {
        console.error('Failed to parse WS message', err)
      }
    }

    return () => {
      // Clear any pending reconnect timer
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      socket.close()
      wsRef.current = null
      // Sync Zustand state on cleanup
      useStore.getState().setWs(null)
      useStore.getState().setWsReady(false)
    }
  }, [screen, sessionId, reconnectKey])

  return (
    <div className="h-full font-sans" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {screen === 'home' && <HomeScreen />}
      {screen === 'session_setup' && <SessionSetup />}
      {screen === 'game' && <GameScreen />}
      {screen === 'character_editor' && <CharacterEditor />}
      {screen === 'log_viewer' && <LogViewer />}
      {screen === 'scenario_list' && <ScenarioList />}
      {screen === 'scenario_editor' && <ScenarioEditor />}
    </div>
  )
}
