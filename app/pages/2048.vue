<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { GridSize } from '~/composables/use2048'

const { t } = useI18n()

useSeoMeta({ title: () => t('2048.title') })

const { gridSize, score, bestScore, status, flatGrid, newGame, move, continueGame, resetToIdle, load } = use2048()

// ── touch handling ───────────────────────────────────────────────────────────

let touchStartX = 0
let touchStartY = 0

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0]!.clientX
  touchStartY = e.touches[0]!.clientY
}

function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0]!.clientX - touchStartX
  const dy = e.changedTouches[0]!.clientY - touchStartY
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left')
  } else {
    move(dy > 0 ? 'down' : 'up')
  }
}

// ── keyboard handling ────────────────────────────────────────────────────────

const ARROW_DIRS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right'
}

function onKeyDown(e: KeyboardEvent) {
  const dir = ARROW_DIRS[e.key]
  if (!dir) return
  e.preventDefault()
  move(dir)
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

// ── tile styling ─────────────────────────────────────────────────────────────

const TILE_COLORS: Record<number, { bg: string, color: string }> = {
  2: { bg: '#eee4da', color: '#776e65' },
  4: { bg: '#ede0c8', color: '#776e65' },
  8: { bg: '#f2b179', color: '#f9f6f2' },
  16: { bg: '#f59563', color: '#f9f6f2' },
  32: { bg: '#f67c5f', color: '#f9f6f2' },
  64: { bg: '#f65e3b', color: '#f9f6f2' },
  128: { bg: '#edcf72', color: '#f9f6f2' },
  256: { bg: '#edcc61', color: '#f9f6f2' },
  512: { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' }
}

function tileStyle(value: number | undefined): Record<string, string> {
  if (!value) return { backgroundColor: '#cdc1b4' }
  const colors = TILE_COLORS[value] ?? { bg: '#3c3a32', color: '#f9f6f2' }
  return { backgroundColor: colors.bg, color: colors.color }
}

function tileTextClass(value: number): string {
  if (gridSize.value === 8) return value >= 1000 ? 'text-xs' : value >= 100 ? 'text-sm' : 'text-base'
  if (gridSize.value === 6) return value >= 1000 ? 'text-sm' : value >= 100 ? 'text-base' : 'text-lg'
  return value >= 1000 ? 'text-lg' : value >= 100 ? 'text-xl' : 'text-2xl'
}

const gridGapClass = computed(() =>
  gridSize.value === 4 ? 'gap-3' : gridSize.value === 6 ? 'gap-2' : 'gap-1'
)

// ── size picker ───────────────────────────────────────────────────────────────

const SIZE_OPTIONS: { value: GridSize, label: string }[] = [
  { value: 4, label: '4×4' },
  { value: 6, label: '6×6' },
  { value: 8, label: '8×8' }
]
</script>

<template>
  <UContainer class="py-10 px-4 max-w-lg">
    <!-- Header -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('2048.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ $t('2048.subtitle') }}
        </p>
      </div>
      <div class="flex flex-col items-end gap-2 shrink-0">
        <div class="flex gap-2">
          <div class="bg-neutral-200 dark:bg-neutral-700 rounded px-3 py-1 text-center min-w-14">
            <div class="text-xs font-semibold uppercase text-muted">
              {{ $t('2048.score') }}
            </div>
            <div class="text-lg font-bold tabular-nums">
              {{ score }}
            </div>
          </div>
          <div class="bg-neutral-200 dark:bg-neutral-700 rounded px-3 py-1 text-center min-w-14">
            <div class="text-xs font-semibold uppercase text-muted">
              {{ $t('2048.best') }}
            </div>
            <div class="text-lg font-bold tabular-nums">
              {{ bestScore }}
            </div>
          </div>
        </div>
        <UButton
          v-if="status !== 'idle'"
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="newGame()"
        >
          {{ $t('2048.newGame') }}
        </UButton>
      </div>
    </div>

    <!-- Setup: grid size picker -->
    <div
      v-if="status === 'idle'"
      class="text-center space-y-6 py-8"
    >
      <p class="text-muted">
        {{ $t('2048.chooseSize') }}
      </p>
      <div class="flex justify-center gap-3">
        <UButton
          v-for="opt in SIZE_OPTIONS"
          :key="opt.value"
          size="lg"
          color="primary"
          variant="outline"
          @click="newGame(opt.value)"
        >
          {{ opt.label }}
        </UButton>
      </div>
    </div>

    <!-- Game board -->
    <div
      v-else
      class="relative select-none"
    >
      <div
        class="rounded-xl p-2 bg-[#bbada0]"
        style="touch-action: none"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <div
          class="grid"
          :class="gridGapClass"
          :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }"
        >
          <div
            v-for="(tile, i) in flatGrid"
            :key="tile ? tile.id : `empty-${i}`"
            class="rounded-lg flex items-center justify-center font-bold aspect-square transition-colors duration-100"
            :class="tile ? tileTextClass(tile.value) : ''"
            :style="tileStyle(tile?.value)"
          >
            {{ tile?.value ?? '' }}
          </div>
        </div>
      </div>

      <!-- Win overlay -->
      <Transition name="overlay">
        <div
          v-if="status === 'won'"
          class="absolute inset-0 rounded-xl bg-amber-400/85 flex flex-col items-center justify-center gap-4"
        >
          <p class="text-3xl font-bold text-white drop-shadow">
            {{ $t('2048.wonTitle') }}
          </p>
          <p class="text-white/90 text-sm">
            {{ $t('2048.wonMessage') }}
          </p>
          <div class="flex gap-3">
            <UButton
              color="primary"
              @click="continueGame()"
            >
              {{ $t('2048.keepGoing') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="newGame()"
            >
              {{ $t('2048.newGame') }}
            </UButton>
          </div>
        </div>
      </Transition>

      <!-- Game over overlay -->
      <Transition name="overlay">
        <div
          v-if="status === 'over'"
          class="absolute inset-0 rounded-xl bg-neutral-800/80 flex flex-col items-center justify-center gap-4"
        >
          <p class="text-3xl font-bold text-white drop-shadow">
            {{ $t('2048.overTitle') }}
          </p>
          <p class="text-white/80 text-sm">
            {{ $t('2048.overMessage') }}
          </p>
          <div class="flex gap-3">
            <UButton
              color="primary"
              @click="newGame()"
            >
              {{ $t('2048.tryAgain') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="resetToIdle()"
            >
              {{ $t('2048.changeSize') }}
            </UButton>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Keyboard hint -->
    <p
      v-if="status === 'playing'"
      class="mt-4 text-center text-xs text-muted"
    >
      {{ $t('2048.keyboardHint') }}
    </p>
  </UContainer>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
