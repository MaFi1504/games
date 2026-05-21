import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useNotepad } from '../../app/composables/useNotepad'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { Reflect.deleteProperty(store, key) },
    clear: () => { store = {} }
  }
})()
vi.stubGlobal('localStorage', localStorageMock)

describe('useNotepad', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('initial state', () => {
    it('starts with no players', () => {
      const { players } = useNotepad()
      expect(players.value).toEqual([])
    })

    it('playerSummaries is empty initially', () => {
      const { playerSummaries } = useNotepad()
      expect(playerSummaries.value).toEqual([])
    })
  })

  describe('addPlayer', () => {
    it('adds a player with trimmed name', () => {
      const { players, addPlayer } = useNotepad()
      addPlayer('  Alice  ')
      expect(players.value).toHaveLength(1)
      expect(players.value[0]!.name).toBe('Alice')
    })

    it('ignores empty or whitespace-only names', () => {
      const { players, addPlayer } = useNotepad()
      addPlayer('')
      addPlayer('   ')
      expect(players.value).toHaveLength(0)
    })

    it('assigns a unique id to each player', () => {
      const { players, addPlayer } = useNotepad()
      addPlayer('Alice')
      addPlayer('Bob')
      expect(players.value[0]!.id).not.toBe(players.value[1]!.id)
    })

    it('adds player with empty entries list', () => {
      const { players, addPlayer } = useNotepad()
      addPlayer('Alice')
      expect(players.value[0]!.entries).toEqual([])
    })
  })

  describe('removePlayer', () => {
    it('removes the player with the given id', () => {
      const { players, addPlayer, removePlayer } = useNotepad()
      addPlayer('Alice')
      addPlayer('Bob')
      const idToRemove = players.value[0]!.id
      removePlayer(idToRemove)
      expect(players.value).toHaveLength(1)
      expect(players.value[0]!.name).toBe('Bob')
    })

    it('does nothing if id does not exist', () => {
      const { players, addPlayer, removePlayer } = useNotepad()
      addPlayer('Alice')
      removePlayer('nonexistent')
      expect(players.value).toHaveLength(1)
    })
  })

  describe('addEntry', () => {
    it('adds an entry with the given points to the correct player', () => {
      const { players, addPlayer, addEntry } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, 15)
      expect(players.value[0]!.entries).toHaveLength(1)
      expect(players.value[0]!.entries[0]!.points).toBe(15)
    })

    it('does not add entry for non-finite points', () => {
      const { players, addPlayer, addEntry } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, NaN)
      addEntry(playerId, Infinity)
      expect(players.value[0]!.entries).toHaveLength(0)
    })

    it('does nothing for unknown player id', () => {
      const { players, addPlayer, addEntry } = useNotepad()
      addPlayer('Alice')
      addEntry('nonexistent', 10)
      expect(players.value[0]!.entries).toHaveLength(0)
    })
  })

  describe('updateEntry', () => {
    it('updates the points of an existing entry', () => {
      const { players, addPlayer, addEntry, updateEntry } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, 10)
      const entryId = players.value[0]!.entries[0]!.id
      updateEntry(playerId, entryId, 25)
      expect(players.value[0]!.entries[0]!.points).toBe(25)
    })

    it('does nothing for non-finite points', () => {
      const { players, addPlayer, addEntry, updateEntry } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, 10)
      const entryId = players.value[0]!.entries[0]!.id
      updateEntry(playerId, entryId, NaN)
      expect(players.value[0]!.entries[0]!.points).toBe(10)
    })

    it('does nothing if entry does not exist', () => {
      const { players, addPlayer, addEntry, updateEntry } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, 10)
      updateEntry(playerId, 'nonexistent', 99)
      expect(players.value[0]!.entries[0]!.points).toBe(10)
    })
  })

  describe('removeEntry', () => {
    it('removes the entry with the given id', () => {
      const { players, addPlayer, addEntry, removeEntry } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, 10)
      addEntry(playerId, 20)
      const entryId = players.value[0]!.entries[0]!.id
      removeEntry(playerId, entryId)
      expect(players.value[0]!.entries).toHaveLength(1)
      expect(players.value[0]!.entries[0]!.points).toBe(20)
    })

    it('does nothing if player does not exist', () => {
      const { players, addPlayer, addEntry, removeEntry } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, 10)
      removeEntry('nonexistent', players.value[0]!.entries[0]!.id)
      expect(players.value[0]!.entries).toHaveLength(1)
    })
  })

  describe('playerSummaries', () => {
    it('calculates total as sum of all entry points', () => {
      const { players, addPlayer, addEntry, playerSummaries } = useNotepad()
      addPlayer('Alice')
      const playerId = players.value[0]!.id
      addEntry(playerId, 10)
      addEntry(playerId, 15)
      addEntry(playerId, 5)
      expect(playerSummaries.value[0]!.total).toBe(30)
    })

    it('total is 0 for a player with no entries', () => {
      const { addPlayer, playerSummaries } = useNotepad()
      addPlayer('Alice')
      expect(playerSummaries.value[0]!.total).toBe(0)
    })
  })

  describe('reset', () => {
    it('clears all players', () => {
      const { players, addPlayer, reset } = useNotepad()
      addPlayer('Alice')
      addPlayer('Bob')
      reset()
      expect(players.value).toEqual([])
    })
  })
})
