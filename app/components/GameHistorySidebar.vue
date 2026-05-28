<script setup lang="ts">
import { useGameHistory, type Phase10HistoryEntry, type KniffelHistoryEntry, type SudokuHistoryEntry } from '~/composables/useGameHistory'

const { locale, t } = useI18n()
const route = useRoute()
const { phase10History, kniffelHistory, sudokuHistory, init, clearPhase10History, clearKniffelHistory, clearSudokuHistory } = useGameHistory()

onMounted(init)

const isPhase10 = computed(() => route.path === '/sheets/phase10')
const isKniffel = computed(() => route.path === '/sheets/kniffel')
const isSudoku = computed(() => route.path === '/sudoku')

interface HistoryGroup {
  key: string
  label: string
  avgScore: number
  entries: (Phase10HistoryEntry | KniffelHistoryEntry)[]
}

const groupedHistory = computed((): HistoryGroup[] => {
  if (isPhase10.value) {
    const map = new Map<string, Phase10HistoryEntry[]>()
    for (const entry of phase10History.value) {
      if (!map.has(entry.phaseSetKey)) map.set(entry.phaseSetKey, [])
      map.get(entry.phaseSetKey)!.push(entry)
    }
    return [...map.entries()]
      .map(([key, entries]) => ({
        key,
        label: key === 'alt' ? t('phase10.phaseSetAltName') : t('phase10.phaseSetClassicName'),
        avgScore: Math.round(entries.reduce((s, e) => s + e.totalScore, 0) / entries.length),
        entries
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
  if (isKniffel.value) {
    const map = new Map<string, KniffelHistoryEntry[]>()
    for (const entry of kniffelHistory.value) {
      if (!map.has(entry.variant)) map.set(entry.variant, [])
      map.get(entry.variant)!.push(entry)
    }
    return [...map.entries()]
      .map(([key, entries]) => ({
        key,
        label: key === 'extrem' ? t('kniffel.variantExtrem') : t('kniffel.variantStandard'),
        avgScore: Math.round(entries.reduce((s, e) => s + e.totalScore, 0) / entries.length),
        entries
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
  return []
})

const hasHistory = computed(() => groupedHistory.value.length > 0)

interface SudokuHistoryGroup {
  difficulty: 'easy' | 'medium' | 'hard'
  label: string
  entries: SudokuHistoryEntry[]
  avgTimeSeconds: number
  solveRate: number
}

const sudokuGroupedHistory = computed((): SudokuHistoryGroup[] => {
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']
  return difficulties
    .map((diff) => {
      const entries = sudokuHistory.value.filter(e => e.difficulty === diff)
      if (entries.length === 0) return null
      const solvedEntries = entries.filter(e => e.solved)
      const avgTimeSeconds = solvedEntries.length > 0
        ? Math.round(solvedEntries.reduce((s, e) => s + e.timeSeconds, 0) / solvedEntries.length)
        : 0
      const solveRate = Math.round((solvedEntries.length / entries.length) * 100)
      return {
        difficulty: diff,
        label: t(`sudoku.${diff}`),
        entries,
        avgTimeSeconds,
        solveRate
      }
    })
    .filter((g): g is SudokuHistoryGroup => g !== null)
})

const hasSudokuHistory = computed(() => sudokuGroupedHistory.value.length > 0)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function clearActiveHistory() {
  if (isPhase10.value) clearPhase10History()
  else if (isKniffel.value) clearKniffelHistory()
  else if (isSudoku.value) clearSudokuHistory()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <p class="font-semibold text-sm uppercase tracking-wide text-muted">
        {{ $t('history.title') }}
      </p>
      <UButton
        v-if="isSudoku ? hasSudokuHistory : hasHistory"
        icon="i-lucide-trash-2"
        variant="ghost"
        color="neutral"
        size="xs"
        :aria-label="$t('history.clearHistory')"
        @click="clearActiveHistory"
      />
    </div>

    <!-- Phase 10 / Kniffel history -->
    <template v-if="isPhase10 || isKniffel">
      <div
        v-if="!hasHistory"
        class="text-sm text-muted text-center py-4"
      >
        {{ $t('history.noGames') }}
      </div>

      <div
        v-else
        class="space-y-5"
      >
        <div
          v-for="group in groupedHistory"
          :key="group.key"
        >
          <!-- Group header -->
          <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-default">
            <p class="text-sm font-semibold">
              {{ group.label }}
            </p>
            <span class="text-xs text-muted">
              {{ $t('history.avgScore') }}
              <span class="font-semibold tabular-nums text-default">{{ group.avgScore }}</span>
            </span>
          </div>

          <!-- Entries -->
          <div class="space-y-2">
            <div
              v-for="(entry, i) in group.entries"
              :key="i"
              class="rounded-lg border border-default p-3"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-muted tabular-nums">{{ formatDate(entry.date) }}</span>
                <UBadge
                  v-if="isPhase10"
                  :color="(entry as Phase10HistoryEntry).phasesCompleted === (entry as Phase10HistoryEntry).totalPhases ? 'success' : 'error'"
                  variant="subtle"
                  size="xs"
                >
                  {{ (entry as Phase10HistoryEntry).phasesCompleted === (entry as Phase10HistoryEntry).totalPhases ? $t('history.won') : $t('history.lost') }}
                </UBadge>
              </div>
              <div class="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p class="text-xs text-muted mb-0.5">
                    {{ $t('history.score') }}
                  </p>
                  <p class="text-lg font-bold tabular-nums leading-none">
                    {{ entry.totalScore }}
                  </p>
                </div>
                <div v-if="isPhase10">
                  <p class="text-xs text-muted mb-0.5">
                    {{ $t('history.phases') }}
                  </p>
                  <p class="text-lg font-bold tabular-nums leading-none">
                    {{ (entry as Phase10HistoryEntry).phasesCompleted }}<span class="text-muted text-sm">/{{ (entry as Phase10HistoryEntry).totalPhases }}</span>
                  </p>
                </div>
                <div v-else-if="isKniffel">
                  <p class="text-xs text-muted mb-0.5">
                    {{ $t('history.categories') }}
                  </p>
                  <p class="text-lg font-bold tabular-nums leading-none">
                    {{ (entry as KniffelHistoryEntry).categoriesScored }}<span class="text-muted text-sm">/{{ (entry as KniffelHistoryEntry).totalCategories }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Sudoku history -->
    <template v-else-if="isSudoku">
      <div
        v-if="!hasSudokuHistory"
        class="text-sm text-muted text-center py-4"
      >
        {{ $t('history.noGames') }}
      </div>

      <div
        v-else
        class="space-y-5"
      >
        <div
          v-for="group in sudokuGroupedHistory"
          :key="group.difficulty"
        >
          <!-- Difficulty header with stats -->
          <div class="mb-2 pb-1.5 border-b border-default">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold">
                {{ group.label }}
              </p>
              <UBadge
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ group.entries.length }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs text-muted">
                {{ $t('history.avgTime') }}
                <span class="font-semibold tabular-nums text-default">{{ formatTime(group.avgTimeSeconds) }}</span>
              </span>
              <span class="text-xs text-muted">
                {{ $t('history.solveRate') }}
                <span class="font-semibold tabular-nums text-default">{{ group.solveRate }}%</span>
              </span>
            </div>
          </div>

          <!-- Entries -->
          <div class="space-y-2">
            <div
              v-for="(entry, i) in (group.entries as SudokuHistoryEntry[])"
              :key="i"
              class="rounded-lg border border-default p-3"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-muted tabular-nums">{{ formatDate(entry.date) }}</span>
                <UBadge
                  :color="entry.solved ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ entry.solved ? $t('history.won') : $t('history.abandoned') }}
                </UBadge>
              </div>
              <div class="text-center">
                <p class="text-xs text-muted mb-0.5">
                  {{ $t('history.time') }}
                </p>
                <p class="text-lg font-bold tabular-nums leading-none font-mono">
                  {{ formatTime(entry.timeSeconds) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
