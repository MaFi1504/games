import { ref } from 'vue'
import { loadFromStorage, saveToStorage } from './useGameStorage'

export interface Phase10HistoryEntry {
  date: string
  phaseSetKey: string
  phasesCompleted: number
  totalPhases: number
  totalScore: number
}

export interface KniffelHistoryEntry {
  date: string
  variant: string
  totalScore: number
  categoriesScored: number
  totalCategories: number
}

export interface SudokuHistoryEntry {
  date: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeSeconds: number
  solved: boolean
}

const PHASE10_HISTORY_KEY = 'phase10-history'
const KNIFFEL_HISTORY_KEY = 'kniffel-history'
const SUDOKU_HISTORY_KEY = 'sudoku-history'
const MAX_HISTORY = 200

// Module-level reactive singletons so updates propagate across components
const phase10History = ref<Phase10HistoryEntry[]>([])
const kniffelHistory = ref<KniffelHistoryEntry[]>([])
const sudokuHistory = ref<SudokuHistoryEntry[]>([])

export function useGameHistory() {
  function init() {
    if (!import.meta.client) return
    phase10History.value = loadFromStorage<Phase10HistoryEntry[]>(PHASE10_HISTORY_KEY) ?? []
    kniffelHistory.value = loadFromStorage<KniffelHistoryEntry[]>(KNIFFEL_HISTORY_KEY) ?? []
    sudokuHistory.value = loadFromStorage<SudokuHistoryEntry[]>(SUDOKU_HISTORY_KEY) ?? []
  }

  function savePhase10Game(entry: Omit<Phase10HistoryEntry, 'date'>) {
    if (!import.meta.client) return
    const history = [...phase10History.value]
    history.unshift({ ...entry, date: new Date().toISOString() })
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY)
    saveToStorage(PHASE10_HISTORY_KEY, history)
    phase10History.value = history
  }

  function saveKniffelGame(entry: Omit<KniffelHistoryEntry, 'date'>) {
    if (!import.meta.client) return
    const history = [...kniffelHistory.value]
    history.unshift({ ...entry, date: new Date().toISOString() })
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY)
    saveToStorage(KNIFFEL_HISTORY_KEY, history)
    kniffelHistory.value = history
  }

  function clearPhase10History() {
    if (!import.meta.client) return
    saveToStorage(PHASE10_HISTORY_KEY, [])
    phase10History.value = []
  }

  function clearKniffelHistory() {
    if (!import.meta.client) return
    saveToStorage(KNIFFEL_HISTORY_KEY, [])
    kniffelHistory.value = []
  }

  function saveSudokuGame(entry: Omit<SudokuHistoryEntry, 'date'>) {
    if (!import.meta.client) return
    const history = [...sudokuHistory.value]
    history.unshift({ ...entry, date: new Date().toISOString() })
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY)
    saveToStorage(SUDOKU_HISTORY_KEY, history)
    sudokuHistory.value = history
  }

  function clearSudokuHistory() {
    if (!import.meta.client) return
    saveToStorage(SUDOKU_HISTORY_KEY, [])
    sudokuHistory.value = []
  }

  return {
    phase10History,
    kniffelHistory,
    sudokuHistory,
    init,
    savePhase10Game,
    saveKniffelGame,
    saveSudokuGame,
    clearPhase10History,
    clearKniffelHistory,
    clearSudokuHistory
  }
}
