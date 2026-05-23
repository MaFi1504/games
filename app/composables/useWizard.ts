import { computed, ref } from 'vue'
import { loadFromStorage, saveToStorage } from './useGameStorage'

export interface WizardRoundEntry {
  bid: number | null
  bidLocked: boolean
  tricks: number | null
}

export interface WizardRound {
  entries: WizardRoundEntry[]
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

function createEntry(): WizardRoundEntry {
  return { bid: null, bidLocked: false, tricks: null }
}

export function useWizard() {
  const players = ref<string[]>([])
  const rounds = ref<WizardRound[]>([])

  const playerTotals = computed(() =>
    players.value.map((_, pi) =>
      rounds.value.reduce((sum, round) => {
        const entry = round.entries[pi]
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
                bidLocked: entry.bidLocked === true,
                tricks: typeof entry.tricks === 'number' ? entry.tricks : null
              }))
            : players.value.map(() => createEntry())
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
      entries: players.value.map(() => createEntry())
    })
    save()
  }

  function removeLastRound() {
    rounds.value.pop()
    save()
  }

  function setBid(roundIndex: number, playerIndex: number, bid: number | null) {
    const entry = rounds.value[roundIndex]?.entries[playerIndex]
    if (!entry || entry.bidLocked) return
    entry.bid = bid
    save()
  }

  function lockBid(roundIndex: number, playerIndex: number) {
    const entry = rounds.value[roundIndex]?.entries[playerIndex]
    if (!entry) return
    entry.bidLocked = true
    save()
  }

  function setTricks(roundIndex: number, playerIndex: number, tricks: number | null) {
    const entry = rounds.value[roundIndex]?.entries[playerIndex]
    if (!entry) return
    entry.tricks = tricks
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
    setBid,
    lockBid,
    setTricks,
    reset
  }
}
