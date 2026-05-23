<template>
  <div class="min-h-screen pb-32">
    <UContainer class="py-4 px-4 max-w-2xl">
      <GamePageHeader
        :title="$t('wizard.title')"
        :reset-aria-label="$t('wizard.resetGame')"
        :reset-disabled="players.length === 0 && rounds.length === 0"
        @reset="confirmReset = true"
      />

      <!-- Setup: enter player names -->
      <template v-if="players.length === 0">
        <UCard class="mb-4">
          <template #header>
            <div>
              <h2 class="font-semibold text-base">
                {{ $t('wizard.setupTitle') }}
              </h2>
              <p class="text-sm text-muted mt-1">
                {{ $t('wizard.setupDescription') }}
              </p>
            </div>
          </template>

          <div class="flex gap-2 mb-4">
            <UInput
              v-model="newPlayerName"
              class="flex-1"
              size="lg"
              :placeholder="$t('wizard.playerNamePlaceholder')"
              @keydown.enter="addSetupPlayer"
            />
            <UButton
              icon="i-lucide-user-plus"
              size="lg"
              :label="$t('wizard.addPlayer')"
              :disabled="!newPlayerName.trim()"
              @click="addSetupPlayer"
            />
          </div>

          <div
            v-if="setupPlayers.length > 0"
            class="space-y-2"
          >
            <div
              v-for="(name, i) in setupPlayers"
              :key="i"
              class="flex items-center justify-between rounded-xl border border-default px-3 py-2"
            >
              <span class="font-medium truncate pr-4">{{ name }}</span>
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="neutral"
                size="sm"
                :aria-label="$t('wizard.removePlayer')"
                @click="setupPlayers.splice(i, 1)"
              />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                icon="i-lucide-play"
                size="lg"
                :label="$t('wizard.startGame')"
                :disabled="setupPlayers.length < 2"
                @click="beginGame"
              />
            </div>
          </template>
        </UCard>

        <!-- Scoring rules info -->
        <UCard>
          <template #header>
            <h2 class="font-semibold text-base">
              {{ $t('wizard.scoringTitle') }}
            </h2>
          </template>
          <div class="space-y-2 text-sm">
            <div class="flex items-start gap-3 p-2 rounded-lg bg-success/10">
              <UIcon
                name="i-lucide-check-circle"
                class="w-4 h-4 mt-0.5 shrink-0 text-success"
              />
              <span>{{ $t('wizard.scoringCorrect') }}</span>
            </div>
            <div class="flex items-start gap-3 p-2 rounded-lg bg-error/10">
              <UIcon
                name="i-lucide-x-circle"
                class="w-4 h-4 mt-0.5 shrink-0 text-error"
              />
              <span>{{ $t('wizard.scoringWrong') }}</span>
            </div>
          </div>
        </UCard>
      </template>

      <!-- Game in progress -->
      <template v-else>
        <!-- Score overview: totals per player -->
        <div class="overflow-x-auto mb-4">
          <table class="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th class="text-left text-xs text-muted uppercase tracking-wide py-2 pr-2 whitespace-nowrap w-14">
                  {{ $t('wizard.round') }}
                </th>
                <th
                  v-for="(player, pi) in players"
                  :key="pi"
                  class="text-center py-2 px-1 font-semibold truncate max-w-24"
                >
                  {{ player }}
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Existing rounds -->
              <tr
                v-for="(round, ri) in rounds"
                :key="ri"
                class="group"
              >
                <td class="text-xs text-muted py-1.5 pr-2 whitespace-nowrap tabular-nums">
                  {{ ri + 1 }}
                </td>
                <td
                  v-for="(entry, pi) in round.entries"
                  :key="pi"
                  class="py-1 px-1"
                >
                  <div class="flex flex-col items-center gap-0.5">
                    <!-- Bid input -->
                    <UInput
                      :model-value="entry.bid ?? ''"
                      type="number"
                      inputmode="numeric"
                      size="xs"
                      class="w-14 text-center"
                      :placeholder="$t('wizard.bidShort')"
                      min="0"
                      :max="ri + 1"
                      @update:model-value="(v) => handleBidInput(ri, pi, v)"
                    />
                    <!-- Tricks input -->
                    <UInput
                      :model-value="entry.tricks ?? ''"
                      type="number"
                      inputmode="numeric"
                      size="xs"
                      class="w-14 text-center"
                      :placeholder="$t('wizard.tricksShort')"
                      min="0"
                      :max="ri + 1"
                      @update:model-value="(v) => handleTricksInput(ri, pi, v)"
                    />
                    <!-- Points badge -->
                    <span
                      v-if="roundPoints(entry) !== null"
                      class="text-xs font-semibold tabular-nums"
                      :class="roundPoints(entry)! >= 0 ? 'text-success' : 'text-error'"
                    >
                      {{ roundPoints(entry)! > 0 ? '+' : '' }}{{ roundPoints(entry) }}
                    </span>
                    <span
                      v-else
                      class="text-xs text-muted"
                    >–</span>
                  </div>
                </td>
              </tr>

              <!-- Total row -->
              <tr class="border-t border-default">
                <td class="text-xs font-semibold text-muted uppercase tracking-wide py-2 pr-2 whitespace-nowrap">
                  {{ $t('wizard.total') }}
                </td>
                <td
                  v-for="(total, pi) in playerTotals"
                  :key="pi"
                  class="text-center py-2 px-1"
                >
                  <span class="text-base font-bold tabular-nums">{{ total }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2 flex-wrap">
          <UButton
            icon="i-lucide-plus"
            :label="$t('wizard.addRound')"
            @click="addRound"
          />
          <UButton
            v-if="rounds.length > 0"
            icon="i-lucide-undo-2"
            variant="ghost"
            color="neutral"
            :label="$t('wizard.removeLastRound')"
            @click="removeLastRound"
          />
        </div>

        <!-- Empty state when no rounds yet -->
        <div
          v-if="rounds.length === 0"
          class="text-center py-10 text-muted"
        >
          <UIcon
            name="i-lucide-wand-2"
            class="w-10 h-10 mx-auto mb-3 opacity-60"
          />
          <p class="text-sm leading-relaxed">
            {{ $t('wizard.emptyState') }}
          </p>
        </div>
      </template>
    </UContainer>

    <ConfirmResetModal
      v-model:open="confirmReset"
      :title="$t('wizard.resetTitle')"
      :body="$t('wizard.resetBody')"
      :cancel-label="$t('wizard.cancel')"
      :confirm-label="$t('wizard.reset')"
      @confirm="doReset"
    />
  </div>
</template>

<script setup lang="ts">
import { computeRoundPoints, useWizard } from '~/composables/useWizard'
import type { WizardPlayerEntry } from '~/composables/useWizard'

const { t } = useI18n()
useSeoMeta({ title: () => t('wizard.title') })

const { players, rounds, playerTotals, load, startGame, addRound, removeLastRound, updateBid, updateTricks, reset } = useWizard()

onMounted(() => load())

const confirmReset = ref(false)
const newPlayerName = ref('')
const setupPlayers = ref<string[]>([])

function addSetupPlayer() {
  const name = newPlayerName.value.trim()
  if (!name) return
  setupPlayers.value.push(name)
  newPlayerName.value = ''
}

function beginGame() {
  if (setupPlayers.value.length < 2) return
  startGame(setupPlayers.value)
  setupPlayers.value = []
  newPlayerName.value = ''
}

function doReset() {
  reset()
  setupPlayers.value = []
  newPlayerName.value = ''
  confirmReset.value = false
}

function roundPoints(entry: WizardPlayerEntry): number | null {
  return computeRoundPoints(entry.bid, entry.tricks)
}

function handleBidInput(roundIndex: number, playerIndex: number, value: string | number) {
  const n = value === '' || value === null ? null : Number(value)
  updateBid(roundIndex, playerIndex, n !== null && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null)
}

function handleTricksInput(roundIndex: number, playerIndex: number, value: string | number) {
  const n = value === '' || value === null ? null : Number(value)
  updateTricks(roundIndex, playerIndex, n !== null && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null)
}
</script>
