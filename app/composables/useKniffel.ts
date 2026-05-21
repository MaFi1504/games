import { ref, computed } from 'vue'
import { loadFromStorage, saveToStorage } from './useGameStorage'

export type KniffelVariant = 'standard' | 'extrem'

export interface KniffelCategory {
  id: string
  scored: boolean
  value: number | null
}

interface KniffelState {
  variant: KniffelVariant | null
  categories: Record<string, number | null>
}

const STORAGE_KEY = 'kniffel-game'

export const UPPER_SECTION_IDS = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']

// Standard Kniffel categories (5 dice)
const STANDARD_CATEGORIES = [
  // Upper section
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
  // Lower section
  'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'kniffel', 'chance'
]

// Kniffel Extrem categories (6 dice)
const EXTREM_CATEGORIES = [
  // Upper section
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
  // Lower section
  'threeOfAKind', 'fourOfAKind', 'twoPairs', 'threePairs', 'twoThreeOfAKind', 'fullHouse', 'largeFullHouse',
  'smallStraight', 'largeStraight', 'highway', 'kniffel', 'kniffelExtrem', 'tenOrLess', 'thirtyThreeOrMore',
  'chance', 'superChance'
]

// Fixed point values for categories (null means sum of dice)
const CATEGORY_FIXED_POINTS: Record<string, number | null> = {
  // Standard
  fullHouse: 25,
  smallStraight: 25,
  largeStraight: 30,
  kniffel: 50,
  // Extrem-only
  threePairs: 35,
  twoThreeOfAKind: 45,
  largeFullHouse: 45,
  highway: 50,
  kniffelExtrem: 75,
  tenOrLess: 40,
  thirtyThreeOrMore: 40
}

// Extrem overrides – only values that differ from CATEGORY_FIXED_POINTS
const EXTREM_FIXED_POINTS_OVERRIDES: Record<string, number | null> = {
  smallStraight: 30,
  largeStraight: 40
}

export function useKniffel() {
  const variant = ref<KniffelVariant | null>(null)
  const categories = ref<Record<string, number | null>>({})

  const categoryIds = computed(() => {
    if (!variant.value) return []
    return variant.value === 'standard' ? STANDARD_CATEGORIES : EXTREM_CATEGORIES
  })

  const categoryList = computed(() => {
    return categoryIds.value.map(id => ({
      id,
      scored: categories.value[id] !== null && categories.value[id] !== undefined,
      value: categories.value[id] ?? null
    }))
  })

  const upperSectionIds = UPPER_SECTION_IDS

  const upperSectionScore = computed(() => {
    return upperSectionIds.reduce((sum, id) => {
      const val = categories.value[id]
      return sum + (val ?? 0)
    }, 0)
  })

  const upperSectionBonus = computed(() => {
    return upperSectionScore.value >= bonusThreshold.value ? bonusValue.value : 0
  })

  const upperSectionTotal = computed(() => {
    return upperSectionScore.value + upperSectionBonus.value
  })

  const lowerSectionScore = computed(() => {
    return categoryIds.value
      .filter(id => !upperSectionIds.includes(id))
      .reduce((sum, id) => {
        const val = categories.value[id]
        return sum + (val ?? 0)
      }, 0)
  })

  const totalScore = computed(() => {
    return upperSectionTotal.value + lowerSectionScore.value
  })

  const allCategoriesScored = computed(() => {
    return categoryIds.value.every(id =>
      categories.value[id] !== null && categories.value[id] !== undefined
    )
  })

  const scoredCount = computed(() => {
    return categoryIds.value.filter(id =>
      categories.value[id] !== null && categories.value[id] !== undefined
    ).length
  })

  function load() {
    const data = loadFromStorage<KniffelState>(STORAGE_KEY)
    if (!data) return
    variant.value = data.variant ?? null
    categories.value = data.categories ?? {}
  }

  function save() {
    saveToStorage<KniffelState>(STORAGE_KEY, {
      variant: variant.value,
      categories: categories.value
    })
  }

  function selectVariant(v: KniffelVariant) {
    variant.value = v
    categories.value = {}
    save()
  }

  function scoreCategory(id: string, value: number) {
    if (!categoryIds.value.includes(id)) return
    if (categories.value[id] !== null && categories.value[id] !== undefined) return

    categories.value = {
      ...categories.value,
      [id]: Math.max(0, Math.floor(value))
    }
    save()
  }

  function removeScore(id: string) {
    if (!categoryIds.value.includes(id)) return
    categories.value = {
      ...categories.value,
      [id]: null
    }
    save()
  }

  function reset() {
    variant.value = null
    categories.value = {}
    save()
  }

  function getFixedPoints(categoryId: string): number | null {
    const isExtrem = variant.value === 'extrem'

    // Check Extrem-specific overrides first
    if (isExtrem && EXTREM_FIXED_POINTS_OVERRIDES[categoryId] !== undefined) {
      return EXTREM_FIXED_POINTS_OVERRIDES[categoryId]
    }

    // Then check general fixed points
    if (CATEGORY_FIXED_POINTS[categoryId] !== undefined) {
      return CATEGORY_FIXED_POINTS[categoryId]
    }

    return null
  }

  const bonusThreshold = computed(() => (variant.value === 'extrem' ? 73 : 63))
  const bonusValue = computed(() => (variant.value === 'extrem' ? 45 : 35))

  return {
    variant,
    categoryList,
    upperSectionScore,
    upperSectionBonus,
    upperSectionTotal,
    lowerSectionScore,
    totalScore,
    allCategoriesScored,
    scoredCount,
    bonusThreshold,
    bonusValue,
    load,
    selectVariant,
    scoreCategory,
    removeScore,
    reset,
    getFixedPoints
  }
}
