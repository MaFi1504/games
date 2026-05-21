import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useSudoku, type Grid, type Difficulty } from '../../app/composables/useSudoku'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countClues(grid: Grid): number {
  return grid.flat().filter(cell => cell !== null).length
}

function isValidSolution(grid: Grid): boolean {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  for (let r = 0; r < 9; r++) {
    if (!nums.every(n => grid[r]!.includes(n))) return false
  }
  for (let c = 0; c < 9; c++) {
    if (!nums.every(n => grid.some(row => row[c] === n))) return false
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box: number[] = []
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) {
          box.push(grid[r]![c] as number)
        }
      }
      if (!nums.every(n => box.includes(n))) return false
    }
  }
  return true
}

async function generatePuzzle(diff: Difficulty = 'easy') {
  const sudoku = useSudoku()
  sudoku.generate(diff)
  await nextTick()
  return sudoku
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSudoku', () => {
  describe('initial state', () => {
    it('starts with an all-null 9×9 grid', () => {
      const { puzzle } = useSudoku()
      expect(puzzle.value).toHaveLength(9)
      expect(puzzle.value.every(row => row.length === 9)).toBe(true)
      expect(countClues(puzzle.value)).toBe(0)
    })

    it('isSolved is false initially (empty playerGrid does not match empty solution)', () => {
      const { isSolved } = useSudoku()
      expect(isSolved.value).toBe(false)
    })

    it('difficulty defaults to easy', () => {
      const { difficulty } = useSudoku()
      expect(difficulty.value).toBe('easy')
    })

    it('isGenerating starts false', () => {
      const { isGenerating } = useSudoku()
      expect(isGenerating.value).toBe(false)
    })
  })

  describe('generate()', () => {
    it('produces a valid complete solution', async () => {
      const { solution } = await generatePuzzle('easy')
      expect(isValidSolution(solution.value)).toBe(true)
    })

    it('easy puzzle has ~36 clues', async () => {
      const { puzzle } = await generatePuzzle('easy')
      const clues = countClues(puzzle.value)
      expect(clues).toBeGreaterThanOrEqual(36)
    })

    it('medium puzzle has fewer clues than easy', async () => {
      const easyPuzzle = await generatePuzzle('easy')
      const mediumPuzzle = await generatePuzzle('medium')
      expect(countClues(mediumPuzzle.puzzle.value)).toBeLessThan(
        countClues(easyPuzzle.puzzle.value)
      )
    })

    it('hard puzzle has ~25 clues', async () => {
      const { puzzle } = await generatePuzzle('hard')
      const clues = countClues(puzzle.value)
      expect(clues).toBeGreaterThanOrEqual(25)
      expect(clues).toBeLessThanOrEqual(30)
    })

    it('puzzle clues are a subset of the solution', async () => {
      const { puzzle, solution } = await generatePuzzle('easy')
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const clue = puzzle.value[r]![c]
          if (clue !== null) {
            expect(clue).toBe(solution.value[r]![c])
          }
        }
      }
    })

    it('sets difficulty on the composable', async () => {
      const { difficulty } = await generatePuzzle('hard')
      expect(difficulty.value).toBe('hard')
    })

    it('isGenerating is false after nextTick', async () => {
      const { isGenerating } = await generatePuzzle('easy')
      expect(isGenerating.value).toBe(false)
    })

    it('playerGrid is a copy of puzzle after generation', async () => {
      const { puzzle, playerGrid } = await generatePuzzle('easy')
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          expect(playerGrid.value[r]![c]).toBe(puzzle.value[r]![c])
        }
      }
    })
  })

  describe('setCell()', () => {
    it('sets a digit on a non-clue cell', async () => {
      const { puzzle, playerGrid, setCell } = await generatePuzzle('easy')
      const emptyCell = puzzle.value.flatMap((row, r) =>
        row.map((cell, c) => ({ r, c, cell }))
      ).find(({ cell }) => cell === null)

      expect(emptyCell).toBeDefined()
      setCell(emptyCell!.r, emptyCell!.c, 5)
      expect(playerGrid.value[emptyCell!.r]![emptyCell!.c]).toBe(5)
    })

    it('cannot overwrite a clue cell', async () => {
      const { puzzle, playerGrid, setCell } = await generatePuzzle('easy')
      const clueCell = puzzle.value.flatMap((row, r) =>
        row.map((cell, c) => ({ r, c, cell }))
      ).find(({ cell }) => cell !== null)!

      const originalValue = clueCell.cell
      setCell(clueCell.r, clueCell.c, 7)
      expect(playerGrid.value[clueCell.r]![clueCell.c]).toBe(originalValue)
    })

    it('can set a cell to null (erase a digit)', async () => {
      const { puzzle, playerGrid, setCell } = await generatePuzzle('easy')
      const emptyCell = puzzle.value.flatMap((row, r) =>
        row.map((cell, c) => ({ r, c, cell }))
      ).find(({ cell }) => cell === null)!

      setCell(emptyCell.r, emptyCell.c, 3)
      expect(playerGrid.value[emptyCell.r]![emptyCell.c]).toBe(3)
      setCell(emptyCell.r, emptyCell.c, null)
      expect(playerGrid.value[emptyCell.r]![emptyCell.c]).toBeNull()
    })
  })

  describe('reset()', () => {
    it('restores playerGrid to the original puzzle clues', async () => {
      const { puzzle, playerGrid, setCell, reset } = await generatePuzzle('easy')
      const emptyCell = puzzle.value.flatMap((row, r) =>
        row.map((cell, c) => ({ r, c, cell }))
      ).find(({ cell }) => cell === null)!

      setCell(emptyCell.r, emptyCell.c, 9)
      expect(playerGrid.value[emptyCell.r]![emptyCell.c]).toBe(9)
      reset()
      expect(playerGrid.value[emptyCell.r]![emptyCell.c]).toBeNull()
    })
  })

  describe('reveal()', () => {
    it('fills playerGrid with the full solution', async () => {
      const { solution, playerGrid, reveal } = await generatePuzzle('easy')
      reveal()
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          expect(playerGrid.value[r]![c]).toBe(solution.value[r]![c])
        }
      }
    })
  })

  describe('isSolved', () => {
    it('is true after reveal()', async () => {
      const { isSolved, reveal } = await generatePuzzle('easy')
      reveal()
      expect(isSolved.value).toBe(true)
    })
  })

  describe('cellStates', () => {
    it('clue cells have state "clue"', async () => {
      const { puzzle, cellStates } = await generatePuzzle('easy')
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle.value[r]![c] !== null) {
            expect(cellStates.value[r]![c]).toBe('clue')
          }
        }
      }
    })

    it('empty non-clue cells have state "empty"', async () => {
      const { puzzle, cellStates } = await generatePuzzle('easy')
      const emptyCell = puzzle.value.flatMap((row, r) =>
        row.map((cell, c) => ({ r, c, cell }))
      ).find(({ cell }) => cell === null)!
      expect(cellStates.value[emptyCell.r]![emptyCell.c]).toBe('empty')
    })

    it('correctly placed digit has state "correct"', async () => {
      const { puzzle, solution, setCell, cellStates } = await generatePuzzle('easy')
      const emptyCell = puzzle.value.flatMap((row, r) =>
        row.map((cell, c) => ({ r, c, cell }))
      ).find(({ cell }) => cell === null)!

      const correctDigit = solution.value[emptyCell.r]![emptyCell.c]!
      setCell(emptyCell.r, emptyCell.c, correctDigit)
      expect(cellStates.value[emptyCell.r]![emptyCell.c]).toBe('correct')
    })

    it('wrongly placed digit has state "wrong"', async () => {
      const { puzzle, solution, setCell, cellStates } = await generatePuzzle('easy')
      const emptyCell = puzzle.value.flatMap((row, r) =>
        row.map((cell, c) => ({ r, c, cell }))
      ).find(({ cell }) => cell === null)!

      const correctDigit = solution.value[emptyCell.r]![emptyCell.c]!
      const wrongDigit = (correctDigit % 9) + 1
      setCell(emptyCell.r, emptyCell.c, wrongDigit !== correctDigit ? wrongDigit : (wrongDigit % 9) + 1)
      expect(cellStates.value[emptyCell.r]![emptyCell.c]).toBe('wrong')
    })
  })
})
