import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useWizard, computeRoundPoints } from '../../app/composables/useWizard'

// import.meta.client is false in Vitest (Node env) so save()/load() are no-ops;
// the localStorage mock is here for parity with other unit tests.
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

// ── computeRoundPoints ────────────────────────────────────────────────────────

describe('computeRoundPoints', () => {
  it('returns null when bid is null', () => {
    expect(computeRoundPoints(null, 3)).toBeNull()
  })

  it('returns null when tricks is null', () => {
    expect(computeRoundPoints(2, null)).toBeNull()
  })

  it('returns null when both are null', () => {
    expect(computeRoundPoints(null, null)).toBeNull()
  })

  it('correct bid: 0 tricks → 20 points', () => {
    expect(computeRoundPoints(0, 0)).toBe(20)
  })

  it('correct bid: 3 tricks → 50 points', () => {
    expect(computeRoundPoints(3, 3)).toBe(20 + 10 * 3)
  })

  it('correct bid: 1 trick → 30 points', () => {
    expect(computeRoundPoints(1, 1)).toBe(30)
  })

  it('wrong bid by 1 → -10 points', () => {
    expect(computeRoundPoints(2, 3)).toBe(-10)
  })

  it('wrong bid by 2 → -20 points', () => {
    expect(computeRoundPoints(0, 2)).toBe(-20)
  })

  it('wrong bid is symmetric (bid > tricks)', () => {
    expect(computeRoundPoints(5, 2)).toBe(-30)
  })
})

// ── useWizard ─────────────────────────────────────────────────────────────────

describe('useWizard', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  // ── initial state ──

  describe('initial state', () => {
    it('players is empty', () => {
      const { players } = useWizard()
      expect(players.value).toEqual([])
    })

    it('rounds is empty', () => {
      const { rounds } = useWizard()
      expect(rounds.value).toEqual([])
    })

    it('playerTotals is empty', () => {
      const { playerTotals } = useWizard()
      expect(playerTotals.value).toEqual([])
    })
  })

  // ── startGame ──

  describe('startGame', () => {
    it('sets player names', () => {
      const { players, startGame } = useWizard()
      startGame(['Alice', 'Bob'])
      expect(players.value).toEqual(['Alice', 'Bob'])
    })

    it('trims whitespace from names', () => {
      const { players, startGame } = useWizard()
      startGame(['  Alice  ', ' Bob'])
      expect(players.value).toEqual(['Alice', 'Bob'])
    })

    it('filters out empty names', () => {
      const { players, startGame } = useWizard()
      startGame(['Alice', '', '  ', 'Bob'])
      expect(players.value).toEqual(['Alice', 'Bob'])
    })

    it('clears existing rounds', () => {
      const { rounds, startGame, addRound } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      startGame(['Alice', 'Bob', 'Carol'])
      expect(rounds.value).toEqual([])
    })
  })

  // ── addRound ──

  describe('addRound', () => {
    it('adds one round with an entry per player', () => {
      const { rounds, startGame, addRound } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      expect(rounds.value).toHaveLength(1)
      expect(rounds.value[0]!.entries).toHaveLength(2)
    })

    it('new entries start with bid=null, bidLocked=false, tricks=null', () => {
      const { rounds, startGame, addRound } = useWizard()
      startGame(['Alice'])
      addRound()
      expect(rounds.value[0]!.entries[0]).toEqual({ bid: null, bidLocked: false, tricks: null })
    })

    it('can add multiple rounds', () => {
      const { rounds, startGame, addRound } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      addRound()
      expect(rounds.value).toHaveLength(2)
    })
  })

  // ── removeLastRound ──

  describe('removeLastRound', () => {
    it('removes the last round', () => {
      const { rounds, startGame, addRound, removeLastRound } = useWizard()
      startGame(['Alice'])
      addRound()
      addRound()
      removeLastRound()
      expect(rounds.value).toHaveLength(1)
    })

    it('is a no-op when there are no rounds', () => {
      const { rounds, startGame, removeLastRound } = useWizard()
      startGame(['Alice'])
      removeLastRound()
      expect(rounds.value).toHaveLength(0)
    })
  })

  // ── setBid ──

  describe('setBid', () => {
    it('sets the bid for the correct player and round', () => {
      const { rounds, startGame, addRound, setBid } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      setBid(0, 1, 3)
      expect(rounds.value[0]!.entries[1]!.bid).toBe(3)
    })

    it('sets bid to null', () => {
      const { rounds, startGame, addRound, setBid } = useWizard()
      startGame(['Alice'])
      addRound()
      setBid(0, 0, 2)
      setBid(0, 0, null)
      expect(rounds.value[0]!.entries[0]!.bid).toBeNull()
    })

    it('is a no-op when bid is already locked', () => {
      const { rounds, startGame, addRound, setBid, lockBid } = useWizard()
      startGame(['Alice'])
      addRound()
      setBid(0, 0, 2)
      lockBid(0, 0)
      setBid(0, 0, 5)
      expect(rounds.value[0]!.entries[0]!.bid).toBe(2)
    })

    it('is a no-op for a non-existent round', () => {
      const { rounds, startGame, setBid } = useWizard()
      startGame(['Alice'])
      setBid(99, 0, 1)
      expect(rounds.value).toHaveLength(0)
    })
  })

  // ── lockBid ──

  describe('lockBid', () => {
    it('sets bidLocked to true', () => {
      const { rounds, startGame, addRound, lockBid } = useWizard()
      startGame(['Alice'])
      addRound()
      lockBid(0, 0)
      expect(rounds.value[0]!.entries[0]!.bidLocked).toBe(true)
    })

    it('is a no-op for a non-existent round', () => {
      const { rounds, startGame, lockBid } = useWizard()
      startGame(['Alice'])
      lockBid(0, 0)
      expect(rounds.value).toHaveLength(0)
    })
  })

  // ── setTricks ──

  describe('setTricks', () => {
    it('sets tricks for the correct player and round', () => {
      const { rounds, startGame, addRound, setTricks } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      setTricks(0, 0, 4)
      expect(rounds.value[0]!.entries[0]!.tricks).toBe(4)
    })

    it('sets tricks to null', () => {
      const { rounds, startGame, addRound, setTricks } = useWizard()
      startGame(['Alice'])
      addRound()
      setTricks(0, 0, 3)
      setTricks(0, 0, null)
      expect(rounds.value[0]!.entries[0]!.tricks).toBeNull()
    })

    it('is a no-op for a non-existent round', () => {
      const { rounds, startGame, setTricks } = useWizard()
      startGame(['Alice'])
      setTricks(99, 0, 2)
      expect(rounds.value).toHaveLength(0)
    })
  })

  // ── playerTotals ──

  describe('playerTotals', () => {
    it('is 0 for each player when no bids or tricks are entered', () => {
      const { playerTotals, startGame, addRound } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      expect(playerTotals.value).toEqual([0, 0])
    })

    it('ignores rounds with incomplete data', () => {
      const { playerTotals, startGame, addRound, setBid } = useWizard()
      startGame(['Alice'])
      addRound()
      setBid(0, 0, 2) // no tricks yet → points still null
      expect(playerTotals.value[0]).toBe(0)
    })

    it('accumulates points correctly across rounds', () => {
      const { playerTotals, startGame, addRound, setBid, lockBid, setTricks } = useWizard()
      startGame(['Alice'])
      // Round 1: bid 2, tricks 2 → +40
      addRound()
      setBid(0, 0, 2)
      lockBid(0, 0)
      setTricks(0, 0, 2)
      // Round 2: bid 1, tricks 3 → -20
      addRound()
      setBid(1, 0, 1)
      lockBid(1, 0)
      setTricks(1, 0, 3)
      expect(playerTotals.value[0]).toBe(40 - 20)
    })

    it('tracks each player independently', () => {
      const { playerTotals, startGame, addRound, setBid, lockBid, setTricks } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      // Alice: bid 1, tricks 1 → +30
      setBid(0, 0, 1)
      lockBid(0, 0)
      setTricks(0, 0, 1)
      // Bob: bid 0, tricks 2 → -20
      setBid(0, 1, 0)
      lockBid(0, 1)
      setTricks(0, 1, 2)
      expect(playerTotals.value[0]).toBe(30)
      expect(playerTotals.value[1]).toBe(-20)
    })
  })

  // ── reset ──

  describe('reset', () => {
    it('clears players and rounds', () => {
      const { players, rounds, startGame, addRound, reset } = useWizard()
      startGame(['Alice', 'Bob'])
      addRound()
      reset()
      expect(players.value).toEqual([])
      expect(rounds.value).toEqual([])
    })
  })
})
