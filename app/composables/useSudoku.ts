/**
 * Sudoku generator using a two-phase approach:
 *
 * Phase 1 – Build a complete valid solution
 *   1. Fill the three diagonal 3×3 boxes independently (they don't conflict with
 *      each other), using a shuffled set of 1–9.
 *   2. Use recursive backtracking to fill the remaining 54 cells.
 *
 * Phase 2 – Carve out clues to produce the puzzle
 *   Visit cells in random order. Remove a digit and verify the puzzle still has
 *   exactly one solution (by running the solver and counting). If not, restore it.
 *   Stop when the remaining clue count reaches the target.
 */

import { ref, computed, nextTick, readonly } from 'vue'

export type Grid = (number | null)[][]
export type Difficulty = 'easy' | 'medium' | 'hard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(null))
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row])
}

/** Fisher-Yates shuffle – mutates and returns the array */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i]!, arr[j]!] = [arr[j]!, arr[i]!]
  }
  return arr
}

function digits(): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9]
}

/** Returns true if placing `n` at (row, col) violates a constraint */
function conflicts(grid: Grid, row: number, col: number, n: number): boolean {
  // Row
  if (grid[row]!.includes(n)) return true
  // Column
  for (let r = 0; r < 9; r++) {
    if (grid[r]![col] === n) return true
  }
  // 3×3 box
  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r]![c] === n) return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Phase 1 – Fill a complete valid solution
// ---------------------------------------------------------------------------

/** Fill one of the three diagonal boxes (box 0, 4, 8) with a shuffled 1–9 */
function fillDiagonalBox(grid: Grid, boxRow: number, boxCol: number): void {
  const nums = shuffle(digits())
  let idx = 0
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      grid[r]![c] = nums[idx++]!
    }
  }
}

/**
 * Recursive backtracking solver.
 * Returns true when a solution is found and the grid is filled in-place.
 * If `limit` is 2, the search stops as soon as a second solution is found
 * (used for uniqueness checking).
 */
function solve(grid: Grid, limit = 1, count = { value: 0 }): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] !== null) continue

      const candidates = shuffle(digits()) // random order for generation; deterministic for counting
      for (const n of candidates) {
        if (!conflicts(grid, r, c, n)) {
          grid[r]![c] = n
          if (solve(grid, limit, count)) {
            if (limit === 1) return true
          }
          if (count.value >= limit) return true
          grid[r]![c] = null
        }
      }
      return false // no candidate worked → backtrack
    }
  }
  // All cells filled → solution found
  count.value++
  return limit === 1
}

/** Count solutions up to `limit` without modifying the original grid */
function countSolutions(grid: Grid, limit = 2): number {
  const copy = cloneGrid(grid)
  const count = { value: 0 }
  solveCount(copy, limit, count)
  return count.value
}

function solveCount(grid: Grid, limit: number, count: { value: number }): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] !== null) continue

      // Use a fixed order here (not shuffled) for deterministic counting
      for (const n of digits()) {
        if (!conflicts(grid, r, c, n)) {
          grid[r]![c] = n
          solveCount(grid, limit, count)
          if (count.value >= limit) return
          grid[r]![c] = null
        }
      }
      return // backtrack
    }
  }
  count.value++
}

// ---------------------------------------------------------------------------
// Animated generation helpers
// ---------------------------------------------------------------------------

export type GenerationPhase = 'diagonal' | 'solving' | 'carving' | ''

/** How many ms to pause between visualised steps */
const STEP_DELAY = 25
/** Yield to the UI every N backtracking placements/removals */
const SOLVE_STEP_INTERVAL = 6

/**
 * Async backtracking solver that periodically yields to the UI so the grid
 * can be rerendered between steps. Only used when visualise mode is on.
 */
async function solveAnimated(
  grid: Grid,
  counter: { steps: number },
  onStep: (g: Grid) => Promise<void>
): Promise<boolean> {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] !== null) continue

      const candidates = shuffle(digits())
      for (const n of candidates) {
        if (!conflicts(grid, r, c, n)) {
          grid[r]![c] = n
          counter.steps++
          if (counter.steps % SOLVE_STEP_INTERVAL === 0) await onStep(grid)
          if (await solveAnimated(grid, counter, onStep)) return true
          grid[r]![c] = null
          counter.steps++
          if (counter.steps % SOLVE_STEP_INTERVAL === 0) await onStep(grid)
        }
      }
      return false
    }
  }
  return true
}

function generateSolution(): Grid {
  const grid = emptyGrid()
  // Fill the three independent diagonal boxes first
  fillDiagonalBox(grid, 0, 0)
  fillDiagonalBox(grid, 3, 3)
  fillDiagonalBox(grid, 6, 6)
  // Fill the rest via backtracking (shuffled candidates = random solution)
  solve(grid, 1)
  return grid
}

// ---------------------------------------------------------------------------
// Phase 2 – Carve out clues
// ---------------------------------------------------------------------------

const CLUE_COUNTS: Record<Difficulty, number> = {
  easy: 36,
  medium: 30,
  hard: 25
}

function carveClues(solution: Grid, targetClues: number): Grid {
  const grid = cloneGrid(solution)
  const cells: [number, number][] = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) cells.push([r, c])
  }
  shuffle(cells)

  let filled = 81
  for (const [r, c] of cells) {
    if (filled <= targetClues) break
    const saved = grid[r]![c]!
    grid[r]![c] = null
    if (countSolutions(grid, 2) !== 1) {
      grid[r]![c] = saved // restore – removing this cell breaks uniqueness
    } else {
      filled--
    }
  }
  return grid
}

// ---------------------------------------------------------------------------
// Public composable
// ---------------------------------------------------------------------------

export function useSudoku() {
  const solution = ref<Grid>(emptyGrid())
  const puzzle = ref<Grid>(emptyGrid())
  const playerGrid = ref<Grid>(emptyGrid())
  const difficulty = ref<Difficulty>('easy')
  const isGenerating = ref(false)

  /** Whether to animate the generation process step-by-step */
  const visualize = ref(false)
  /** Grid shown during animated generation; mirrors the solver's working state */
  const visualGrid = ref<Grid>(emptyGrid())
  /** Which phase of animated generation is currently running */
  const generationPhase = ref<GenerationPhase>('')
  /** Whether to hide feedback (correct/wrong) for player entries */
  const noFeedback = ref(false)

  /** Run the full animated generation and update refs step-by-step */
  async function generateAnimated(diff: Difficulty): Promise<void> {
    const delay = (): Promise<void> => new Promise(resolve => setTimeout(resolve, STEP_DELAY))
    const onStep = async (g: Grid): Promise<void> => {
      visualGrid.value = cloneGrid(g)
      await delay()
    }

    // Phase 1a – fill the three independent diagonal 3×3 boxes
    generationPhase.value = 'diagonal'
    const grid = emptyGrid()
    for (const [br, bc] of [[0, 0], [3, 3], [6, 6]] as [number, number][]) {
      const nums = shuffle(digits())
      let idx = 0
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) {
          grid[r]![c] = nums[idx++]!
          await onStep(grid)
        }
      }
    }

    // Phase 1b – fill the remaining cells via backtracking
    generationPhase.value = 'solving'
    const counter = { steps: 0 }
    await solveAnimated(grid, counter, onStep)
    solution.value = cloneGrid(grid)

    // Phase 2 – carve out clues
    generationPhase.value = 'carving'
    const cells: [number, number][] = []
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) cells.push([r, c])
    }
    shuffle(cells)

    const puzzleGrid = cloneGrid(grid)
    let filled = 81
    for (const [r, c] of cells) {
      if (filled <= CLUE_COUNTS[diff]) break
      const saved = puzzleGrid[r]![c]!
      puzzleGrid[r]![c] = null
      await onStep(puzzleGrid)
      if (countSolutions(puzzleGrid, 2) !== 1) {
        puzzleGrid[r]![c] = saved
      } else {
        filled--
      }
    }

    puzzle.value = cloneGrid(puzzleGrid)
    playerGrid.value = cloneGrid(puzzleGrid)
    generationPhase.value = ''
  }

  /** Generate a new puzzle at the current difficulty */
  async function generate(diff: Difficulty = difficulty.value): Promise<void> {
    isGenerating.value = true
    difficulty.value = diff

    await nextTick()
    if (visualize.value) {
      await generateAnimated(diff)
    } else {
      solution.value = generateSolution()
      puzzle.value = carveClues(solution.value, CLUE_COUNTS[diff])
      playerGrid.value = cloneGrid(puzzle.value)
    }
    isGenerating.value = false
  }

  /** Set a player digit at (row, col). Clue cells are locked. */
  function setCell(row: number, col: number, value: number | null) {
    if (puzzle.value[row]![col] !== null) return // locked clue cell
    playerGrid.value[row]![col] = value
  }

  /** True if the player's grid matches the solution (and a puzzle has been generated) */
  const isSolved = computed(() => {
    const hasPuzzle = solution.value.some(row => row.some(cell => cell !== null))
    if (!hasPuzzle) return false
    return playerGrid.value.every((row, r) =>
      row.every((cell, c) => cell === solution.value[r]![c])
    )
  })

  /** For each cell: 'clue' | 'correct' | 'wrong' | 'empty' */
  const cellStates = computed(() =>
    playerGrid.value.map((row, r) =>
      row.map((cell, c) => {
        if (puzzle.value[r]![c] !== null) return 'clue'
        if (cell === null) return 'empty'
        // When noFeedback is enabled, always return 'empty' for non-clue cells
        if (noFeedback.value) return 'empty'
        return cell === solution.value[r]![c] ? 'correct' : 'wrong'
      })
    )
  )

  /** Check if a number (1-9) is fully completed (all instances placed correctly) */
  function isNumberComplete(num: number): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (solution.value[r]![c] === num) {
          if (playerGrid.value[r]![c] !== num) return false
        }
      }
    }
    return true
  }

  /** Set of numbers (1-9) that are fully completed */
  const completedNumbers = computed(() => {
    const completed = new Set<number>()
    for (let num = 1; num <= 9; num++) {
      if (isNumberComplete(num)) completed.add(num)
    }
    return completed
  })

  function reset() {
    playerGrid.value = cloneGrid(puzzle.value)
  }

  function reveal() {
    playerGrid.value = cloneGrid(solution.value)
  }

  return {
    solution: readonly(solution),
    puzzle: readonly(puzzle),
    playerGrid,
    difficulty,
    isGenerating,
    visualize,
    visualGrid: readonly(visualGrid),
    generationPhase: readonly(generationPhase),
    noFeedback,
    isSolved,
    cellStates,
    completedNumbers,
    generate,
    setCell,
    reset,
    reveal
  }
}
