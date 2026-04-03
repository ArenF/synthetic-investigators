/**
 * Synthetic Investigators — GM Interface
 * Run: npm start
 *
 * Commands:
 *   /turn <scene>      — Send a scene to all characters
 *   /to <id> <scene>   — Send a scene to one character
 *   /stat              — Print character status table
 *   /hp <id> <delta>   — Apply HP change (e.g. /hp jisu -3)
 *   /san <id> <delta>  — Apply SAN change (e.g. /san minho -4)
 *   /luck <id> <delta> — Apply Luck change
 *   /item <id> +/-<item> — Add/remove item
 *   /roll <id> <skill> — Roll a skill check for a character
 *   /analysis          — Print experiment observation analysis
 *   /history <id>      — Print recent turns for a character
 *   /quit              — Exit
 */

import readline from 'readline'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { CoCCharacter, TurnContext } from './characters/types.js'
import { createPlayer } from './players/index.js'
import type { BasePlayer } from './players/index.js'
import { GameState } from './game/state.js'
import { ScenarioManager } from './game/scenario.js'
import { ExperimentLogger } from './game/logger.js'
import { skillCheck, outcomeLabel } from './game/dice.js'

// ─────────────────────────────────────────
// Load character JSONs
// ─────────────────────────────────────────

function loadCharacter(id: string): CoCCharacter {
  const paths = [
    `./characters/${id}.json`,
    `./src/characters/templates/${id}.json`,
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf-8')) as CoCCharacter
    }
  }
  throw new Error(`Character file not found for: ${id}`)
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  🎲 Synthetic Investigators — GM Console')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Parse CLI args: node index.ts <scenarioId> <char1> <char2> ...
  const args = process.argv.slice(2)
  const scenarioId = args[0] ?? 'default-session'
  const charIds = args.slice(1).length > 0 ? args.slice(1) : ['jisu', 'minho', 'yerin']

  console.log(`\n시나리오: ${scenarioId}`)
  console.log(`캐릭터: ${charIds.join(', ')}\n`)

  // Load characters and create players
  const characters: CoCCharacter[] = charIds.map(loadCharacter)
  const players: Map<string, BasePlayer> = new Map(
    characters.map(c => [c.id, createPlayer(c)])
  )

  // Initialize game systems
  const state = new GameState()
  characters.forEach(c => state.addCharacter(c))

  const scenario = new ScenarioManager(
    scenarioId,
    scenarioId.replace(/-/g, ' '),
    charIds
  )

  const logger = new ExperimentLogger(scenarioId)

  let turnNumber = scenario.turnCount + 1

  state.printStatusTable()

  // ─────────────────────────────────────────
  // GM Input Loop
  // ─────────────────────────────────────────

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const prompt = () => rl.question('\nGM> ', async (input) => {
    const line = input.trim()
    if (!line) { prompt(); return }

    // /quit
    if (line === '/quit' || line === '/exit') {
      console.log('\n세션을 종료합니다.')
      logger.printAnalysis()
      rl.close()
      return
    }

    // /stat
    if (line === '/stat') {
      state.printStatusTable()
      prompt(); return
    }

    // /analysis
    if (line === '/analysis') {
      logger.printAnalysis()
      prompt(); return
    }

    // /hp <id> <delta>
    const hpMatch = line.match(/^\/hp\s+(\w+)\s+([+-]?\d+)$/)
    if (hpMatch) {
      const [, id, delta] = hpMatch
      const d = parseInt(delta)
      if (d < 0) state.applyDamage(id, Math.abs(d))
      else state.restoreHp(id, d)
      state.printStatusTable()
      prompt(); return
    }

    // /san <id> <delta>
    const sanMatch = line.match(/^\/san\s+(\w+)\s+([+-]?\d+)$/)
    if (sanMatch) {
      const [, id, delta] = sanMatch
      const d = parseInt(delta)
      if (d < 0) state.applySanLoss(id, Math.abs(d))
      else state.restoreSan(id, d)
      state.printStatusTable()
      prompt(); return
    }

    // /luck <id> <delta>
    const luckMatch = line.match(/^\/luck\s+(\w+)\s+([+-]?\d+)$/)
    if (luckMatch) {
      const [, id, delta] = luckMatch
      state.spendLuck(id, parseInt(delta) > 0 ? parseInt(delta) : Math.abs(parseInt(delta)))
      state.printStatusTable()
      prompt(); return
    }

    // /roll <id> <skillName>
    const rollMatch = line.match(/^\/roll\s+(\w+)\s+(.+)$/)
    if (rollMatch) {
      const [, id, skillName] = rollMatch
      const char = state.getCharacter(id)
      const skillVal = char.skills[skillName]
      if (!skillVal) {
        console.log(`기술을 찾을 수 없습니다: ${skillName}`)
      } else {
        const result = skillCheck(skillVal)
        console.log(`\n🎲 ${char.name} — ${skillName} (${skillVal}%)`)
        console.log(`   주사위: ${result.roll} → ${outcomeLabel(result.outcome)}`)
      }
      prompt(); return
    }

    // /item <id> +<item> or -<item>
    const itemMatch = line.match(/^\/item\s+(\w+)\s+([+-])(.+)$/)
    if (itemMatch) {
      const [, id, op, item] = itemMatch
      if (op === '+') state.addItem(id, item.trim())
      else state.removeItem(id, item.trim())
      console.log(`아이템 ${op === '+' ? '추가' : '제거'}: ${item.trim()}`)
      prompt(); return
    }

    // /history <id>
    const histMatch = line.match(/^\/history\s+(\w+)$/)
    if (histMatch) {
      const [, id] = histMatch
      const hist = scenario.getCharacterHistory(id, 5)
      if (hist.length === 0) {
        console.log('기록 없음')
      } else {
        for (const t of hist) {
          console.log(`\n턴 ${t.turnNumber} — ${t.characterName}`)
          console.log(`  [행동] ${t.response.action}`)
          if (t.response.inner) console.log(`  [내면] ${t.response.inner}`)
        }
      }
      prompt(); return
    }

    // /to <id> <scene>
    const toMatch = line.match(/^\/to\s+(\w+)\s+([\s\S]+)$/)
    if (toMatch) {
      const [, id, scene] = toMatch
      const player = players.get(id)
      if (!player) { console.log(`캐릭터 없음: ${id}`); prompt(); return }

      await runTurn([player], scene, state, scenario, logger, turnNumber++)
      prompt(); return
    }

    // /turn <scene> or bare text → send to all
    const scene = line.startsWith('/turn ') ? line.slice(6) : line

    await runTurn([...players.values()], scene, state, scenario, logger, turnNumber++)
    state.printStatusTable()
    prompt()
  })

  prompt()
}

// ─────────────────────────────────────────
// Run a turn for a set of players
// ─────────────────────────────────────────

async function runTurn(
  players: BasePlayer[],
  gmMessage: string,
  state: GameState,
  scenario: ScenarioManager,
  logger: ExperimentLogger,
  turnNumber: number,
): Promise<void> {
  console.log(`\n━━━ 턴 ${turnNumber} ━━━\n`)

  for (const player of players) {
    const char = state.getCharacter(player.id)
    const sessionState = state.getState(player.id)
    const history = scenario.getCharacterHistory(player.id, 3)

    const ctx: TurnContext = {
      character: char,
      sessionState,
      scenarioId: scenario.scenarioId,
      turnNumber,
      gmMessage,
      visibleHistory: history,
    }

    process.stdout.write(`\n▶ ${player.name} (${player.provider}/${player.model})...\n`)

    const record = await player.takeTurn(ctx)

    // Print response
    console.log(`\n┌─ ${player.name} ─────────────────────`)
    console.log(`│ [행동] ${record.response.action}`)
    if (record.response.attempt) {
      console.log(`│ [시도] ${record.response.attempt}`)
    }
    if (record.response.inner) {
      console.log(`│ [내면] ${record.response.inner}`)
    }
    console.log(`└─────────────────────────────────────`)

    scenario.addTurn(record)
    logger.record(record)
  }
}

main().catch(console.error)
