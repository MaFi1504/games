import { ref, computed } from 'vue'

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
  // Extrem
  threePairs: 35,
  twoThreeOfAKind: 45,
  largeFullHouse: 45,
  highway: 50,
  kniffelExtrem: 75,
  tenOrLess: 40,
  thirtyThreeOrMore: 40
}

// For Extrem: different fixed values for some categories
const EXTREM_FIXED_POINTS: Record<string, number | null> = {
  fullHouse: 25,
  smallStraight: 30,
  largeStraight: 40,
  kniffel: 50
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

  const upperSectionIds = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']

  const upperSectionScore = computed(() => {
    return upperSectionIds.reduce((sum, id) => {
      const val = categories.value[id]
      return sum + (val ?? 0)
    }, 0)
  })

  const upperSectionBonus = computed(() => {
    const isExtrem = variant.value === 'extrem'
    const threshold = isExtrem ? 73 : 63
    const bonus = isExtrem ? 45 : 35
    return upperSectionScore.value >= threshold ? bonus : 0
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
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: KniffelState = JSON.parse(raw)
        variant.value = data.variant ?? null
        categories.value = data.categories ?? {}
      }
    }
    catch {
      // ignore corrupt data
    }
  }

  function save() {
    if (!import.meta.client) return
    const state: KniffelState = {
      variant: variant.value,
      categories: categories.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
    if (isExtrem && EXTREM_FIXED_POINTS[categoryId] !== undefined) {
      return EXTREM_FIXED_POINTS[categoryId]
    }
    
    // Then check general fixed points
    if (CATEGORY_FIXED_POINTS[categoryId] !== undefined) {
      return CATEGORY_FIXED_POINTS[categoryId]
    }
    
    return null
  }

  const bonusThreshold = computed(() => variant.value === 'extrem' ? 73 : 63)
  const bonusValue = computed(() => variant.value === 'extrem' ? 45 : 35)

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
