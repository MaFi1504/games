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
                @click="toggleCell(cell)"
              >
                <template v-if="cell.crossed">
                  <UIcon name="i-lucide-x" class="size-3 pointer-events-none" />
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
            <span v-if="i > state.jokersUsed" class="text-xs font-bold">!</span>
            <UIcon v-else name="i-lucide-x" class="size-3" />
          </button>
        </div>
        <span class="text-xs text-[var(--ui-text-muted)] ml-1">
          {{ $t('nochmal.jokerScore') }}: +{{ unusedJokers }}
        </span>
      </div>

      <!-- ── SCORE TALLY ── -->
      <div class="mt-2 border-t border-[var(--ui-border)] pt-1 grid grid-cols-5 gap-x-2 gap-y-0.5 text-xs">
        <div class="text-[var(--ui-text-muted)]">{{ $t('nochmal.scoreBonus') }}</div>
        <div class="text-[var(--ui-text-muted)]">{{ $t('nochmal.scoreColumns') }}</div>
        <div class="text-[var(--ui-text-muted)]">{{ $t('nochmal.scoreJokers') }}</div>
        <div class="text-[var(--ui-text-muted)]">{{ $t('nochmal.scoreStars') }}</div>
        <div class="font-bold">{{ $t('nochmal.total') }}</div>

        <div class="font-semibold tabular-nums">{{ scoreColorBonus }}</div>
        <div class="font-semibold tabular-nums">{{ scoreColumns }}</div>
        <div class="font-semibold tabular-nums">+{{ unusedJokers }}</div>
        <div class="font-semibold tabular-nums text-red-500">{{ scoreStars < 0 ? scoreStars : scoreStars }}</div>
        <div class="text-lg font-bold tabular-nums">{{ totalScore }}</div>
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
  </div>
</template>

<script setup lang="ts">
import {
  COL_DEFS,
  COLORS,
  COLOR_HEX,
  useNochmal,
} from '~/composables/useNochmal'
import type { Cell, Color, ColLabel } from '~/composables/useNochmal'

const router = useRouter()

useSeoMeta({ title: () => 'Noch Mal!' })

const {
  state,
  cellGrid,
  unusedJokers,
  scoreColorBonus,
  scoreColumns,
  scoreStars,
  totalScore,
  toggleCell,
  cycleColumnBonus,
  cycleColorBonus,
  toggleJoker,
  resetGame,
} = useNochmal()

const confirmReset = ref(false)

function handleReset() {
  resetGame()
  confirmReset.value = false
}

// ── CSS helpers ────────────────────────────────────────────────────────────

function cellClass(cell: Cell): string[] {
  return [
    `nm-cell--${cell.color}`,
    cell.crossed ? 'nm-cell--checked' : cell.star ? 'nm-cell--star' : 'nm-cell--empty',
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

<style scoped>
/* ── Sheet container ─────────────────────────────────────────────────── */
.nm-sheet {
  min-height: 100dvh;
  font-size: 11px;

}

/* ── Table ───────────────────────────────────────────────────────────── */
.nm-table {
  table-layout: fixed;
  min-width: 480px;
}

/* Column H highlight */
.nm-col-H {
  background-color: rgba(100, 100, 255, 0.07);
}

/* ── Column headers ──────────────────────────────────────────────────── */
.nm-th-col-label {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 0;
  color: var(--ui-text-muted);
}

.nm-th-bonus {
  padding: 1px 0;
  text-align: center;
}

/* ── Column bonus buttons ────────────────────────────────────────────── */
.nm-bonus-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 100%;
  height: 18px;
  border-radius: 3px;
  border: 1px solid var(--ui-border);
  background: transparent;
  font-size: 9px;
  cursor: pointer;
  transition: background 80ms;
}

.nm-bonus-btn:active { transform: scale(0.92); }

.nm-bonus-first { font-weight: 700; transition: text-decoration 80ms; }
.nm-bonus-first--claimed { text-decoration: line-through; opacity: 0.4; }

.nm-bonus-sep { opacity: 0.4; }

.nm-bonus-second { opacity: 0.6; }
.nm-bonus-second--claimed { font-weight: 700; opacity: 1; }

.nm-bonus--first {
  border-color: #22c55e;
  background: rgba(34,197,94,0.15);
}
.nm-bonus--second {
  border-color: #f97316;
  background: rgba(249,115,22,0.1);
}

/* ── Color dot ───────────────────────────────────────────────────────── */.nm-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.1);
}

/* ── Grid cells ──────────────────────────────────────────────────────── */
.nm-td-cell {
  padding: 1px;
}

.nm-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  border-radius: 3px;
  border: 1px solid transparent;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  transition: transform 60ms ease;
}

.nm-cell:active { transform: scale(0.85); }

/* Empty (solid colour background, matching the physical sheet) */
.nm-cell--orange { border-color: #f97316; background: rgba(249,115,22,0.18); }
.nm-cell--blue   { border-color: #3b82f6; background: rgba(59,130,246,0.18); }
.nm-cell--green  { border-color: #22c55e; background: rgba(34,197,94,0.18);  }
.nm-cell--red    { border-color: #ef4444; background: rgba(239,68,68,0.18);  }
.nm-cell--yellow { border-color: #eab308; background: rgba(234,179,8,0.18);  }

/* Star marker */
.nm-cell--star.nm-cell--orange { background: rgba(249,115,22,0.30); }
.nm-cell--star.nm-cell--blue   { background: rgba(59,130,246,0.30);  }
.nm-cell--star.nm-cell--green  { background: rgba(34,197,94,0.30);   }
.nm-cell--star.nm-cell--red    { background: rgba(239,68,68,0.30);   }
.nm-cell--star.nm-cell--yellow { background: rgba(234,179,8,0.30);   }

.nm-star {
  font-size: 11px;
  line-height: 1;
  opacity: 0.8;
}

/* Checked = fully solid */
.nm-cell--checked.nm-cell--orange { background: #f97316; color: #fff; border-color: #ea6a05; }
.nm-cell--checked.nm-cell--blue   { background: #3b82f6; color: #fff; border-color: #2563eb; }
.nm-cell--checked.nm-cell--green  { background: #22c55e; color: #fff; border-color: #16a34a; }
.nm-cell--checked.nm-cell--red    { background: #ef4444; color: #fff; border-color: #dc2626; }
.nm-cell--checked.nm-cell--yellow { background: #eab308; color: #1c1c1c; border-color: #ca8a04; }

/* ── Color bonus buttons ─────────────────────────────────────────────── */
.nm-color-bonus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1.5px solid var(--ui-border);
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 60ms;
}
.nm-color-bonus:active { transform: scale(0.88); }

.nm-color-bonus--idle { background: transparent; }
.nm-color-bonus--dim  { opacity: 0.35; }
.nm-color-bonus--done { opacity: 0.3; text-decoration: line-through; background: transparent; border-color: transparent; }

.nm-color-bonus--orange { border-color: #f97316; color: #f97316; }
.nm-color-bonus--blue   { border-color: #3b82f6; color: #3b82f6; }
.nm-color-bonus--green  { border-color: #22c55e; color: #22c55e; }
.nm-color-bonus--red    { border-color: #ef4444; color: #ef4444; }
.nm-color-bonus--yellow { border-color: #eab308; color: #ca8a04; }

.nm-color-bonus--first  { color: #fff !important; }
.nm-color-bonus--first.nm-color-bonus--orange { background: #f97316; }
.nm-color-bonus--first.nm-color-bonus--blue   { background: #3b82f6; }
.nm-color-bonus--first.nm-color-bonus--green  { background: #22c55e; }
.nm-color-bonus--first.nm-color-bonus--red    { background: #ef4444; }
.nm-color-bonus--first.nm-color-bonus--yellow { background: #eab308; color: #1c1c1c !important; }

.nm-color-bonus--second.nm-color-bonus--orange { border-color: #f97316; color: #f97316; opacity: 0.7; background: rgba(249,115,22,0.15); }
.nm-color-bonus--second.nm-color-bonus--blue   { border-color: #3b82f6; color: #3b82f6; opacity: 0.7; background: rgba(59,130,246,0.15); }
.nm-color-bonus--second.nm-color-bonus--green  { border-color: #22c55e; color: #22c55e; opacity: 0.7; background: rgba(34,197,94,0.15);  }
.nm-color-bonus--second.nm-color-bonus--red    { border-color: #ef4444; color: #ef4444; opacity: 0.7; background: rgba(239,68,68,0.15);  }
.nm-color-bonus--second.nm-color-bonus--yellow { border-color: #eab308; color: #ca8a04; opacity: 0.7; background: rgba(234,179,8,0.15);  }

/* ── Joker track ─────────────────────────────────────────────────────── */
.nm-joker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  border: 1.5px solid;
  cursor: pointer;
  transition: transform 60ms;
  touch-action: manipulation;
}
.nm-joker:active { transform: scale(0.88); }

.nm-joker--free { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,0.1); }
.nm-joker--used { border-color: #94a3b8; color: #94a3b8; background: rgba(148,163,184,0.1); }

</style>
