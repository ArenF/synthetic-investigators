/**
 * Game state management — tracks HP, SAN, items per character across turns.
 */

import type { CoCCharacter, SessionState, TurnRecord } from '../characters/types.js'

export class GameState {
  private states: Map<string, SessionState> = new Map()
  private characters: Map<string, CoCCharacter> = new Map()

  /** Initialize state from character definition */
  addCharacter(char: CoCCharacter): void {
    this.characters.set(char.id, char)
    this.states.set(char.id, {
      hp: char.derived.hp.current,
      san: char.derived.san.current,
      mp: char.derived.mp.current,
      luck: char.derived.luck,
      temporaryInsanity: false,
      indefiniteInsanity: false,
      injuries: [],
      currentItems: [...char.equipment.items],
      notes: '',
    })
  }

  getState(charId: string): SessionState {
    const state = this.states.get(charId)
    if (!state) throw new Error(`Character ${charId} not found in game state`)
    return state
  }

  getCharacter(charId: string): CoCCharacter {
    const char = this.characters.get(charId)
    if (!char) throw new Error(`Character ${charId} not found`)
    return char
  }

  getAllCharacterIds(): string[] {
    return [...this.states.keys()]
  }

  /** Apply HP damage */
  applyDamage(charId: string, amount: number): void {
    const state = this.getState(charId)
    state.hp = Math.max(0, state.hp - amount)
    if (amount > 0) {
      state.injuries.push(`${amount} 피해 받음`)
    }
  }

  /** Apply SAN loss */
  applySanLoss(charId: string, amount: number): void {
    const state = this.getState(charId)
    const char = this.getCharacter(charId)
    const prev = state.san
    state.san = Math.max(0, state.san - amount)

    // Check for temporary insanity (lose 5+ SAN in one round)
    if (amount >= 5) {
      state.temporaryInsanity = true
    }

    // Check for indefinite insanity (lose 1/5 of starting SAN in one session)
    const threshold = Math.floor(char.derived.san.starting / 5)
    if (prev - state.san >= threshold) {
      state.indefiniteInsanity = true
    }
  }

  /** Restore SAN */
  restoreSan(charId: string, amount: number): void {
    const state = this.getState(charId)
    const char = this.getCharacter(charId)
    state.san = Math.min(char.derived.san.max, state.san + amount)
  }

  /** Restore HP */
  restoreHp(charId: string, amount: number): void {
    const state = this.getState(charId)
    const char = this.getCharacter(charId)
    state.hp = Math.min(char.derived.hp.max, state.hp + amount)
  }

  /** Spend/restore luck */
  spendLuck(charId: string, amount: number): void {
    const state = this.getState(charId)
    state.luck = Math.max(0, state.luck - amount)
  }

  /** Add/remove item */
  addItem(charId: string, item: string): void {
    this.getState(charId).currentItems.push(item)
  }

  removeItem(charId: string, item: string): void {
    const state = this.getState(charId)
    state.currentItems = state.currentItems.filter(i => i !== item)
  }

  /** Clear temporary insanity (after session or treatment) */
  clearTemporaryInsanity(charId: string): void {
    this.getState(charId).temporaryInsanity = false
  }

  /** Print a readable status table */
  printStatusTable(): void {
    console.log('\n┌─────────────────────────────────────────────────────────┐')
    console.log('│  캐릭터 현황                                              │')
    console.log('├──────────┬──────────┬──────────┬──────────┬─────────────┤')
    console.log('│  이름    │  HP      │  SAN     │  행운    │  모델       │')
    console.log('├──────────┼──────────┼──────────┼──────────┼─────────────┤')

    for (const [id, state] of this.states) {
      const char = this.getCharacter(id)
      const hp = `${state.hp}/${char.derived.hp.max}`
      const san = `${state.san}/${char.derived.san.starting}`
      const name = char.name.padEnd(8)
      const model = char.modelConfig.model.split('-').slice(0, 2).join('-').padEnd(11)
      const insane = state.temporaryInsanity ? '⚠️' : state.indefiniteInsanity ? '🔴' : '  '
      console.log(`│ ${name} │ ${hp.padEnd(8)} │ ${san.padEnd(8)} │ ${String(state.luck).padEnd(8)} │ ${model} ${insane}│`)
    }
    console.log('└──────────┴──────────┴──────────┴──────────┴─────────────┘\n')
  }
}
