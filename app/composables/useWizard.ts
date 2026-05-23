import { computed, ref } from 'vue'
import { loadFromStorage, saveToStorage } from './useGameStorage'

export interface WizardPlayerEntry {
  bid: number | null
  tricks: number | null
}

export interface WizardRound {
  entries: WizardPlayerEntry[]
}

interface WizardState {
  players: string[]
  rounds: WizardRound[]
}

const STORAGE_KEY = 'wizard-game'

export function computeRoundPoints(bid: number | null, tricks: number | null): number | null {
  if (bid === null || tricks === null) return null
  if (bid === tricks) return 20 + 10 * tricks
  return -10 * Math.abs(bid - tricks)
}

export function useWizard() {
  const players = ref<string[]>([])
  const rounds = ref<WizardRound[]>([])

  const playerTotals = computed(() =>
    players.value.map((_, playerIndex) =>
      rounds.value.reduce((sum, round) => {
        const entry = round.entries[playerIndex]
        if (!entry) return sum
        const pts = computeRoundPoints(entry.bid, entry.tricks)
        return pts !== null ? sum + pts : sum
      }, 0)
    )
  )

  function load() {
    const data = loadFromStorage<WizardState>(STORAGE_KEY)
    if (!data) return

    players.value = Array.isArray(data.players)
      ? data.players.filter(p => typeof p === 'string' && p.trim().length > 0).map(p => p.trim())
      : []

    rounds.value = Array.isArray(data.rounds)
      ? data.rounds.map(round => ({
          entries: Array.isArray(round.entries)
            ? round.entries.map(entry => ({
                bid: typeof entry.bid === 'number' ? entry.bid : null,
                tricks: typeof entry.tricks === 'number' ? entry.tricks : null
              }))
            : players.value.map(() => ({ bid: null, tricks: null }))
        }))
      : []
  }

  function save() {
    saveToStorage<WizardState>(STORAGE_KEY, {
      players: players.value,
      rounds: rounds.value
    })
  }

  function startGame(playerNames: string[]) {
    players.value = playerNames.map(n => n.trim()).filter(n => n.length > 0)
    rounds.value = []
    save()
  }

  function addRound() {
    rounds.value.push({
      entries: players.value.map(() => ({ bid: null, tricks: null }))
    })
    save()
  }

  function removeLastRound() {
    rounds.value.pop()
    save()
  }

  function updateBid(roundIndex: number, playerIndex: number, bid: number | null) {
    const round = rounds.value[roundIndex]
    if (!round) return
    round.entries[playerIndex].bid = bid
    save()
  }

  function updateTricks(roundIndex: number, playerIndex: number, tricks: number | null) {
    const round = rounds.value[roundIndex]
    if (!round) return
    round.entries[playerIndex].tricks = tricks
    save()
  }

  function reset() {
    players.value = []
    rounds.value = []
    save()
  }

  return {
    players,
    rounds,
    playerTotals,
    load,
    startGame,
    addRound,
    removeLastRound,
    updateBid,
    updateTricks,
    reset
  }
}
