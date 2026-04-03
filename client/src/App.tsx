import React, { useEffect, useRef } from 'react'
import { useStore } from './store'
import HomeScreen from './components/HomeScreen'
import SessionSetup from './components/SessionSetup'
import GameScreen from './components/GameScreen'
import CharacterEditor from './components/CharacterEditor'
import LogViewer from './components/LogViewer'

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
    setWs,
    setWsReady,
    setPendingSetup,
    setNpcs,
  } = useStore()

  const wsRef = useRef<WebSocket | null>(null)

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
        const { charId, charName, text, done } = msg
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
            updateMessage(placeholder.id, { text, done: true })
          } else {
            addMessage({
              id: `ai-${charId}-${Date.now()}`,
              type: 'ai_response',
              charId,
              charName,
              text,
              timestamp: new Date().toISOString(),
              done: true,
            })
          }
        }
        break
      }

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
      socket.close()
    }
  }, [screen, sessionId])

  return (
    <div className="min-h-screen bg-coc-bg text-coc-text">
      {screen === 'home' && <HomeScreen />}
      {screen === 'session_setup' && <SessionSetup />}
      {screen === 'game' && <GameScreen />}
      {screen === 'character_editor' && <CharacterEditor />}
      {screen === 'log_viewer' && <LogViewer />}
    </div>
  )
}
