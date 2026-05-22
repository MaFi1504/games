import { ref, computed } from 'vue'
import { loadFromStorage, saveToStorage } from './useGameStorage'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameStatus = 'idle' | 'playing' | 'won' | 'over'

export type Cell = {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
}

export type DifficultyConfig = {
  rows: number
  cols: number
  mines: number
}

type StoredState = {
  board: Cell[][]
  status: GameStatus
  difficulty: Difficulty
  elapsedSeconds: number
  firstClick: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
}

const STORAGE_KEY = 'minesweeper-game'

// ---------------------------------------------------------------------------
// Pure helpers – exported for unit testing
// ---------------------------------------------------------------------------

export function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0
    }))
  )
}

export function placeMines(board: Cell[][], mines: number, safeRow: number, safeCol: number): Cell[][] {
  const rows = board.length
  const cols = board[0]!.length
  const result = board.map(row => row.map(cell => ({ ...cell })))

  // Collect all positions excluding the safe cell and its neighbours
  const candidates: [number, number][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue
      candidates.push([r, c])
    }
  }

  // Fisher-Yates partial shuffle to pick mine positions
  for (let i = 0; i < mines && i < candidates.length; i++) {
    const j = i + Math.floor(Math.random() * (candidates.length - i))
    ;[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!]
    const [mr, mc] = candidates[i]!
    result[mr]![mc]!.isMine = true
  }

  return computeAdjacency(result)
}

export function computeAdjacency(board: Cell[][]): Cell[][] {
  const rows = board.length
  const cols = board[0]!.length
  return board.map((row, r) =>
    row.map((cell, c) => {
      if (cell.isMine) return { ...cell, adjacentMines: 0 }
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr]![nc]!.isMine) {
            count++
          }
        }
      }
      return { ...cell, adjacentMines: count }
    })
  )
}

/**
 * BFS flood-fill: reveal cell at (row, col) and all connected empty cells.
 * Returns a new board with updated cells.
 */
export function floodReveal(board: Cell[][], startRow: number, startCol: number): Cell[][] {
  const rows = board.length
  const cols = board[0]!.length
  const result = board.map(row => row.map(cell => ({ ...cell })))

  const queue: [number, number][] = [[startRow, startCol]]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)

    const cell = result[r]![c]!
    if (cell.isFlagged || cell.isRevealed) continue

    cell.isRevealed = true

    // Only expand further if this cell has no adjacent mines
    if (cell.adjacentMines === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            queue.push([nr, nc])
          }
        }
      }
    }
  }

  return result
}

/**
 * Count how many flags are placed adjacent to (row, col).
 */
export function countAdjacentFlags(board: Cell[][], row: number, col: number): number {
  const rows = board.length
  const cols = board[0]!.length
  let count = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr]![nc]!.isFlagged) {
        count++
      }
    }
  }
  return count
}

/**
 * Check if the board is in a winning state:
 * every non-mine cell is revealed.
 */
export function checkWin(board: Cell[][]): boolean {
  return board.every(row =>
    row.every(cell => cell.isMine || cell.isRevealed)
  )
}

/**
 * Reveal all mines (called on game over).
 */
export function revealAllMines(board: Cell[][]): Cell[][] {
  return board.map(row =>
    row.map(cell => (cell.isMine ? { ...cell, isRevealed: true } : { ...cell }))
  )
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMinesweeper() {
  const board = ref<Cell[][]>([])
  const status = ref<GameStatus>('idle')
  const difficulty = ref<Difficulty>('easy')
  const elapsedSeconds = ref(0)
  const firstClick = ref(true)

  let timerHandle: ReturnType<typeof setInterval> | null = null

  // ── derived ──────────────────────────────────────────────────────────────

  const config = computed(() => DIFFICULTY_CONFIG[difficulty.value])

  const mineCount = computed(() => config.value.mines)

  const flagCount = computed(() =>
    board.value.reduce((sum, row) =>
      sum + row.reduce((s, cell) => s + (cell.isFlagged ? 1 : 0), 0), 0)
  )

  const remainingMines = computed(() => mineCount.value - flagCount.value)

  // ── persistence ───────────────────────────────────────────────────────────

  function save(): void {
    const state: StoredState = {
      board: board.value,
      status: status.value,
      difficulty: difficulty.value,
      elapsedSeconds: elapsedSeconds.value,
      firstClick: firstClick.value
    }
    saveToStorage(STORAGE_KEY, state)
  }

  function load(): void {
    const stored = loadFromStorage<StoredState>(STORAGE_KEY)
    if (!stored) return
    board.value = stored.board
    status.value = stored.status
    difficulty.value = stored.difficulty
    elapsedSeconds.value = stored.elapsedSeconds
    firstClick.value = stored.firstClick
    if (stored.status === 'playing') {
      startTimer()
    }
  }

  // ── timer ─────────────────────────────────────────────────────────────────

  function startTimer(): void {
    stopTimer()
    timerHandle = setInterval(() => {
      elapsedSeconds.value++
      save()
    }, 1000)
  }

  function stopTimer(): void {
    if (timerHandle !== null) {
      clearInterval(timerHandle)
      timerHandle = null
    }
  }

  // ── actions ───────────────────────────────────────────────────────────────

  function newGame(diff: Difficulty): void {
    stopTimer()
    difficulty.value = diff
    const { rows, cols } = DIFFICULTY_CONFIG[diff]
    board.value = createEmptyBoard(rows, cols)
    status.value = 'idle'
    elapsedSeconds.value = 0
    firstClick.value = true
    save()
  }

  function reveal(row: number, col: number): void {
    if (status.value === 'won' || status.value === 'over') return
    const cell = board.value[row]?.[col]
    if (!cell || cell.isRevealed || cell.isFlagged) return

    // First click: place mines now so this cell is always safe
    if (firstClick.value) {
      firstClick.value = false
      const { mines } = config.value
      board.value = placeMines(board.value, mines, row, col)
      status.value = 'playing'
      startTimer()
    }

    const updatedCell = board.value[row]![col]!

    if (updatedCell.isMine) {
      board.value = revealAllMines(board.value)
      status.value = 'over'
      stopTimer()
      save()
      return
    }

    board.value = floodReveal(board.value, row, col)

    if (checkWin(board.value)) {
      status.value = 'won'
      stopTimer()
    }

    save()
  }

  function toggleFlag(row: number, col: number): void {
    if (status.value === 'won' || status.value === 'over') return
    const cell = board.value[row]?.[col]
    if (!cell || cell.isRevealed) return

    board.value = board.value.map((r, ri) =>
      r.map((c, ci) => {
        if (ri === row && ci === col) return { ...c, isFlagged: !c.isFlagged }
        return c
      })
    )
    save()
  }

  /**
   * Chord: if a revealed numbered cell has exactly as many adjacent flags
   * as its adjacentMines value, reveal all unflagged neighbours.
   */
  function chord(row: number, col: number): void {
    if (status.value !== 'playing') return
    const cell = board.value[row]?.[col]
    if (!cell || !cell.isRevealed || cell.adjacentMines === 0) return
    if (countAdjacentFlags(board.value, row, col) !== cell.adjacentMines) return

    const rows = board.value.length
    const cols = board.value[0]!.length
    let hitMine = false

    let current = board.value.map(r => r.map(c => ({ ...c })))
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        const neighbour = current[nr]![nc]!
        if (neighbour.isRevealed || neighbour.isFlagged) continue
        if (neighbour.isMine) {
          hitMine = true
        } else {
          current = floodReveal(current, nr, nc)
        }
      }
    }

    if (hitMine) {
      board.value = revealAllMines(current)
      status.value = 'over'
      stopTimer()
    } else {
      board.value = current
      if (checkWin(board.value)) {
        status.value = 'won'
        stopTimer()
      }
    }

    save()
  }

  function resetToIdle(): void {
    stopTimer()
    board.value = []
    status.value = 'idle'
    elapsedSeconds.value = 0
    firstClick.value = true
    save()
  }

  return {
    board,
    status,
    difficulty,
    elapsedSeconds,
    config,
    mineCount,
    flagCount,
    remainingMines,
    newGame,
    resetToIdle,
    reveal,
    toggleFlag,
    chord,
    load,
    save
  }
}
