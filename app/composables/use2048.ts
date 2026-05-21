import { ref, computed } from 'vue'
import { loadFromStorage, saveToStorage } from './useGameStorage'

export type GridSize = 4 | 6 | 8
export type GameStatus = 'idle' | 'playing' | 'won' | 'over'

export type Tile = {
  id: number
  value: number
}

export type Grid2048 = (Tile | null)[][]

type StoredState = {
  grid: (Tile | null)[][]
  score: number
  bestScore: number
  status: GameStatus
  gridSize: GridSize
  wonAcknowledged: boolean
}

const STORAGE_KEY = '2048-game'

let _nextId = 1

function nextId(): number {
  return _nextId++
}

// ---------------------------------------------------------------------------
// Pure helpers – exported for unit testing
// ---------------------------------------------------------------------------

export function slideRow(row: (Tile | null)[]): { row: (Tile | null)[], score: number } {
  const tiles = row.filter((t): t is Tile => t !== null)
  const out: (Tile | null)[] = []
  let gained = 0
  let i = 0
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i]!.value === tiles[i + 1]!.value) {
      const merged = tiles[i]!.value * 2
      gained += merged
      out.push({ id: nextId(), value: merged })
      i += 2
    } else {
      out.push(tiles[i]!)
      i++
    }
  }
  while (out.length < row.length) out.push(null)
  return { row: out, score: gained }
}

export function hasMoves(g: Grid2048): boolean {
  const size = g.length
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (g[r]![c] === null) return true
      if (c + 1 < size && g[r]![c]!.value === g[r]![c + 1]?.value) return true
      if (r + 1 < size && g[r]![c]!.value === g[r + 1]![c]?.value) return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function transpose(g: Grid2048): Grid2048 {
  const size = g.length
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => g[c]![r] ?? null)
  )
}

function reverseRows(g: Grid2048): Grid2048 {
  return g.map(row => [...row].reverse())
}

function applySlideLeft(g: Grid2048): { grid: Grid2048, score: number } {
  let gained = 0
  const next = g.map((row) => {
    const result = slideRow(row)
    gained += result.score
    return result.row
  })
  return { grid: next, score: gained }
}

function gridsEqual(a: Grid2048, b: Grid2048): boolean {
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r]!.length; c++) {
      if ((a[r]![c]?.value ?? null) !== (b[r]![c]?.value ?? null)) return false
    }
  }
  return true
}

function hasWinTile(g: Grid2048): boolean {
  return g.some(row => row.some(t => t !== null && t.value >= 2048))
}

function addRandomTile(g: Grid2048): Grid2048 {
  const empties: [number, number][] = []
  g.forEach((row, r) => row.forEach((cell, c) => {
    if (cell === null) empties.push([r, c])
  }))
  if (empties.length === 0) return g
  const [r, c] = empties[Math.floor(Math.random() * empties.length)]!
  const value = Math.random() < 0.9 ? 2 : 4
  const next = g.map(row => [...row])
  next[r]![c] = { id: nextId(), value }
  return next
}

function emptyGrid(size: number): Grid2048 {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function use2048() {
  const gridSize = ref<GridSize>(4)
  const grid = ref<Grid2048>([])
  const score = ref(0)
  const bestScore = ref(0)
  const status = ref<GameStatus>('idle')
  const wonAcknowledged = ref(false)

  const flatGrid = computed(() => grid.value.flat())

  function newGame(size?: GridSize) {
    if (size !== undefined) gridSize.value = size
    let g = emptyGrid(gridSize.value)
    g = addRandomTile(g)
    g = addRandomTile(g)
    grid.value = g
    score.value = 0
    status.value = 'playing'
    wonAcknowledged.value = false
    save()
  }

  function move(dir: 'up' | 'down' | 'left' | 'right'): boolean {
    if (status.value === 'over' || status.value === 'won') return false

    let g = grid.value
    let gained = 0

    if (dir === 'up') {
      const t = transpose(g)
      const { grid: slid, score: s } = applySlideLeft(t)
      g = transpose(slid)
      gained = s
    } else if (dir === 'down') {
      const t = reverseRows(transpose(g))
      const { grid: slid, score: s } = applySlideLeft(t)
      g = transpose(reverseRows(slid))
      gained = s
    } else if (dir === 'left') {
      const { grid: slid, score: s } = applySlideLeft(g)
      g = slid
      gained = s
    } else {
      const reversed = reverseRows(g)
      const { grid: slid, score: s } = applySlideLeft(reversed)
      g = reverseRows(slid)
      gained = s
    }

    if (gridsEqual(grid.value, g)) return false

    score.value += gained
    if (score.value > bestScore.value) bestScore.value = score.value

    g = addRandomTile(g)
    grid.value = g

    if (!wonAcknowledged.value && hasWinTile(g)) {
      status.value = 'won'
    } else if (!hasMoves(g)) {
      status.value = 'over'
    }

    save()
    return true
  }

  function continueGame() {
    wonAcknowledged.value = true
    status.value = 'playing'
    save()
  }

  function resetToIdle() {
    status.value = 'idle'
    save()
  }

  function save() {
    saveToStorage<StoredState>(STORAGE_KEY, {
      grid: grid.value,
      score: score.value,
      bestScore: bestScore.value,
      status: status.value,
      gridSize: gridSize.value,
      wonAcknowledged: wonAcknowledged.value
    })
  }

  function load() {
    const data = loadFromStorage<StoredState>(STORAGE_KEY)
    if (!data) return
    gridSize.value = ([4, 6, 8] as GridSize[]).includes(data.gridSize) ? data.gridSize : 4
    grid.value = Array.isArray(data.grid) ? data.grid : []
    score.value = typeof data.score === 'number' ? data.score : 0
    bestScore.value = typeof data.bestScore === 'number' ? data.bestScore : 0
    status.value = (['idle', 'playing', 'won', 'over'] as GameStatus[]).includes(data.status)
      ? data.status
      : 'idle'
    wonAcknowledged.value = typeof data.wonAcknowledged === 'boolean' ? data.wonAcknowledged : false
    let maxId = 0
    grid.value.forEach(row => row.forEach((t) => {
      if (t && t.id > maxId) maxId = t.id
    }))
    if (maxId >= _nextId) _nextId = maxId + 1
  }

  return {
    gridSize,
    grid,
    score,
    bestScore,
    status,
    flatGrid,
    newGame,
    move,
    continueGame,
    resetToIdle,
    load
  }
}
