import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useGameHistory } from '../../app/composables/useGameHistory'

// Stub localStorage for server-side-like environment.
// Note: import.meta.client is false in Node, so savePhase10Game / saveKniffelGame
// and clearPhase10History / clearKniffelHistory are no-ops in these tests.
// We test the load-path by seeding localStorage before calling init().
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { Reflect.deleteProperty(store, key) },
    clear: () => { store = {} },
    seed: (key: string, value: unknown) => { store[key] = JSON.stringify(value) }
  }
})()
vi.stubGlobal('localStorage', localStorageMock)

describe('useGameHistory', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Reset module-level singleton refs to prevent test pollution
    const { phase10History, kniffelHistory, sudokuHistory } = useGameHistory()
    phase10History.value = []
    kniffelHistory.value = []
    sudokuHistory.value = []
  })

  describe('initial state', () => {
    it('phase10History starts empty', () => {
      const { phase10History } = useGameHistory()
      expect(phase10History.value).toEqual([])
    })

    it('kniffelHistory starts empty', () => {
      const { kniffelHistory } = useGameHistory()
      expect(kniffelHistory.value).toEqual([])
    })

    it('sudokuHistory starts empty', () => {
      const { sudokuHistory } = useGameHistory()
      expect(sudokuHistory.value).toEqual([])
    })
  })

  describe('return shape', () => {
    it('exposes all expected methods', () => {
      const history = useGameHistory()
      expect(typeof history.init).toBe('function')
      expect(typeof history.savePhase10Game).toBe('function')
      expect(typeof history.saveKniffelGame).toBe('function')
      expect(typeof history.saveSudokuGame).toBe('function')
      expect(typeof history.clearPhase10History).toBe('function')
      expect(typeof history.clearKniffelHistory).toBe('function')
      expect(typeof history.clearSudokuHistory).toBe('function')
    })
  })

  describe('singleton ref sharing', () => {
    it('two calls to useGameHistory() share the same phase10History ref', () => {
      const a = useGameHistory()
      const b = useGameHistory()
      a.phase10History.value = [{
        date: '2024-01-01T00:00:00.000Z',
        phaseSetKey: 'classic',
        phasesCompleted: 10,
        totalPhases: 10,
        totalScore: 200
      }]
      expect(b.phase10History.value).toHaveLength(1)
    })

    it('two calls to useGameHistory() share the same kniffelHistory ref', () => {
      const a = useGameHistory()
      const b = useGameHistory()
      a.kniffelHistory.value = [{
        date: '2024-01-01T00:00:00.000Z',
        variant: 'standard',
        totalScore: 300,
        categoriesScored: 13,
        totalCategories: 13
      }]
      expect(b.kniffelHistory.value).toHaveLength(1)
    })

    it('two calls to useGameHistory() share the same sudokuHistory ref', () => {
      const a = useGameHistory()
      const b = useGameHistory()
      a.sudokuHistory.value = [{
        date: '2024-01-01T00:00:00.000Z',
        difficulty: 'medium',
        timeSeconds: 245,
        solved: true
      }]
      expect(b.sudokuHistory.value).toHaveLength(1)
    })
  })

  describe('savePhase10Game', () => {
    it('is a no-op when import.meta.client is false (server-side)', () => {
      // import.meta.client is always false in Node test env
      const { phase10History, savePhase10Game } = useGameHistory()
      savePhase10Game({ phaseSetKey: 'classic', phasesCompleted: 10, totalPhases: 10, totalScore: 250 })
      expect(phase10History.value).toEqual([])
    })
  })

  describe('saveKniffelGame', () => {
    it('is a no-op when import.meta.client is false (server-side)', () => {
      const { kniffelHistory, saveKniffelGame } = useGameHistory()
      saveKniffelGame({ variant: 'standard', totalScore: 300, categoriesScored: 13, totalCategories: 13 })
      expect(kniffelHistory.value).toEqual([])
    })
  })

  describe('clearPhase10History', () => {
    it('is a no-op when import.meta.client is false (server-side)', () => {
      const { phase10History, clearPhase10History } = useGameHistory()
      phase10History.value = [{
        date: '2024-01-01T00:00:00.000Z',
        phaseSetKey: 'classic',
        phasesCompleted: 10,
        totalPhases: 10,
        totalScore: 200
      }]
      clearPhase10History()
      // No-op in Node env: value remains unchanged
      expect(phase10History.value).toHaveLength(1)
    })
  })

  describe('clearKniffelHistory', () => {
    it('is a no-op when import.meta.client is false (server-side)', () => {
      const { kniffelHistory, clearKniffelHistory } = useGameHistory()
      kniffelHistory.value = [{
        date: '2024-01-01T00:00:00.000Z',
        variant: 'standard',
        totalScore: 300,
        categoriesScored: 13,
        totalCategories: 13
      }]
      clearKniffelHistory()
      expect(kniffelHistory.value).toHaveLength(1)
    })
  })

  describe('saveSudokuGame', () => {
    it('is a no-op when import.meta.client is false (server-side)', () => {
      const { sudokuHistory, saveSudokuGame } = useGameHistory()
      saveSudokuGame({ difficulty: 'easy', timeSeconds: 180, solved: true })
      expect(sudokuHistory.value).toEqual([])
    })
  })

  describe('clearSudokuHistory', () => {
    it('is a no-op when import.meta.client is false (server-side)', () => {
      const { sudokuHistory, clearSudokuHistory } = useGameHistory()
      sudokuHistory.value = [{
        date: '2024-01-01T00:00:00.000Z',
        difficulty: 'hard',
        timeSeconds: 600,
        solved: false
      }]
      clearSudokuHistory()
      expect(sudokuHistory.value).toHaveLength(1)
    })
  })

  describe('init()', () => {
    it('is a no-op in Node env even with seeded localStorage', () => {
      localStorageMock.seed('phase10-history', [{
        date: '2024-06-01T00:00:00.000Z',
        phaseSetKey: 'classic',
        phasesCompleted: 8,
        totalPhases: 10,
        totalScore: 120
      }])
      const { phase10History, init } = useGameHistory()
      init()
      // import.meta.client is false in Node → init is a no-op
      expect(phase10History.value).toHaveLength(0)
    })

    it('is a no-op in Node env for kniffel history', () => {
      localStorageMock.seed('kniffel-history', [{
        date: '2024-06-01T00:00:00.000Z',
        variant: 'extrem',
        totalScore: 415,
        categoriesScored: 16,
        totalCategories: 16
      }])
      const { kniffelHistory, init } = useGameHistory()
      init()
      expect(kniffelHistory.value).toHaveLength(0)
    })

    it('is a no-op in Node env for sudoku history', () => {
      localStorageMock.seed('sudoku-history', [{
        date: '2024-06-01T00:00:00.000Z',
        difficulty: 'medium',
        timeSeconds: 300,
        solved: true
      }])
      const { sudokuHistory, init } = useGameHistory()
      init()
      expect(sudokuHistory.value).toHaveLength(0)
    })
  })
})
