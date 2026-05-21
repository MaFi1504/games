import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useKniffel } from '../../app/composables/useKniffel'

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

describe('useKniffel', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('initial state', () => {
    it('starts with no variant selected', () => {
      const { variant } = useKniffel()
      expect(variant.value).toBeNull()
    })

    it('categoryList is empty before variant is selected', () => {
      const { categoryList } = useKniffel()
      expect(categoryList.value).toEqual([])
    })

    it('totalScore is 0 initially', () => {
      const { totalScore } = useKniffel()
      expect(totalScore.value).toBe(0)
    })

    it('allCategoriesScored is vacuously true when no variant is selected', () => {
      // Array.every([]) === true by JS spec; no categories means nothing left to score
      const { allCategoriesScored } = useKniffel()
      expect(allCategoriesScored.value).toBe(true)
    })

    it('scoredCount is 0 initially', () => {
      const { scoredCount } = useKniffel()
      expect(scoredCount.value).toBe(0)
    })
  })

  describe('selectVariant', () => {
    it('sets the standard variant and populates categories', () => {
      const { variant, categoryList, selectVariant } = useKniffel()
      selectVariant('standard')
      expect(variant.value).toBe('standard')
      expect(categoryList.value.length).toBeGreaterThan(0)
    })

    it('sets the extrem variant with more categories', () => {
      const { categoryList, selectVariant } = useKniffel()
      selectVariant('extrem')
      const extrem = categoryList.value.length
      selectVariant('standard')
      const standard = categoryList.value.length
      expect(extrem).toBeGreaterThan(standard)
    })

    it('resets categories when switching variants', () => {
      const { categoryList, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 3)
      selectVariant('extrem')
      expect(categoryList.value.every(cat => !cat.scored)).toBe(true)
    })

    it('standard bonusThreshold is 63', () => {
      const { bonusThreshold, selectVariant } = useKniffel()
      selectVariant('standard')
      expect(bonusThreshold.value).toBe(63)
    })

    it('extrem bonusThreshold is 73', () => {
      const { bonusThreshold, selectVariant } = useKniffel()
      selectVariant('extrem')
      expect(bonusThreshold.value).toBe(73)
    })
  })

  describe('scoreCategory', () => {
    it('scores a category and updates scoredCount', () => {
      const { scoredCount, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 3)
      expect(scoredCount.value).toBe(1)
    })

    it('floors fractional values', () => {
      const { categoryList, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 2.9)
      const cat = categoryList.value.find(c => c.id === 'ones')
      expect(cat!.value).toBe(2)
    })

    it('clamps negative values to 0', () => {
      const { categoryList, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', -5)
      const cat = categoryList.value.find(c => c.id === 'ones')
      expect(cat!.value).toBe(0)
    })

    it('cannot score the same category twice', () => {
      const { categoryList, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 3)
      scoreCategory('ones', 5)
      const cat = categoryList.value.find(c => c.id === 'ones')
      expect(cat!.value).toBe(3)
    })

    it('ignores unknown category ids', () => {
      const { scoredCount, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('nonexistent', 10)
      expect(scoredCount.value).toBe(0)
    })

    it('updates totalScore after scoring', () => {
      const { totalScore, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 3)
      scoreCategory('twos', 6)
      expect(totalScore.value).toBe(9)
    })
  })

  describe('upperSectionBonus', () => {
    it('applies 35pt bonus when standard upper section reaches 63', () => {
      const { upperSectionBonus, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      // 1×3 + 2×6 + 3×9 + 4×12 + 5×15 + 6×18 = 3+6+9+12+15+18 = 63
      scoreCategory('ones', 3)
      scoreCategory('twos', 6)
      scoreCategory('threes', 9)
      scoreCategory('fours', 12)
      scoreCategory('fives', 15)
      scoreCategory('sixes', 18)
      expect(upperSectionBonus.value).toBe(35)
    })

    it('no bonus when upper section is below threshold', () => {
      const { upperSectionBonus, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 1)
      expect(upperSectionBonus.value).toBe(0)
    })
  })

  describe('removeScore', () => {
    it('removes a scored category', () => {
      const { categoryList, selectVariant, scoreCategory, removeScore } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 3)
      removeScore('ones')
      const cat = categoryList.value.find(c => c.id === 'ones')
      expect(cat!.scored).toBe(false)
      expect(cat!.value).toBeNull()
    })

    it('does nothing for unknown ids', () => {
      const { scoredCount, selectVariant, scoreCategory, removeScore } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 3)
      removeScore('nonexistent')
      expect(scoredCount.value).toBe(1)
    })
  })

  describe('allCategoriesScored', () => {
    it('is true only when all categories have been scored', () => {
      const { allCategoriesScored, categoryList, selectVariant, scoreCategory } = useKniffel()
      selectVariant('standard')
      for (const cat of categoryList.value) {
        scoreCategory(cat.id, 0)
      }
      expect(allCategoriesScored.value).toBe(true)
    })
  })

  describe('getFixedPoints', () => {
    it('returns 50 for kniffel in standard mode', () => {
      const { selectVariant, getFixedPoints } = useKniffel()
      selectVariant('standard')
      expect(getFixedPoints('kniffel')).toBe(50)
    })

    it('returns null for upper section categories', () => {
      const { selectVariant, getFixedPoints } = useKniffel()
      selectVariant('standard')
      expect(getFixedPoints('ones')).toBeNull()
    })

    it('returns 25 for fullHouse in standard mode', () => {
      const { selectVariant, getFixedPoints } = useKniffel()
      selectVariant('standard')
      expect(getFixedPoints('fullHouse')).toBe(25)
    })
  })

  describe('reset', () => {
    it('resets variant and categories', () => {
      const { variant, categoryList, selectVariant, scoreCategory, reset } = useKniffel()
      selectVariant('standard')
      scoreCategory('ones', 3)
      reset()
      expect(variant.value).toBeNull()
      expect(categoryList.value).toEqual([])
    })
  })
})
