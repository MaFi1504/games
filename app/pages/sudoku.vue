<template>
  <UContainer class="py-10 px-4 max-w-2xl">
    <!-- Header -->
    <div class="mb-6 text-center">
      <h1 class="text-3xl font-bold mb-1">
        {{ $t('sudoku.title') }}
      </h1>
      <p class="text-muted text-sm">
        {{ $t('sudoku.subtitle') }}
      </p>
      <p class="text-2xl font-mono font-semibold mt-2 tracking-widest tabular-nums">
        {{ formattedTime }}
      </p>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-center justify-center gap-3 mb-6">
      <UButtonGroup>
        <UButton
          v-for="d in difficulties"
          :key="d.value"
          :variant="difficulty === d.value ? 'solid' : 'outline'"
          color="primary"
          size="sm"
          :disabled="isGenerating"
          @click="generate(d.value)"
        >
          {{ d.label }}
        </UButton>
      </UButtonGroup>

      <UButton
        variant="outline"
        color="neutral"
        size="sm"
        icon="i-lucide-refresh-cw"
        :disabled="isGenerating"
        @click="generate(difficulty)"
      >
        {{ $t('sudoku.newPuzzle') }}
      </UButton>

      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-lucide-rotate-ccw"
        :disabled="isGenerating"
        @click="reset"
      >
        {{ $t('sudoku.reset') }}
      </UButton>

      <UButton
        :variant="noFeedback ? 'solid' : 'outline'"
        color="neutral"
        size="sm"
        icon="i-lucide-eye-off"
        :disabled="isGenerating"
        @click="noFeedback = !noFeedback"
      >
        {{ $t('sudoku.noFeedback') }}
      </UButton>

      <UButton
        :variant="visualize ? 'solid' : 'outline'"
        color="neutral"
        size="sm"
        icon="i-lucide-film"
        :disabled="isGenerating"
        @click="visualize = !visualize"
      >
        {{ $t('sudoku.animateCreation') }}
      </UButton>

      <UButton
        :variant="isPaused ? 'solid' : 'outline'"
        :color="isPaused ? 'primary' : 'neutral'"
        size="sm"
        :icon="isPaused ? 'i-lucide-play' : 'i-lucide-pause'"
        :disabled="isGenerating || isSolved"
        @click="togglePause"
      >
        {{ isPaused ? $t('sudoku.resume') : $t('sudoku.pause') }}
      </UButton>

      <UButton
        :variant="isNoteMode ? 'solid' : 'outline'"
        :color="isNoteMode ? 'primary' : 'neutral'"
        size="sm"
        icon="i-lucide-pencil"
        :disabled="isGenerating || isSolved"
        @click="isNoteMode = !isNoteMode"
      >
        {{ $t('sudoku.noteMode') }}
      </UButton>
    </div>

    <p
      v-if="isGenerating && visualize && generationPhase"
      class="text-center text-sm text-muted mb-4"
    >
      {{ $t('sudoku.phase.' + generationPhase) }}
    </p>

    <!-- Solved banner -->
    <UAlert
      v-if="isSolved && !isGenerating"
      icon="i-lucide-party-popper"
      color="success"
      variant="soft"
      class="mb-4"
      :title="$t('sudoku.solved')"
    />

    <!-- Grid -->
    <div
      class="relative mx-auto"
      :style="{ width: `${gridPx}px`, height: `${gridPx}px` }"
    >
      <div
        v-if="isGenerating && !visualize"
        class="absolute inset-0 flex items-center justify-center bg-background/60 rounded z-10"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin text-primary text-3xl"
        />
      </div>

      <!-- Pause overlay -->
      <div
        v-if="isPaused"
        class="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md bg-background/30 rounded z-10 cursor-pointer"
        @click="togglePause"
      >
        <UIcon
          name="i-lucide-play"
          class="text-5xl text-primary mb-2"
        />
        <span class="text-sm font-semibold text-muted">{{ $t('sudoku.resume') }}</span>
      </div>

      <div
        class="grid border-4 border-default rounded overflow-hidden select-none"
        style="grid-template-columns: repeat(9, 1fr); grid-template-rows: repeat(9, 1fr);"
        :style="{ width: `${gridPx}px`, height: `${gridPx}px` }"
      >
        <template
          v-for="(row, r) in activeGrid"
          :key="r"
        >
          <div
            v-for="(cell, c) in row"
            :key="`${r}-${c}`"
            class="text-lg font-semibold cursor-pointer transition-colors relative"
            :class="[
              ...cellClass(r, c),
              activeNotes(r, c).length > 0 && activeGrid[r]![c] === null
                ? 'p-0.5'
                : 'flex items-center justify-center'
            ]"
            :style="cellBorderStyle(r, c)"
            @click="selectCell(r, c)"
          >
            <div
              v-if="activeNotes(r, c).length > 0 && activeGrid[r]![c] === null"
              class="grid grid-cols-3 w-full h-full"
            >
              <span
                v-for="n in 9"
                :key="n"
                class="text-[8px] leading-none text-center flex items-center justify-center font-medium"
                :class="activeNotes(r, c).includes(n) ? 'text-primary/80' : 'invisible'"
              >
                {{ n }}
              </span>
            </div>
            <template v-else>
              {{ activeGrid[r]![c] ?? '' }}
            </template>
          </div>
        </template>
      </div>
    </div>

    <!-- Number pad -->
    <div class="flex flex-wrap justify-center gap-2 mt-6">
      <UButton
        v-for="n in 9"
        :key="n"
        variant="outline"
        color="neutral"
        class="w-10 h-10 text-base font-bold transition-all duration-300"
        :class="{ 'animate-pulse-complete': justCompleted === n }"
        :disabled="isGenerating || isPaused || completedNumbers.has(n)"
        :opacity="completedNumbers.has(n) ? 'opacity-40' : 'opacity-100'"
        @click="enterDigit(n)"
      >
        {{ n }}
      </UButton>
      <UButton
        variant="ghost"
        color="neutral"
        class="w-10 h-10"
        icon="i-lucide-delete"
        :disabled="isGenerating || isPaused"
        @click="enterDigit(null)"
      />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { Difficulty } from '~/composables/useSudoku'

const { t } = useI18n()
useSeoMeta({ title: () => t('sudoku.title') })

const {
  playerGrid,
  difficulty,
  isGenerating,
  visualize,
  visualGrid,
  generationPhase,
  isSolved,
  cellStates,
  completedNumbers,
  noFeedback,
  elapsed,
  isPaused,
  noteGrid,
  isNoteMode,
  generate,
  setCell,
  reset,
  pauseTimer,
  resumeTimer
} = useSudoku()

// Grid size in px – responsive via JS so we can compute borders
const gridPx = 360

/** Format elapsed seconds as MM:SS */
const formattedTime = computed(() => {
  const m = Math.floor(elapsed.value / 60)
  const s = elapsed.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function togglePause() {
  if (isPaused.value) resumeTimer()
  else pauseTimer()
}

/** Show the working grid during animated generation, player grid otherwise */
const activeGrid = computed(() =>
  isGenerating.value && visualize.value ? visualGrid.value : playerGrid.value
)

/** Returns the notes for a cell, or empty array during animated generation */
function activeNotes(r: number, c: number): number[] {
  if (isGenerating.value && visualize.value) return []
  return (noteGrid.value[r]![c] ?? []) as number[]
}

const difficulties: { value: Difficulty, label: string }[] = [
  { value: 'easy', label: t('sudoku.easy') },
  { value: 'medium', label: t('sudoku.medium') },
  { value: 'hard', label: t('sudoku.hard') }
]

// Selected cell
const selected = ref<[number, number] | null>(null)

// Track newly completed numbers for animation
const justCompleted = ref<number | null>(null)
const previousCompleted = ref(new Set<number>())

watch(completedNumbers, (newCompleted) => {
  // Find which numbers are newly completed
  for (const num of newCompleted) {
    if (!previousCompleted.value.has(num)) {
      justCompleted.value = num
      setTimeout(() => {
        if (justCompleted.value === num) {
          justCompleted.value = null
        }
      }, 600)
      break
    }
  }
  previousCompleted.value = new Set(newCompleted)
}, { immediate: true })

function selectCell(r: number, c: number) {
  if (isGenerating.value || isPaused.value) return
  selected.value = [r, c]
}

function enterDigit(n: number | null) {
  if (!selected.value) return
  const [r, c] = selected.value
  setCell(r, c, n)
}

// Keyboard input
onMounted(() => {
  window.addEventListener('keydown', onKey)
  generate('easy')
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})

function onKey(e: KeyboardEvent) {
  if (isPaused.value) return
  if (e.key >= '1' && e.key <= '9') enterDigit(Number(e.key))
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enterDigit(null)
  else if (e.key === 'ArrowUp' && selected.value) selected.value = [Math.max(0, selected.value[0] - 1), selected.value[1]]
  else if (e.key === 'ArrowDown' && selected.value) selected.value = [Math.min(8, selected.value[0] + 1), selected.value[1]]
  else if (e.key === 'ArrowLeft' && selected.value) selected.value = [selected.value[0], Math.max(0, selected.value[1] - 1)]
  else if (e.key === 'ArrowRight' && selected.value) selected.value = [selected.value[0], Math.min(8, selected.value[1] + 1)]
}

function cellClass(r: number, c: number): string[] {
  // During animated generation show a neutral style – no puzzle state yet
  if (isGenerating.value && visualize.value) {
    return [activeGrid.value[r]![c] !== null ? 'text-muted' : '']
  }

  const state = cellStates.value[r][c]
  const isSelected = selected.value?.[0] === r && selected.value?.[1] === c
  const isSameBox = selected.value
    ? Math.floor(selected.value[0] / 3) === Math.floor(r / 3) && Math.floor(selected.value[1] / 3) === Math.floor(c / 3)
    : false
  const isSameRowCol = selected.value
    ? selected.value[0] === r || selected.value[1] === c
    : false

  // Highlight cells with the same number as the selected cell
  const selectedNumber = selected.value
    ? activeGrid.value[selected.value[0]]![selected.value[1]]
    : null
  const hasSameNumber = selectedNumber !== null && activeGrid.value[r]![c] === selectedNumber && !isSelected

  // Highlight cells from just-completed number
  const hasJustCompletedNumber = justCompleted.value !== null && activeGrid.value[r]![c] === justCompleted.value

  const classes: string[] = []

  if (isSelected) classes.push('bg-primary/20 ring-2 ring-inset ring-primary')
  else if (hasJustCompletedNumber) classes.push('bg-success/20 ring-2 ring-inset ring-success animate-pulse')
  else if (hasSameNumber) classes.push('bg-primary/10')
  else if (isSameRowCol || isSameBox) classes.push('bg-muted/60')
  else classes.push('hover:bg-muted/20')

  if (state === 'clue') {
    classes.push('text-muted/60 bg-muted/15 cursor-not-allowed font-bold')
  } else if (state === 'correct') {
    classes.push('text-success')
  } else if (state === 'wrong') {
    classes.push('text-error')
  } else if (activeGrid.value[r]![c] === null) {
    classes.push('text-primary')
  }
  // else: cell has a value but noFeedback suppresses colour – inherit neutral text

  return classes
}

/** Add thicker borders between 3×3 boxes */
function cellBorderStyle(r: number, c: number): Record<string, string> {
  return {
    borderTop: r % 3 === 0 && r !== 0 ? '4px solid var(--ui-border-accented)' : '2px solid var(--ui-border)',
    borderLeft: c % 3 === 0 && c !== 0 ? '4px solid var(--ui-border-accented)' : '2px solid var(--ui-border)',
    borderBottom: '0',
    borderRight: '0'
  }
}
</script>

<style scoped>
@keyframes pulse-complete {
  0%, 100% {
    transform: scale(1) !important;
  }
  50% {
    transform: scale(1.15) !important;
    box-shadow: 0 0 12px rgb(34 197 94 / 0.6) !important;
  }
}

:deep(.animate-pulse-complete) {
  animation: pulse-complete 0.6s ease-out !important;
}

:deep(.animate-pulse-complete:disabled) {
  animation: pulse-complete 0.6s ease-out !important;
}
</style>
