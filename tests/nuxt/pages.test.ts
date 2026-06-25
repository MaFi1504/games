import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import Phase10Page from '../../app/pages/sheets/phase10.vue'
import SheetsIndexPage from '../../app/pages/sheets/index.vue'
import IndexPage from '../../app/pages/index.vue'
import NotizblockPage from '../../app/pages/sheets/notizblock.vue'
import KniffelPage from '../../app/pages/sheets/kniffel.vue'

// Mutable module-level refs so individual tests can override state
// without calling mockNuxtImport again (which causes hoisting issues)
const mockCompletedPhases = ref<number[]>([])
const mockScores = ref<number[]>([])
const mockPhaseSetKey = ref<'classic' | 'alt' | null>('classic')

const mockTogglePhase = vi.fn()
const mockAddScore = vi.fn()
const mockRemoveScore = vi.fn()
const mockReset = vi.fn()
const mockLoad = vi.fn()
const mockSelectPhaseSet = vi.fn()

mockNuxtImport('usePhase10', () => () => ({
  completedPhases: mockCompletedPhases,
  scores: mockScores,
  totalScore: computed(() => mockScores.value.reduce((s: number, v: number) => s + v, 0)),
  phaseSetKey: mockPhaseSetKey,
  load: mockLoad,
  selectPhaseSet: mockSelectPhaseSet,
  togglePhase: mockTogglePhase,
  addScore: mockAddScore,
  removeScore: mockRemoveScore,
  reset: mockReset
}))

const mockPlayers = ref<Array<{ id: string, name: string, entries: Array<{ id: string, points: number }> }>>([])
const mockPlayerSummaries = computed(() =>
  mockPlayers.value.map(player => ({
    ...player,
    total: player.entries.reduce((sum, entry) => sum + entry.points, 0)
  }))
)
const mockNotepadLoad = vi.fn()
const mockAddPlayer = vi.fn()
const mockRemovePlayer = vi.fn()
const mockAddEntry = vi.fn()
const mockUpdateEntry = vi.fn()
const mockRemoveEntry = vi.fn()
const mockResetNotepad = vi.fn()

type NotizblockVm = {
  activePlayerId: string | null
  addPointsOpen: boolean
  pointsInput: string | number
  submitPointsFromKeyboard: () => void
}

// Kniffel mocks
const mockVariant = ref<'standard' | 'extrem' | null>(null)
const mockCategoryList = ref<Array<{ id: string, scored: boolean, value: number | null }>>([])
const mockKniffelUpperSectionScore = ref(0)
const mockKniffelUpperSectionBonus = ref(0)
const mockKniffelUpperSectionTotal = ref(0)
const mockKniffelLowerSectionScore = ref(0)
const mockKniffelTotalScore = ref(0)
const mockAllCategoriesScored = ref(false)
const mockScoredCount = ref(0)
const mockBonusThreshold = ref(63)
const mockKniffelLoad = vi.fn()
const mockSelectVariant = vi.fn()

const mockMpConnected = ref(false)
const mockMpConnecting = ref(false)
const mockMpRoom = ref('')
const mockMpPlayerName = ref('')
const mockMpOtherPlayers = ref<unknown[]>([])
const mockMpError = ref<string | null>(null)

mockNuxtImport('useKniffel', () => () => ({
  variant: mockVariant,
  categoryList: mockCategoryList,
  upperSectionScore: mockKniffelUpperSectionScore,
  upperSectionBonus: mockKniffelUpperSectionBonus,
  upperSectionTotal: mockKniffelUpperSectionTotal,
  lowerSectionScore: mockKniffelLowerSectionScore,
  totalScore: mockKniffelTotalScore,
  allCategoriesScored: mockAllCategoriesScored,
  scoredCount: mockScoredCount,
  bonusThreshold: mockBonusThreshold,
  bonusValue: ref(35),
  load: mockKniffelLoad,
  selectVariant: mockSelectVariant,
  scoreCategory: vi.fn(),
  removeScore: vi.fn(),
  reset: vi.fn(),
  getFixedPoints: vi.fn().mockReturnValue(null)
}))

mockNuxtImport('useKniffelMultiplayer', () => () => ({
  roomCode: mockMpRoom,
  playerName: mockMpPlayerName,
  connected: mockMpConnected,
  connecting: mockMpConnecting,
  otherPlayers: mockMpOtherPlayers,
  connectionError: mockMpError,
  connect: vi.fn(),
  sendUpdate: vi.fn(),
  close: vi.fn()
}))

mockNuxtImport('useGameHistory', () => () => ({
  phase10History: ref([]),
  kniffelHistory: ref([]),
  init: vi.fn(),
  savePhase10Game: vi.fn(),
  saveKniffelGame: vi.fn(),
  clearPhase10History: vi.fn(),
  clearKniffelHistory: vi.fn()
}))

mockNuxtImport('useNotepad', () => () => ({
  players: mockPlayers,
  playerSummaries: mockPlayerSummaries,
  load: mockNotepadLoad,
  addPlayer: mockAddPlayer,
  removePlayer: mockRemovePlayer,
  addEntry: mockAddEntry,
  updateEntry: mockUpdateEntry,
  removeEntry: mockRemoveEntry,
  reset: mockResetNotepad
}))

describe('Phase10 page', () => {
  beforeEach(() => {
    mockCompletedPhases.value = []
    mockScores.value = []
    mockPhaseSetKey.value = 'classic'
    vi.clearAllMocks()
  })

  it('renders the page title', async () => {
    const wrapper = await mountSuspended(Phase10Page)
    expect(wrapper.text()).toContain('Phase 10')
  })

  it('shows total score of 0 initially', async () => {
    const wrapper = await mountSuspended(Phase10Page)
    expect(wrapper.text()).toContain('0')
  })

  it('shows phases completed as 0/10', async () => {
    const wrapper = await mountSuspended(Phase10Page)
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain('/10')
  })

  it('renders 10 phase rows', async () => {
    const wrapper = await mountSuspended(Phase10Page)
    const phases = wrapper.findAll('[data-testid="phase-list"] button[type="button"]')
    expect(phases.length).toBe(10)
  })

  it('calls load on mount', async () => {
    mockLoad.mockClear()
    await mountSuspended(Phase10Page)
    expect(mockLoad).toHaveBeenCalledOnce()
  })

  it('calls togglePhase when a phase row is clicked', async () => {
    mockTogglePhase.mockClear()
    const wrapper = await mountSuspended(Phase10Page)
    const firstPhase = wrapper.findAll('[data-testid="phase-list"] button[type="button"]')[0]!
    await firstPhase.trigger('click')
    expect(mockTogglePhase).toHaveBeenCalledWith(1)
  })

  it('shows win banner when all phases completed', async () => {
    mockCompletedPhases.value = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const wrapper = await mountSuspended(Phase10Page)
    expect(wrapper.text()).toMatch(/all phases completed/i)
  })

  it('shows round history when there are scores', async () => {
    mockScores.value = [15, 30]
    const wrapper = await mountSuspended(Phase10Page)
    expect(wrapper.text()).toContain('45')
  })
})

describe('Sheets Index page', () => {
  it('renders the sheets title', async () => {
    const wrapper = await mountSuspended(SheetsIndexPage)
    expect(wrapper.text()).toContain('Game Sheets')
  })

  it('renders the Phase 10 game card', async () => {
    const wrapper = await mountSuspended(SheetsIndexPage)
    expect(wrapper.text()).toContain('Phase 10')
  })

  it('Phase 10 card links to /sheets/phase10', async () => {
    const wrapper = await mountSuspended(SheetsIndexPage)
    const link = wrapper.find('a[href="/sheets/phase10"]')
    expect(link.exists()).toBe(true)
  })

  it('renders the Notepad game card', async () => {
    const wrapper = await mountSuspended(SheetsIndexPage)
    expect(wrapper.text()).toContain('Notepad')
  })

  it('Notepad card links to /sheets/notizblock', async () => {
    const wrapper = await mountSuspended(SheetsIndexPage)
    const link = wrapper.find('a[href="/sheets/notizblock"]')
    expect(link.exists()).toBe(true)
  })
})

describe('Index page', () => {
  it('renders the app title', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.text()).toContain('Games')
  })

  it('renders the Game Sheets app card', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.text()).toContain('Game Sheets')
  })

  it('Game Sheets card links to /sheets', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const link = wrapper.find('a[href="/sheets"]')
    expect(link.exists()).toBe(true)
  })
})

describe('Notizblock page', () => {
  beforeEach(() => {
    mockPlayers.value = []
    vi.clearAllMocks()
  })

  it('renders the page title', async () => {
    const wrapper = await mountSuspended(NotizblockPage)
    expect(wrapper.text()).toContain('Notepad')
  })

  it('calls load on mount', async () => {
    await mountSuspended(NotizblockPage)
    expect(mockNotepadLoad).toHaveBeenCalledOnce()
  })

  it('shows existing player totals', async () => {
    mockPlayers.value = [
      {
        id: 'p1',
        name: 'Alex',
        entries: [
          { id: 'e1', points: 10 },
          { id: 'e2', points: 5 }
        ]
      }
    ]

    const wrapper = await mountSuspended(NotizblockPage)
    expect(wrapper.text()).toContain('Alex')
    expect(wrapper.text()).toContain('15')
  })

  it('opens add-points for the clicked player when multiple players exist', async () => {
    mockPlayers.value = [
      { id: 'p1', name: 'Alex', entries: [] },
      { id: 'p2', name: 'Chris', entries: [] }
    ]

    const wrapper = await mountSuspended(NotizblockPage)
    const vm = wrapper.vm as unknown as NotizblockVm
    const nameButtons = wrapper.findAll('button[type="button"]')
      .filter(button => button.text().includes('Tap name to add points'))

    expect(nameButtons.length).toBe(2)
    await nameButtons[0]!.trigger('click')

    expect(vm.activePlayerId).toBe('p1')
    expect(vm.addPointsOpen).toBe(true)
  })

  it('keeps add-points modal open when submitting with Enter', async () => {
    mockPlayers.value = [
      { id: 'p1', name: 'Alex', entries: [] }
    ]

    const wrapper = await mountSuspended(NotizblockPage)
    const vm = wrapper.vm as unknown as NotizblockVm

    const nameButton = wrapper.findAll('button[type="button"]')
      .find(button => button.text().includes('Tap name to add points'))
    expect(nameButton?.exists()).toBe(true)

    await nameButton!.trigger('click')

    vm.pointsInput = '12'
    vm.submitPointsFromKeyboard()

    expect(mockAddEntry).toHaveBeenCalledWith('p1', 12)
    expect(vm.addPointsOpen).toBe(true)
    expect(vm.pointsInput).toBe('')
  })

  it('accepts numeric input model values without throwing', async () => {
    mockPlayers.value = [
      { id: 'p1', name: 'Alex', entries: [] }
    ]

    const wrapper = await mountSuspended(NotizblockPage)
    const vm = wrapper.vm as NotizblockVm

    const nameButton = wrapper.findAll('button[type="button"]')
      .find(button => button.text().includes('Tap name to add points'))
    expect(nameButton?.exists()).toBe(true)

    await nameButton!.trigger('click')

    vm.pointsInput = 9
    vm.submitPointsFromKeyboard()

    expect(mockAddEntry).toHaveBeenCalledWith('p1', 9)
    expect(vm.pointsInput).toBe('')
  })
})

describe('Kniffel page', () => {
  beforeEach(() => {
    mockVariant.value = null
    mockCategoryList.value = []
    mockKniffelTotalScore.value = 0
    mockScoredCount.value = 0
    mockAllCategoriesScored.value = false
    mockMpConnected.value = false
    vi.clearAllMocks()
  })

  it('renders the page title', async () => {
    const wrapper = await mountSuspended(KniffelPage)
    expect(wrapper.text()).toContain('Kniffel')
  })

  it('calls load on mount', async () => {
    await mountSuspended(KniffelPage)
    expect(mockKniffelLoad).toHaveBeenCalledOnce()
  })

  it('shows variant selection when no variant is set', async () => {
    const wrapper = await mountSuspended(KniffelPage)
    expect(wrapper.text()).toContain('Standard')
    expect(wrapper.text()).toContain('Extrem')
  })

  it('calls selectVariant with "standard" when standard button is clicked', async () => {
    const wrapper = await mountSuspended(KniffelPage)
    const buttons = wrapper.findAll('button[type="button"]')
    const standardButton = buttons.find(b => b.text().includes('Standard'))
    expect(standardButton?.exists()).toBe(true)
    await standardButton!.trigger('click')
    expect(mockSelectVariant).toHaveBeenCalledWith('standard')
  })

  it('calls selectVariant with "extrem" when extrem button is clicked', async () => {
    const wrapper = await mountSuspended(KniffelPage)
    const buttons = wrapper.findAll('button[type="button"]')
    const extremButton = buttons.find(b => b.text().includes('Extrem'))
    expect(extremButton?.exists()).toBe(true)
    await extremButton!.trigger('click')
    expect(mockSelectVariant).toHaveBeenCalledWith('extrem')
  })

  it('shows score summary once a variant is selected', async () => {
    mockVariant.value = 'standard'
    mockKniffelTotalScore.value = 0
    mockScoredCount.value = 0
    mockCategoryList.value = [{ id: 'ones', scored: false, value: null }]
    const wrapper = await mountSuspended(KniffelPage)
    expect(wrapper.text()).toContain('Total Score')
  })

  it('shows win banner when all categories are scored', async () => {
    mockVariant.value = 'standard'
    mockAllCategoriesScored.value = true
    mockCategoryList.value = [{ id: 'ones', scored: true, value: 3 }]
    const wrapper = await mountSuspended(KniffelPage)
    expect(wrapper.text()).toMatch(/game complete/i)
  })

  it('displays total score', async () => {
    mockVariant.value = 'standard'
    mockKniffelTotalScore.value = 287
    mockCategoryList.value = [{ id: 'ones', scored: false, value: null }]
    const wrapper = await mountSuspended(KniffelPage)
    expect(wrapper.text()).toContain('287')
  })

  it('shows scored count', async () => {
    mockVariant.value = 'standard'
    mockScoredCount.value = 5
    mockCategoryList.value = Array.from({ length: 13 }, (_, i) => ({
      id: `cat${i}`,
      scored: i < 5,
      value: i < 5 ? 10 : null
    }))
    const wrapper = await mountSuspended(KniffelPage)
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('/13')
  })
})
