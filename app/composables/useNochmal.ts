import { loadFromStorage, saveToStorage } from '~/composables/useGameStorage'

// ── Types ──────────────────────────────────────────────────────────────────

export type Color = 'orange' | 'blue' | 'green' | 'red' | 'yellow'
export type ColLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O'
export type BonusState = 'none' | 'first' | 'second'

export interface Cell {
  x: number // column index 0–14  (A=0, H=7, O=14)
  y: number // row index    0–6
  col: ColLabel
  color: Color
  crossed: boolean
  star: boolean
}

export interface NochmalState {
  cells: Cell[]
  columnBonus: Record<ColLabel, BonusState>
  colorBonus: Record<Color, BonusState>
  jokersUsed: number
}

// ── Grid constants ─────────────────────────────────────────────────────────

export const GRID_ROWS = 7
export const GRID_COLS = 15

export const COL_DEFS: { label: ColLabel, first: number, second: number }[] = [
  { label: 'A', first: 5, second: 3 },
  { label: 'B', first: 3, second: 2 },
  { label: 'C', first: 3, second: 2 },
  { label: 'D', first: 3, second: 2 },
  { label: 'E', first: 2, second: 1 },
  { label: 'F', first: 2, second: 1 },
  { label: 'G', first: 2, second: 1 },
  { label: 'H', first: 1, second: 0 },
  { label: 'I', first: 2, second: 1 },
  { label: 'J', first: 2, second: 1 },
  { label: 'K', first: 2, second: 1 },
  { label: 'L', first: 3, second: 2 },
  { label: 'M', first: 3, second: 2 },
  { label: 'N', first: 3, second: 2 },
  { label: 'O', first: 5, second: 3 }
]

export const COLORS: Color[] = ['orange', 'blue', 'green', 'red', 'yellow']

export const COLOR_HEX: Record<Color, string> = {
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308'
}

// ── Static mosaic layout ───────────────────────────────────────────────────
//
// Each entry is [x, y] where:
//   x ∈ [0, 14]  maps to column label A–O via COL_DEFS[x]
//   y ∈ [0, 6]   is the row (top = 0)
//
// Together, all five lists must cover every cell of the 7×15 grid exactly once
// (7 × 15 = 105 cells, ~21 per colour).

type Coord = readonly [x: number, y: number]

const LAYOUT: Record<Color, readonly Coord[]> = {
  red: [
    [0, 4], [0, 5], [1, 3], [2, 2], [2, 3],
    [3, 5], [4, 5], [5, 4], [5, 5], [6, 5],
    [6, 6], [7, 2], [8, 1], [8, 2], [9, 2],
    [10, 5], [11, 4], [12, 4], [13, 3], [13, 4], [14, 4]
  ],
  orange: [[0, 1], [1, 4], [2, 4], [3, 4], [4, 3], [4, 4], [5, 3], [6, 1], [7, 1], [8, 4], [9, 4], [9, 5], [10, 4], [11, 0], [11, 1], [12, 1], [12, 2], [12, 3], [13, 6], [14, 5], [14, 6]],
  blue: [[0, 2], [0, 3], [1, 5], [2, 5], [2, 6], [3, 6], [4, 6], [5, 6], [6, 3], [6, 4], [7, 3], [7, 4], [8, 0], [9, 0], [9, 1], [10, 0], [10, 1], [11, 5], [12, 5], [13, 5], [14, 3]],
  green: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 0], [3, 1], [3, 2], [3, 3], [4, 2], [5, 2], [6, 2], [7, 0], [8, 3], [9, 3], [10, 6], [11, 6], [12, 6], [13, 1], [13, 2], [14, 1], [14, 2]],
  yellow: [[0, 6], [1, 6], [2, 1], [3, 0], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0], [7, 5], [7, 6], [8, 5], [8, 6], [9, 6], [10, 2], [10, 3], [11, 2], [11, 3], [12, 0], [13, 0], [14, 0]]
}

// Star positions [x, y] — each uncrossed star scores −2 pts at game end.
const STAR_COORDS: readonly Coord[] = [
  [0, 2], [1, 5], [2, 1], [3, 5], [4, 1], [5, 3], [6, 2], [7, 1], [8, 5], [9, 1], [10, 5], [11, 0], [12, 6], [13, 3], [14, 5]
]

// ── Cell builder ───────────────────────────────────────────────────────────

const STAR_KEY_SET = new Set(STAR_COORDS.map(([x, y]) => `${x},${y}`))

function buildCells(): Cell[] {
  const cells: Cell[] = []
  for (const color of COLORS) {
    for (const [x, y] of LAYOUT[color]) {
      cells.push({
        x,
        y,
        col: COL_DEFS[x]!.label,
        color,
        crossed: false,
        star: STAR_KEY_SET.has(`${x},${y}`)
      })
    }
  }
  return cells
}

// ── Persistence ────────────────────────────────────────────────────────────
//
// Only the mutable parts are persisted. The static layout (color, col, star,
// x, y) is always rebuilt from LAYOUT so that layout changes survive old saves.

const STORAGE_KEY = 'nochmal-state'

interface PersistedState {
  crossed: Record<string, true> // key "x,y", only present when true
  columnBonus: Record<ColLabel, BonusState>
  colorBonus: Record<Color, BonusState>
  jokersUsed: number
}

function makeDefaultState(): NochmalState {
  return {
    cells: buildCells(),
    columnBonus: Object.fromEntries(
      COL_DEFS.map(c => [c.label, 'none' as BonusState])
    ) as Record<ColLabel, BonusState>,
    colorBonus: Object.fromEntries(
      COLORS.map(c => [c, 'none' as BonusState])
    ) as Record<Color, BonusState>,
    jokersUsed: 0
  }
}

function loadState(): NochmalState {
  const persisted = loadFromStorage<PersistedState>(STORAGE_KEY)
  if (!persisted) return makeDefaultState()

  const cells = buildCells()
  const crossed = persisted.crossed ?? {}
  for (const cell of cells) {
    cell.crossed = `${cell.x},${cell.y}` in crossed
  }
  return {
    cells,
    columnBonus: persisted.columnBonus,
    colorBonus: persisted.colorBonus,
    jokersUsed: persisted.jokersUsed
  }
}

// ── Composable ─────────────────────────────────────────────────────────────

export function useNochmal() {
  const state = ref<NochmalState>(loadState())

  watch(
    state,
    (val) => {
      const crossed: Record<string, true> = {}
      for (const cell of val.cells) {
        if (cell.crossed) crossed[`${cell.x},${cell.y}`] = true
      }
      saveToStorage<PersistedState>(STORAGE_KEY, {
        crossed,
        columnBonus: val.columnBonus,
        colorBonus: val.colorBonus,
        jokersUsed: val.jokersUsed
      })
    },
    { deep: true }
  )

  // ── Derived views — same reactive object refs as state.value.cells ─────

  /** 7×15 grid for direct template iteration. */
  const cellGrid = computed<(Cell | null)[][]>(() => {
    const grid: (Cell | null)[][] = Array.from(
      { length: GRID_ROWS },
      () => Array<Cell | null>(GRID_COLS).fill(null)
    )
    for (const cell of state.value.cells) grid[cell.y][cell.x] = cell
    return grid
  })

  /** Cells grouped by colour. Entries are the same reactive object refs. */
  const cellsByColor = computed<Map<Color, Cell[]>>(() => {
    const map = new Map<Color, Cell[]>(COLORS.map(c => [c, []]))
    for (const cell of state.value.cells) map.get(cell.color)!.push(cell)
    return map
  })

  /** Cells grouped by column label. Entries are the same reactive object refs. */
  const cellsByCol = computed<Map<ColLabel, Cell[]>>(() => {
    const map = new Map<ColLabel, Cell[]>(COL_DEFS.map(c => [c.label, []]))
    for (const cell of state.value.cells) map.get(cell.col)!.push(cell)
    return map
  })

  /** All star cells. Entries are the same reactive object refs. */
  const starCells = computed<Cell[]>(() => state.value.cells.filter(c => c.star))

  /** Cells that are valid to click: column H or adjacent to crossed cells. */
  const clickableCells = computed<Set<Cell>>(() => {
    const clickable = new Set<Cell>()

    // Column H (x=7) is always clickable
    for (const cell of state.value.cells) {
      if (cell.x === 7) clickable.add(cell)
    }

    // Cells adjacent to crossed cells are clickable
    for (const cell of state.value.cells) {
      if (cell.crossed) {
        // Check all 4 adjacent cells
        for (const other of state.value.cells) {
          if (other === cell) continue
          const dx = Math.abs(other.x - cell.x)
          const dy = Math.abs(other.y - cell.y)
          // Adjacent: horizontally or vertically neighbor (not diagonal)
          if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            clickable.add(other)
          }
        }
      }
    }

    return clickable
  })

  // ── Scoring ───────────────────────────────────────────────────────────

  const unusedJokers = computed(() => 8 - state.value.jokersUsed)

  const scoreColorBonus = computed(() =>
    COLORS.reduce((sum, color) => {
      const b = state.value.colorBonus[color]
      return sum + (b === 'first' ? 5 : b === 'second' ? 3 : 0)
    }, 0)
  )

  const scoreColumns = computed(() =>
    COL_DEFS.reduce((sum, col) => {
      const b = state.value.columnBonus[col.label]
      return sum + (b === 'first' ? col.first : b === 'second' ? col.second : 0)
    }, 0)
  )

  const scoreStars = computed(() => starCells.value.filter(c => !c.crossed).length * -2)

  const totalScore = computed(() =>
    scoreColorBonus.value + scoreColumns.value + unusedJokers.value + scoreStars.value
  )

  // ── Actions ───────────────────────────────────────────────────────────

  /** Toggle a cell if it's clickable. Directly mutates the reactive object — no lookup needed. */
  function toggleCell(cell: Cell): void {
    if (clickableCells.value.has(cell)) {
      cell.crossed = !cell.crossed
    }
  }

  function cycleColumnBonus(col: ColLabel): void {
    const cur = state.value.columnBonus[col]
    state.value.columnBonus[col] = cur === 'none' ? 'first' : cur === 'first' ? 'second' : 'none'
  }

  function cycleColorBonus(color: Color): void {
    const cur = state.value.colorBonus[color]
    state.value.colorBonus[color] = cur === 'none' ? 'first' : cur === 'first' ? 'second' : 'none'
  }

  function toggleJoker(index: number): void {
    state.value.jokersUsed = state.value.jokersUsed >= index ? index - 1 : index
  }

  function resetGame(): void {
    state.value = makeDefaultState()
  }

  return {
    state,
    cellGrid,
    cellsByColor,
    cellsByCol,
    starCells,
    clickableCells,
    unusedJokers,
    scoreColorBonus,
    scoreColumns,
    scoreStars,
    totalScore,
    toggleCell,
    cycleColumnBonus,
    cycleColorBonus,
    toggleJoker,
    resetGame
  }
}
