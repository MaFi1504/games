<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { Difficulty } from '~/composables/useMinesweeper'

const { t } = useI18n()

useSeoMeta({ title: () => t('minesweeper.title') })

const {
  board,
  status,
  difficulty,
  elapsedSeconds,
  remainingMines,
  newGame,
  resetToIdle,
  reveal,
  toggleFlag,
  chord,
  load
} = useMinesweeper()

// ── difficulty selection ─────────────────────────────────────────────────────

const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

// ── input handling ────────────────────────────────────────────────────────────

function onCellClick(row: number, col: number) {
  reveal(row, col)
}

function onCellRightClick(e: MouseEvent, row: number, col: number) {
  e.preventDefault()
  toggleFlag(row, col)
}

function onCellDblClick(row: number, col: number) {
  chord(row, col)
}

// Long-press for touch flagging
let longPressTimer: ReturnType<typeof setTimeout> | null = null

function onTouchStart(_e: TouchEvent, row: number, col: number) {
  longPressTimer = setTimeout(() => {
    toggleFlag(row, col)
    longPressTimer = null
  }, 400)
}

function clearLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

// ── lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  load()
})

onUnmounted(() => {
  clearLongPress()
})

// ── display helpers ───────────────────────────────────────────────────────────

const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-600 dark:text-blue-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-red-600 dark:text-red-400',
  4: 'text-purple-700 dark:text-purple-400',
  5: 'text-red-800 dark:text-red-300',
  6: 'text-teal-600 dark:text-teal-400',
  7: 'text-black dark:text-white',
  8: 'text-gray-500 dark:text-gray-400'
}

type Cell = { isMine: boolean, isRevealed: boolean, isFlagged: boolean, adjacentMines: number }

function cellLabel(cell: Cell): string {
  if (!cell.isRevealed) return cell.isFlagged ? '🚩' : ''
  if (cell.isMine) return '💣'
  return cell.adjacentMines > 0 ? String(cell.adjacentMines) : ''
}

function cellClass(cell: Cell): string {
  const base = 'flex items-center justify-center w-8 h-8 text-sm font-bold select-none border transition-colors'

  if (!cell.isRevealed) {
    const interactive = (status.value === 'playing' || status.value === 'idle')
      ? 'hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer active:scale-95'
      : 'cursor-default'
    return `${base} bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 ${interactive}`
  }

  if (cell.isMine) {
    return `${base} bg-red-500 dark:bg-red-700 border-red-600`
  }

  const numColor = cell.adjacentMines > 0 ? (NUMBER_COLORS[cell.adjacentMines] ?? '') : ''
  return `${base} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${numColor}`
}

function formattedTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const colCount = computed(() => board.value[0]?.length ?? 0)
</script>

<template>
  <UContainer class="py-8 px-4">
    <!-- Header -->
    <div class="mb-6 text-center">
      <NuxtLink
        to="/"
        class="text-sm text-muted hover:text-primary mb-3 inline-block transition-colors"
      >
        ← {{ $t('nav.back') }}
      </NuxtLink>
      <h1 class="text-3xl font-bold mb-1">
        {{ $t('minesweeper.title') }}
      </h1>
      <p class="text-muted text-sm">
        {{ $t('minesweeper.subtitle') }}
      </p>
    </div>

    <!-- Difficulty picker -->
    <div
      v-if="board.length === 0"
      class="max-w-sm mx-auto"
    >
      <p class="text-center text-muted mb-4">
        {{ $t('minesweeper.chooseDifficulty') }}
      </p>
      <div class="flex flex-col gap-3">
        <UButton
          v-for="diff in difficulties"
          :key="diff"
          block
          size="lg"
          variant="outline"
          @click="newGame(diff)"
        >
          {{ $t(`minesweeper.${diff}`) }}
          <span class="ml-2 text-muted text-xs">
            ({{ $t(`minesweeper.${diff}Config`) }})
          </span>
        </UButton>
      </div>
    </div>

    <!-- Active game -->
    <template v-else>
      <!-- Stats bar -->
      <div class="flex items-center justify-between max-w-fit mx-auto mb-4 gap-6">
        <div class="flex items-center gap-1 text-sm font-mono">
          <span aria-hidden="true">💣</span>
          <span class="font-bold">{{ remainingMines }}</span>
        </div>

        <UButton
          size="sm"
          variant="outline"
          @click="newGame(difficulty)"
        >
          {{ $t('minesweeper.newGame') }}
        </UButton>

        <div class="flex items-center gap-1 text-sm font-mono">
          <span aria-hidden="true">⏱</span>
          <span class="font-bold">{{ formattedTime(elapsedSeconds) }}</span>
        </div>
      </div>

      <!-- Board -->
      <div
        class="overflow-x-auto flex justify-center"
        @contextmenu.prevent
      >
        <div
          class="inline-grid gap-px bg-gray-300 dark:bg-gray-600 border border-gray-300 dark:border-gray-600"
          :style="{ gridTemplateColumns: `repeat(${colCount}, 2rem)` }"
        >
          <template
            v-for="(row, ri) in board"
            :key="ri"
          >
            <button
              v-for="(cell, ci) in row"
              :key="ci"
              :class="cellClass(cell)"
              :aria-label="`${$t('minesweeper.cell')} ${ri + 1}-${ci + 1}`"
              @click="onCellClick(ri, ci)"
              @contextmenu.prevent="onCellRightClick($event, ri, ci)"
              @dblclick="onCellDblClick(ri, ci)"
              @touchstart.passive="onTouchStart($event, ri, ci)"
              @touchend.passive="clearLongPress()"
              @touchmove.passive="clearLongPress()"
            >
              {{ cellLabel(cell) }}
            </button>
          </template>
        </div>
      </div>

      <!-- Won overlay -->
      <UCard
        v-if="status === 'won'"
        class="max-w-sm mx-auto mt-6 text-center"
      >
        <div class="text-4xl mb-2">
          🎉
        </div>
        <h2 class="text-xl font-bold mb-1">
          {{ $t('minesweeper.wonTitle') }}
        </h2>
        <p class="text-muted text-sm mb-4">
          {{ $t('minesweeper.wonMessage', { time: formattedTime(elapsedSeconds) }) }}
        </p>
        <div class="flex gap-2 justify-center">
          <UButton
            variant="outline"
            @click="newGame(difficulty)"
          >
            {{ $t('minesweeper.playAgain') }}
          </UButton>
          <UButton
            variant="outline"
            @click="resetToIdle()"
          >
            {{ $t('minesweeper.changeDifficulty') }}
          </UButton>
        </div>
      </UCard>

      <!-- Game over overlay -->
      <UCard
        v-if="status === 'over'"
        class="max-w-sm mx-auto mt-6 text-center"
      >
        <div class="text-4xl mb-2">
          💥
        </div>
        <h2 class="text-xl font-bold mb-1">
          {{ $t('minesweeper.overTitle') }}
        </h2>
        <p class="text-muted text-sm mb-4">
          {{ $t('minesweeper.overMessage') }}
        </p>
        <div class="flex gap-2 justify-center">
          <UButton
            variant="outline"
            @click="newGame(difficulty)"
          >
            {{ $t('minesweeper.tryAgain') }}
          </UButton>
          <UButton
            variant="outline"
            @click="resetToIdle()"
          >
            {{ $t('minesweeper.changeDifficulty') }}
          </UButton>
        </div>
      </UCard>

      <!-- Hint bar -->
      <p
        v-if="status === 'playing' || status === 'idle'"
        class="text-center text-xs text-muted mt-4"
      >
        {{ $t('minesweeper.hint') }}
      </p>

      <!-- Change difficulty during play -->
      <div
        v-if="status === 'playing'"
        class="text-center mt-2"
      >
        <UButton
          size="xs"
          variant="ghost"
          @click="resetToIdle()"
        >
          {{ $t('minesweeper.changeDifficulty') }}
        </UButton>
      </div>
    </template>
  </UContainer>
</template>
