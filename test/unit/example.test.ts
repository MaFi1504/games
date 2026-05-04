import { describe, expect, it, beforeEach, vi } from 'vitest'
import { usePhase10 } from '../../app/composables/usePhase10'

// Stub localStorage (not available in Node environment)
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()
vi.stubGlobal('localStorage', localStorageMock)
// import.meta.client is false in node env, so load()/save() are no-ops —
// reactive state is still fully testable without persistence

describe('usePhase10', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('initial state', () => {
    it('starts with no completed phases', () => {
      const { completedPhases } = usePhase10()
      expect(completedPhases.value).toEqual([])
    })

    it('starts with no scores', () => {
      const { scores } = usePhase10()
      expect(scores.value).toEqual([])
    })

    it('total score is 0 initially', () => {
      const { totalScore } = usePhase10()
      expect(totalScore.value).toBe(0)
    })

    it('allPhasesCompleted is false initially', () => {
      const { allPhasesCompleted } = usePhase10()
      expect(allPhasesCompleted.value).toBe(false)
    })

    it('currentPhase starts at phase 1', () => {
      const { currentPhase } = usePhase10()
      expect(currentPhase.value?.id).toBe(1)
    })
  })

  describe('togglePhase', () => {
    it('marks a phase as completed', () => {
      const { completedPhases, togglePhase } = usePhase10()
      togglePhase(1)
      expect(completedPhases.value).toContain(1)
    })

    it('unchecks an already completed phase', () => {
      const { completedPhases, togglePhase } = usePhase10()
      togglePhase(1)
      togglePhase(1)
      expect(completedPhases.value).not.toContain(1)
    })

    it('advances currentPhase when phase 1 is done', () => {
      const { currentPhase, togglePhase } = usePhase10()
      togglePhase(1)
      expect(currentPhase.value?.id).toBe(2)
    })

    it('can complete all phases', () => {
      const { allPhasesCompleted, togglePhase } = usePhase10(10)
      for (let i = 1; i <= 10; i++) togglePhase(i)
      expect(allPhasesCompleted.value).toBe(true)
    })

    it('currentPhase is null when all phases done', () => {
      const { currentPhase, togglePhase } = usePhase10(10)
      for (let i = 1; i <= 10; i++) togglePhase(i)
      expect(currentPhase.value).toBeNull()
    })

    it('completing phases out of order still tracks correctly', () => {
      const { completedPhases, currentPhase, togglePhase } = usePhase10()
      togglePhase(3)
      togglePhase(5)
      expect(completedPhases.value).toContain(3)
      expect(completedPhases.value).toContain(5)
      // currentPhase should still be 1 (lowest uncompleted)
      expect(currentPhase.value?.id).toBe(1)
    })
  })

  describe('addScore', () => {
    it('adds a score entry', () => {
      const { scores, addScore } = usePhase10()
      addScore(42)
      expect(scores.value).toEqual([42])
    })

    it('accumulates multiple rounds', () => {
      const { scores, totalScore, addScore } = usePhase10()
      addScore(10)
      addScore(25)
      addScore(5)
      expect(scores.value).toEqual([10, 25, 5])
      expect(totalScore.value).toBe(40)
    })

    it('ignores negative values', () => {
      const { scores, addScore } = usePhase10()
      addScore(-5)
      expect(scores.value).toEqual([])
    })

    it('ignores NaN', () => {
      const { scores, addScore } = usePhase10()
      addScore(NaN)
      expect(scores.value).toEqual([])
    })

    it('accepts 0 as valid score', () => {
      const { scores, addScore } = usePhase10()
      addScore(0)
      expect(scores.value).toEqual([0])
    })
  })

  describe('removeScore', () => {
    it('removes a score by index', () => {
      const { scores, addScore, removeScore } = usePhase10()
      addScore(10)
      addScore(20)
      addScore(30)
      removeScore(1)
      expect(scores.value).toEqual([10, 30])
    })

    it('updates totalScore after removal', () => {
      const { totalScore, addScore, removeScore } = usePhase10()
      addScore(10)
      addScore(20)
      removeScore(0)
      expect(totalScore.value).toBe(20)
    })
  })

  describe('reset', () => {
    it('clears completed phases', () => {
      const { completedPhases, togglePhase, reset } = usePhase10()
      togglePhase(1)
      togglePhase(2)
      reset()
      expect(completedPhases.value).toEqual([])
    })

    it('clears scores', () => {
      const { scores, addScore, reset } = usePhase10()
      addScore(50)
      reset()
      expect(scores.value).toEqual([])
    })

    it('resets totalScore to 0', () => {
      const { totalScore, addScore, reset } = usePhase10()
      addScore(100)
      reset()
      expect(totalScore.value).toBe(0)
    })

    it('currentPhase goes back to 1 after reset', () => {
      const { currentPhase, togglePhase, reset } = usePhase10()
      togglePhase(1)
      togglePhase(2)
      reset()
      expect(currentPhase.value?.id).toBe(1)
    })
  })

  describe('totalScore computed', () => {
    it('sums all round scores', () => {
      const { totalScore, addScore } = usePhase10()
      addScore(5)
      addScore(10)
      addScore(25)
      expect(totalScore.value).toBe(40)
    })

    it('returns 0 with no scores', () => {
      const { totalScore } = usePhase10()
      expect(totalScore.value).toBe(0)
    })
  })

  describe('totalPhases parameter', () => {
    it('respects custom totalPhases count', () => {
      const { allPhasesCompleted, togglePhase } = usePhase10(3)
      togglePhase(1)
      togglePhase(2)
      expect(allPhasesCompleted.value).toBe(false)
      togglePhase(3)
      expect(allPhasesCompleted.value).toBe(true)
    })
  })
})

