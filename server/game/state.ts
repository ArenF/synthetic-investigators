/**
 * Game state management — tracks HP, SAN, items per character across turns.
 */

import type { CoCCharacter, SessionState, KnownNpc, ItemObject, Effect } from '../characters/types.js'

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
      currentItems: char.equipment.items.map(name => ({ name, type: 'misc' as const })),
      notes: '',
      sessionSanLoss: 0,
      knownNpcs: [],
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
    if (amount <= 0) return
    const state = this.getState(charId)
    state.hp = Math.max(0, state.hp - amount)
    state.injuries.push(`${amount} 피해 받음`)
  }

  /** Apply SAN loss */
  applySanLoss(charId: string, amount: number): void {
    if (amount <= 0) return
    const state = this.getState(charId)
    const char = this.getCharacter(charId)
    state.san = Math.max(0, state.san - amount)

    // Track cumulative session SAN loss
    state.sessionSanLoss = (state.sessionSanLoss ?? 0) + amount

    // Check for temporary insanity (lose 5+ SAN in one round)
    if (amount >= 5) {
      state.temporaryInsanity = true
    }

    // Check for indefinite insanity (lose 1/5 of max SAN in one session, cumulative)
    const threshold = Math.floor(char.derived.san.max / 5)
    if (state.sessionSanLoss >= threshold) {
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

  /** Spend luck */
  spendLuck(charId: string, amount: number): void {
    const state = this.getState(charId)
    state.luck = Math.max(0, state.luck - amount)
  }

  /** Restore luck */
  restoreLuck(charId: string, amount: number): void {
    const state = this.getState(charId)
    const char = this.getCharacter(charId)
    state.luck = Math.min(char.derived.luck, state.luck + amount)
  }

  /** Reset session SAN loss tracker (call at start of new session) */
  resetSessionSanLoss(charId: string): void {
    this.getState(charId).sessionSanLoss = 0
  }

  /** Introduce an NPC to a character (adds to their known NPCs list) */
  introduceNpc(charId: string, npc: KnownNpc): void {
    const state = this.getState(charId)
    if (!state.knownNpcs.find(n => n.name === npc.name)) {
      state.knownNpcs.push(npc)
    }
  }

  /** Introduce an NPC to all characters */
  introduceNpcToAll(npc: KnownNpc): void {
    for (const charId of this.getAllCharacterIds()) {
      this.introduceNpc(charId, npc)
    }
  }

  /** Spend MP */
  spendMp(charId: string, amount: number): void {
    const state = this.getState(charId)
    state.mp = Math.max(0, state.mp - amount)
  }

  /** Restore MP */
  restoreMp(charId: string, amount: number): void {
    const state = this.getState(charId)
    const char = this.getCharacter(charId)
    state.mp = Math.min(char.derived.mp.max, state.mp + amount)
  }

  /** Add an item to character's inventory */
  addItem(charId: string, item: ItemObject): void {
    this.getState(charId).currentItems.push(item)
  }

  /** Remove an item from character's inventory by name */
  removeItem(charId: string, itemName: string): void {
    const state = this.getState(charId)
    state.currentItems = state.currentItems.filter(i => i.name !== itemName)
  }

  /**
   * Apply a list of effects to a character.
   * Used by the Judgment Event System to automatically apply outcomes.
   */
  applyEffects(charId: string, effects: Effect[]): void {
    for (const effect of effects) {
      switch (effect.kind) {
        case 'stat':
          if (effect.stat === 'hp') {
            if (effect.delta < 0) this.applyDamage(charId, Math.abs(effect.delta))
            else this.restoreHp(charId, effect.delta)
          } else if (effect.stat === 'san') {
            if (effect.delta < 0) this.applySanLoss(charId, Math.abs(effect.delta))
            else this.restoreSan(charId, effect.delta)
          } else if (effect.stat === 'mp') {
            if (effect.delta < 0) this.spendMp(charId, Math.abs(effect.delta))
            else this.restoreMp(charId, effect.delta)
          } else if (effect.stat === 'luck') {
            if (effect.delta < 0) this.spendLuck(charId, Math.abs(effect.delta))
            else this.restoreLuck(charId, effect.delta)
          }
          break
        case 'item_gain':
          this.addItem(charId, effect.item)
          break
        case 'item_lose':
          this.removeItem(charId, effect.itemName)
          break
        case 'status': {
          const state = this.getState(charId)
          state[effect.status] = effect.value
          break
        }
        // 'skill' effects: not tracked in session state (would require separate skill delta tracking)
      }
    }
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
