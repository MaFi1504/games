import { computed, ref } from 'vue'
import { loadFromStorage, saveToStorage } from './useGameStorage'

export interface NotepadEntry {
  id: string
  points: number
}

export interface NotepadPlayer {
  id: string
  name: string
  entries: NotepadEntry[]
}

interface NotepadState {
  players: NotepadPlayer[]
}

const STORAGE_KEY = 'notepad-game'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useNotepad() {
  const players = ref<NotepadPlayer[]>([])

  const playerSummaries = computed(() =>
    players.value.map(player => ({
      ...player,
      total: player.entries.reduce((sum, entry) => sum + entry.points, 0)
    }))
  )

  function load() {
    const data = loadFromStorage<NotepadState>(STORAGE_KEY)
    if (!data) return

    players.value = Array.isArray(data.players)
      ? data.players
          .filter(player => player && typeof player.name === 'string')
          .map(player => ({
            id: typeof player.id === 'string' && player.id.length > 0 ? player.id : createId(),
            name: player.name.trim(),
            entries: Array.isArray(player.entries)
              ? player.entries
                  .filter(entry => entry && Number.isFinite(entry.points))
                  .map(entry => ({
                    id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : createId(),
                    points: Number(entry.points)
                  }))
              : []
          }))
          .filter(player => player.name.length > 0)
      : []
  }

  function save() {
    saveToStorage<NotepadState>(STORAGE_KEY, { players: players.value })
  }

  function addPlayer(name: string) {
    const trimmedName = name.trim()
    if (!trimmedName) return

    players.value.push({
      id: createId(),
      name: trimmedName,
      entries: []
    })
    save()
  }

  function removePlayer(playerId: string) {
    players.value = players.value.filter(player => player.id !== playerId)
    save()
  }

  function addEntry(playerId: string, points: number) {
    if (!Number.isFinite(points)) return

    const player = players.value.find(candidate => candidate.id === playerId)
    if (!player) return

    player.entries.push({
      id: createId(),
      points: Number(points)
    })
    save()
  }

  function updateEntry(playerId: string, entryId: string, points: number) {
    if (!Number.isFinite(points)) return

    const player = players.value.find(candidate => candidate.id === playerId)
    const entry = player?.entries.find(candidate => candidate.id === entryId)
    if (!entry) return

    entry.points = Number(points)
    save()
  }

  function removeEntry(playerId: string, entryId: string) {
    const player = players.value.find(candidate => candidate.id === playerId)
    if (!player) return

    player.entries = player.entries.filter(entry => entry.id !== entryId)
    save()
  }

  function reset() {
    players.value = []
    save()
  }

  return {
    players,
    playerSummaries,
    load,
    addPlayer,
    removePlayer,
    addEntry,
    updateEntry,
    removeEntry,
    reset
  }
}
