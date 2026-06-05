<template>
  <div
    class="nm-sheet bg-[var(--ui-bg)] text-[var(--ui-text)]"
  >
    <!-- ── HEADER ── -->
    <div class="flex items-center gap-2 px-2 pt-2 pb-1 border-b border-[var(--ui-border)]">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="$t('nav.back')"
        class="shrink-0"
        @click="router.back()"
      />
      <h1 class="text-base font-bold flex-1 leading-tight">
        Noch Mal!
      </h1>

      <UButton
        icon="i-lucide-rotate-ccw"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="$t('nochmal.resetGame')"
        @click="confirmReset = true"
      />
      <UButton
        icon="i-lucide-info"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="$t('nochmal.infoButton')"
        @click="infoOpen = true"
      />
    </div>

    <!-- ── MAIN GRID ── -->
    <div class="px-4 pt-1 pb-2 overflow-x-auto">
      <table class="nm-table w-full border-collapse">
        <thead>
          <!-- Column bonus buttons -->
          <tr>
            <th
              v-for="col in COL_DEFS"
              :key="`bonus-${col.label}`"
              class="nm-th-bonus"
            >
              <button
                type="button"
                class="nm-bonus-btn"
                :class="bonusBtnClass(col.label)"
                :aria-label="`${$t('nochmal.column')} ${col.label}: ${col.first}/${col.second} ${$t('nochmal.points')}`"
                @click="cycleColumnBonus(col.label)"
              >
                <span
                  class="nm-bonus-first"
                  :class="{ 'nm-bonus-first--claimed': state.columnBonus[col.label] !== 'none' }"
                >{{ col.first }}</span>
                <span class="nm-bonus-sep">/</span>
                <span
                  class="nm-bonus-second"
                  :class="{ 'nm-bonus-second--claimed': state.columnBonus[col.label] === 'second' }"
                >{{ col.second }}</span>
              </button>
            </th>
          </tr>
          <!-- Column labels -->
          <tr>
            <th
              v-for="col in COL_DEFS"
              :key="`label-${col.label}`"
              class="nm-th-col-label"
              :class="{ 'nm-col-H': col.label === 'H' }"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>

        <!-- Mosaic rows (y = 0–6) -->
        <tbody>
          <tr
            v-for="(row, y) in cellGrid"
            :key="y"
          >
            <td
              v-for="(cell, x) in row"
              :key="x"
              class="nm-td-cell"
              :class="{ 'nm-col-H': x === 7 }"
            >
              <button
                v-if="cell"
                type="button"
                class="nm-cell"
                :class="cellClass(cell)"
                :aria-label="`${$t(`nochmal.color.${cell.color}`)} ${cell.col} ${cell.crossed ? $t('nochmal.checked') : $t('nochmal.unchecked')}`"
                :aria-pressed="cell.crossed"
                :disabled="!clickableCells.has(cell)"
                @click="toggleCell(cell)"
              >
                <template v-if="cell.crossed">
                  <UIcon
                    name="i-lucide-x"
                    class="size-3 pointer-events-none"
                  />
                </template>
                <template v-else-if="cell.star">
                  <span class="nm-star">★</span>
                </template>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ── COLOR BONUSES ── -->
      <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <div
          v-for="color in COLORS"
          :key="color"
          class="flex items-center gap-1"
        >
          <div
            class="nm-color-dot"
            :style="{ backgroundColor: COLOR_HEX[color] }"
            :title="$t(`nochmal.color.${color}`)"
          />
          <button
            type="button"
            class="nm-color-bonus"
            :class="colorBonusFirstClass(color)"
            :aria-label="`${$t(`nochmal.color.${color}`)} ${$t('nochmal.colorBonusFirst')}`"
            @click="cycleColorBonus(color)"
          >
            5
          </button>
          <button
            type="button"
            class="nm-color-bonus"
            :class="colorBonusSecondClass(color)"
            :aria-label="`${$t(`nochmal.color.${color}`)} ${$t('nochmal.colorBonusSecond')}`"
            @click="cycleColorBonus(color)"
          >
            3
          </button>
        </div>
      </div>

      <!-- ── JOKER TRACK ── -->
      <div class="flex items-center gap-1 mt-2">
        <span class="text-xs font-semibold text-[var(--ui-text-muted)] shrink-0 w-12">!</span>
        <div class="flex gap-0.5">
          <button
            v-for="i in 8"
            :key="`joker-${i}`"
            type="button"
            class="nm-joker"
            :class="i <= state.jokersUsed ? 'nm-joker--used' : 'nm-joker--free'"
            :aria-label="`${$t('nochmal.joker')} ${i}`"
            @click="toggleJoker(i)"
          >
            <span
              v-if="i > state.jokersUsed"
              class="text-xs font-bold"
            >!</span>
            <UIcon
              v-else
              name="i-lucide-x"
              class="size-3"
            />
          </button>
        </div>
        <span class="text-xs text-[var(--ui-text-muted)] ml-1">
          {{ $t('nochmal.jokerScore') }}: +{{ unusedJokers }}
        </span>
      </div>

      <!-- ── SCORE TALLY ── -->
      <div class="mt-2 border-t border-[var(--ui-border)] pt-1 grid grid-cols-5 gap-x-2 gap-y-0.5 text-xs">
        <div class="text-[var(--ui-text-muted)]">
          {{ $t('nochmal.scoreBonus') }}
        </div>
        <div class="text-[var(--ui-text-muted)]">
          {{ $t('nochmal.scoreColumns') }}
        </div>
        <div class="text-[var(--ui-text-muted)]">
          {{ $t('nochmal.scoreJokers') }}
        </div>
        <div class="text-[var(--ui-text-muted)]">
          {{ $t('nochmal.scoreStars') }}
        </div>
        <div class="font-bold">
          {{ $t('nochmal.total') }}
        </div>

        <div class="font-semibold tabular-nums">
          {{ scoreColorBonus }}
        </div>
        <div class="font-semibold tabular-nums">
          {{ scoreColumns }}
        </div>
        <div class="font-semibold tabular-nums">
          +{{ unusedJokers }}
        </div>
        <div class="font-semibold tabular-nums text-red-500">
          {{ scoreStars < 0 ? scoreStars : scoreStars }}
        </div>
        <div class="text-lg font-bold tabular-nums">
          {{ totalScore }}
        </div>
      </div>
    </div>

    <!-- ── CONFIRM RESET ── -->
    <ConfirmResetModal
      :open="confirmReset"
      :title="$t('nochmal.resetTitle')"
      :body="$t('nochmal.resetBody')"
      :cancel-label="$t('nochmal.cancel')"
      :confirm-label="$t('nochmal.reset')"
      @confirm="handleReset"
      @update:open="confirmReset = $event"
    />

    <!-- ── INFO MODAL ── -->
    <UModal
      :open="infoOpen"
      @update:open="infoOpen = $event"
    >
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold text-base">
              {{ $t('nochmal.infoTitle') }}
            </h3>
          </template>

          <div class="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              {{ $t('nochmal.infoIntro') }}
            </p>

            <ul class="list-disc space-y-1 pl-5 text-[var(--ui-text)]">
              <li>{{ $t('nochmal.infoRule1') }}</li>
              <li>{{ $t('nochmal.infoRule2') }}</li>
              <li>{{ $t('nochmal.infoRule3') }}</li>
              <li>{{ $t('nochmal.infoRule4') }}</li>
            </ul>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                :label="$t('nochmal.close')"
                @click="infoOpen = false"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import '~/assets/css/nochmal.css'
import {
  COL_DEFS,
  COLORS,
  COLOR_HEX,
  useNochmal
} from '~/composables/useNochmal'
import type { Cell, Color, ColLabel } from '~/composables/useNochmal'

const router = useRouter()

useSeoMeta({ title: () => 'Noch Mal!' })

const {
  state,
  cellGrid,
  clickableCells,
  unusedJokers,
  scoreColorBonus,
  scoreColumns,
  scoreStars,
  totalScore,
  toggleCell,
  cycleColumnBonus,
  cycleColorBonus,
  toggleJoker,
  resetGame
} = useNochmal()

const confirmReset = ref(false)
const infoOpen = ref(false)

function handleReset() {
  resetGame()
  confirmReset.value = false
}

// ── CSS helpers ────────────────────────────────────────────────────────────

function cellClass(cell: Cell): string[] {
  return [
    `nm-cell--${cell.color}`,
    cell.crossed ? 'nm-cell--checked' : cell.star ? 'nm-cell--star' : 'nm-cell--empty',
    !clickableCells.value.has(cell) ? 'nm-cell--disabled' : ''
  ]
}

function bonusBtnClass(col: ColLabel): string {
  const b = state.value.columnBonus[col]
  if (b === 'first') return 'nm-bonus--first'
  if (b === 'second') return 'nm-bonus--second'
  return ''
}

function colorBonusFirstClass(color: Color): string {
  const b = state.value.colorBonus[color]
  if (b === 'first') return `nm-color-bonus--first nm-color-bonus--${color}`
  if (b === 'second') return 'nm-color-bonus--done'
  return `nm-color-bonus--idle nm-color-bonus--${color}`
}

function colorBonusSecondClass(color: Color): string {
  const b = state.value.colorBonus[color]
  if (b === 'second') return `nm-color-bonus--second nm-color-bonus--${color}`
  return 'nm-color-bonus--idle nm-color-bonus--dim'
}
</script>
