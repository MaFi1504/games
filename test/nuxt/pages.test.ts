import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import Phase10Page from '../../app/pages/phase10.vue'
import IndexPage from '../../app/pages/index.vue'
import NotizblockPage from '../../app/pages/notizblock.vue'

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

describe('Index page', () => {
  it('renders the app title', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.text()).toContain('Game Sheets')
  })

  it('renders the Phase 10 game card', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.text()).toContain('Phase 10')
  })

  it('Phase 10 card links to /phase10', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const link = wrapper.find('a[href="/phase10"]')
    expect(link.exists()).toBe(true)
  })

  it('renders the Notepad game card', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.text()).toContain('Notepad')
  })

  it('Notepad card links to /notizblock', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const link = wrapper.find('a[href="/notizblock"]')
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
    const vm = wrapper.vm as any
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
    const vm = wrapper.vm as any

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
    const vm = wrapper.vm as any

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
