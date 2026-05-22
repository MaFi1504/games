import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  createEmptyBoard,
  placeMines,
  computeAdjacency,
  floodReveal,
  countAdjacentFlags,
  checkWin,
  revealAllMines,
  useMinesweeper,
  type Cell
} from '../../app/composables/useMinesweeper'

// ── storage mock – bypass import.meta.client guard ─────────────────────────

const storageStore: Record<string, string> = {}

vi.mock('../../app/composables/useGameStorage', () => ({
  loadFromStorage: <T>(key: string): T | null => {
    const raw = storageStore[key]
    if (raw) return JSON.parse(raw) as T
    return null
  },
  saveToStorage: <T>(key: string, data: T): void => {
    storageStore[key] = JSON.stringify(data)
  }
}))

beforeEach(() => {
  for (const key of Object.keys(storageStore)) {
    Reflect.deleteProperty(storageStore, key)
  }
})

// ── helpers ────────────────────────────────────────────────────────────────

function mine(overrides: Partial<Cell> = {}): Cell {
  return { isMine: true, isRevealed: false, isFlagged: false, adjacentMines: 0, ...overrides }
}

function empty(overrides: Partial<Cell> = {}): Cell {
  return { isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0, ...overrides }
}

// ── createEmptyBoard ───────────────────────────────────────────────────────

describe('createEmptyBoard', () => {
  it('creates a board with correct dimensions', () => {
    const board = createEmptyBoard(9, 9)
    expect(board).toHaveLength(9)
    expect(board[0]).toHaveLength(9)
  })

  it('initialises all cells as empty and unrevealed', () => {
    const board = createEmptyBoard(3, 3)
    board.forEach(row =>
      row.forEach((cell) => {
        expect(cell.isMine).toBe(false)
        expect(cell.isRevealed).toBe(false)
        expect(cell.isFlagged).toBe(false)
        expect(cell.adjacentMines).toBe(0)
      })
    )
  })
})

// ── placeMines ─────────────────────────────────────────────────────────────

describe('placeMines', () => {
  it('places the correct number of mines', () => {
    const board = createEmptyBoard(9, 9)
    const result = placeMines(board, 10, 4, 4)
    const count = result.flat().filter(c => c.isMine).length
    expect(count).toBe(10)
  })

  it('does not place a mine on the safe cell', () => {
    for (let i = 0; i < 20; i++) {
      const board = createEmptyBoard(9, 9)
      const result = placeMines(board, 10, 0, 0)
      expect(result[0]![0]!.isMine).toBe(false)
    }
  })

  it('does not place mines in the 3×3 safe zone around first click', () => {
    for (let i = 0; i < 10; i++) {
      const board = createEmptyBoard(9, 9)
      const result = placeMines(board, 10, 4, 4)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          expect(result[4 + dr]![4 + dc]!.isMine).toBe(false)
        }
      }
    }
  })
})

// ── computeAdjacency ──────────────────────────────────────────────────────

describe('computeAdjacency', () => {
  it('counts adjacent mines correctly', () => {
    // 3×3 board with mines in corners
    const board: Cell[][] = [
      [mine(), empty(), mine()],
      [empty(), empty(), empty()],
      [mine(), empty(), mine()]
    ]
    const result = computeAdjacency(board)
    expect(result[1]![1]!.adjacentMines).toBe(4)
    expect(result[0]![1]!.adjacentMines).toBe(2)
    expect(result[1]![0]!.adjacentMines).toBe(2)
  })

  it('sets adjacentMines to 0 for mine cells', () => {
    const board: Cell[][] = [[mine(), mine()], [empty(), empty()]]
    const result = computeAdjacency(board)
    expect(result[0]![0]!.adjacentMines).toBe(0)
    expect(result[0]![1]!.adjacentMines).toBe(0)
  })

  it('handles board with no mines', () => {
    const board = createEmptyBoard(3, 3)
    const result = computeAdjacency(board)
    result.flat().forEach(cell => expect(cell.adjacentMines).toBe(0))
  })
})

// ── floodReveal ────────────────────────────────────────────────────────────

describe('floodReveal', () => {
  it('reveals a single numbered cell without expanding', () => {
    // centre cell has 1 adjacent mine (top-left)
    const board: Cell[][] = [
      [mine(), empty(), empty()],
      [empty(), empty({ adjacentMines: 1 }), empty()],
      [empty(), empty(), empty()]
    ]
    const result = floodReveal(board, 1, 1)
    expect(result[1]![1]!.isRevealed).toBe(true)
    // neighbours should NOT be auto-revealed because adjacentMines > 0
    expect(result[0]![1]!.isRevealed).toBe(false)
  })

  it('flood-fills from an empty cell', () => {
    // 3×3 all-empty board; reveal top-left → entire board revealed
    const board = computeAdjacency(createEmptyBoard(3, 3))
    const result = floodReveal(board, 0, 0)
    result.flat().forEach(cell => expect(cell.isRevealed).toBe(true))
  })

  it('does not reveal flagged cells', () => {
    const board = computeAdjacency(createEmptyBoard(3, 3))
    board[0]![1]!.isFlagged = true
    const result = floodReveal(board, 0, 0)
    expect(result[0]![1]!.isRevealed).toBe(false)
  })
})

// ── countAdjacentFlags ────────────────────────────────────────────────────

describe('countAdjacentFlags', () => {
  it('counts flags around a cell', () => {
    // Single flag at (0,0): adjacent to (0,1) and (1,1) but not (0,2)
    const board: Cell[][] = [
      [empty({ isFlagged: true }), empty(), empty()],
      [empty(), empty(), empty()],
      [empty(), empty(), empty()]
    ]
    expect(countAdjacentFlags(board, 0, 1)).toBe(1) // only (0,0)
    expect(countAdjacentFlags(board, 1, 1)).toBe(1) // only (0,0)
    expect(countAdjacentFlags(board, 0, 2)).toBe(0) // (0,0) not adjacent

    // Two flags at (0,0) and (2,2): both adjacent to centre (1,1)
    const board2: Cell[][] = [
      [empty({ isFlagged: true }), empty(), empty()],
      [empty(), empty(), empty()],
      [empty(), empty(), empty({ isFlagged: true })]
    ]
    expect(countAdjacentFlags(board2, 1, 1)).toBe(2)
  })

  it('returns 0 when no adjacent flags', () => {
    const board = createEmptyBoard(3, 3)
    expect(countAdjacentFlags(board, 1, 1)).toBe(0)
  })
})

// ── checkWin ──────────────────────────────────────────────────────────────

describe('checkWin', () => {
  it('returns true when all non-mine cells are revealed', () => {
    const board: Cell[][] = [
      [mine(), empty({ isRevealed: true })],
      [empty({ isRevealed: true }), empty({ isRevealed: true })]
    ]
    expect(checkWin(board)).toBe(true)
  })

  it('returns false when some non-mine cells are not revealed', () => {
    const board: Cell[][] = [
      [mine(), empty({ isRevealed: true })],
      [empty({ isRevealed: false }), empty({ isRevealed: true })]
    ]
    expect(checkWin(board)).toBe(false)
  })
})

// ── revealAllMines ────────────────────────────────────────────────────────

describe('revealAllMines', () => {
  it('reveals all mine cells and leaves others unchanged', () => {
    const board: Cell[][] = [
      [mine(), empty()],
      [empty(), mine()]
    ]
    const result = revealAllMines(board)
    expect(result[0]![0]!.isRevealed).toBe(true)
    expect(result[1]![1]!.isRevealed).toBe(true)
    expect(result[0]![1]!.isRevealed).toBe(false)
    expect(result[1]![0]!.isRevealed).toBe(false)
  })
})

// ── useMinesweeper composable ─────────────────────────────────────────────

describe('useMinesweeper', () => {
  it('starts in idle state with empty board', () => {
    const { board, status } = useMinesweeper()
    expect(status.value).toBe('idle')
    expect(board.value).toHaveLength(0)
  })

  it('newGame sets up the board with correct dimensions', () => {
    const { board, status, newGame } = useMinesweeper()
    newGame('easy')
    expect(board.value).toHaveLength(9)
    expect(board.value[0]).toHaveLength(9)
    expect(status.value).toBe('idle')
  })

  it('reveal triggers first-click mine placement and starts timer', () => {
    const { board, status, newGame, reveal } = useMinesweeper()
    newGame('easy')
    reveal(4, 4)
    expect(status.value).toBe('playing')
    // The revealed cell must not be a mine
    expect(board.value[4]![4]!.isMine).toBe(false)
    expect(board.value[4]![4]!.isRevealed).toBe(true)
  })

  it('remainingMines decreases when a flag is placed', () => {
    const { newGame, reveal, toggleFlag, remainingMines } = useMinesweeper()
    newGame('easy')
    reveal(4, 4)
    const before = remainingMines.value
    toggleFlag(0, 0)
    expect(remainingMines.value).toBe(before - 1)
    toggleFlag(0, 0)
    expect(remainingMines.value).toBe(before)
  })

  it('cannot flag a revealed cell', () => {
    const { board, newGame, reveal, toggleFlag } = useMinesweeper()
    newGame('easy')
    reveal(4, 4)
    // Find a revealed cell and try to flag it
    const revealedCell = board.value[4]![4]!
    toggleFlag(4, 4)
    expect(revealedCell.isFlagged).toBe(false)
  })

  it('resetToIdle clears the board', () => {
    const { board, status, newGame, reveal, resetToIdle } = useMinesweeper()
    newGame('easy')
    reveal(4, 4)
    resetToIdle()
    expect(board.value).toHaveLength(0)
    expect(status.value).toBe('idle')
  })

  it('persists and restores state via localStorage', () => {
    const game1 = useMinesweeper()
    game1.newGame('medium')
    game1.reveal(8, 8)
    game1.save()

    const game2 = useMinesweeper()
    game2.load()
    expect(game2.difficulty.value).toBe('medium')
    expect(game2.board.value).toHaveLength(16)
  })
})
