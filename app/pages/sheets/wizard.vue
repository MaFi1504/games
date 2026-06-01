<template>
  <div class="min-h-screen pb-32">
    <UContainer class="py-4 px-4 max-w-2xl">
      <GamePageHeader
        :title="$t('wizard.title')"
        :reset-aria-label="$t('wizard.resetGame')"
        :reset-disabled="players.length === 0 && rounds.length === 0"
        @reset="confirmReset = true"
      />

      <!-- ── SETUP PHASE ── -->
      <template v-if="players.length === 0">
        <!-- Multiplayer setup (always at top) -->
        <MultiplayerSetup
          :connected="mpConnected"
          :connecting="mpConnecting"
          :reconnecting="mpReconnecting"
          :error="mpError"
          :room="mpRoom"
          :player-name="mpPlayerName"
          @connect="(name, room) => mpConnect(room, name).catch(() => {})"
          @disconnect="mpClose"
        />

        <!-- Solo: add players manually -->
        <UCard
          v-if="!mpConnected"
          class="mb-4"
        >
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

        <!-- MP: one-tap start when connected -->
        <UCard
          v-else
          class="mb-4"
        >
          <div class="flex items-center justify-between gap-4">
            <p class="text-sm font-medium text-muted">
              {{ $t('wizard.mpReadyToStart') }}
            </p>
            <UButton
              icon="i-lucide-play"
              :label="$t('wizard.startGame')"
              @click="beginGame"
            />
          </div>
        </UCard>

        <!-- Scoring rules reference -->
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

      <!-- ── GAME PHASE ── -->
      <template v-else>
        <!-- Winner banner + confetti -->
        <div
          v-if="gameOver && winner"
          class="mb-4"
        >
          <ConfettiOverlay :show="gameOver && !!winner" />
          <!-- Banner card -->
          <UCard class="text-center">
            <div class="py-3 space-y-1">
              <div class="text-5xl">
                🏆
              </div>
              <h2 class="text-xl font-bold">
                {{ $t('wizard.winner', { name: winner.name }) }}
              </h2>
              <p class="text-sm text-muted">
                {{ $t('wizard.winnerPoints', { points: winner.total }) }}
              </p>
            </div>
          </UCard>
        </div>

        <!-- Connected badge row -->
        <div
          v-if="mpConnected"
          class="mb-3 flex flex-wrap items-center gap-2"
        >
          <UBadge
            color="success"
            variant="subtle"
            class="font-mono flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-users"
              class="w-3 h-3"
            />
            {{ mpRoom }}
          </UBadge>
          <UBadge
            variant="subtle"
            color="neutral"
          >
            {{ $t('mp.playingAs', { name: mpPlayerName }) }}
          </UBadge>
        </div>

        <!-- Score table -->
        <div class="overflow-x-auto mb-4">
          <table class="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th class="text-left text-xs text-muted uppercase tracking-wide py-2 pr-3 whitespace-nowrap w-10">
                  <div class="flex flex-col gap-0.5">
                    <span>{{ $t('wizard.round') }}</span>
                    <span class="normal-case tracking-normal tabular-nums">{{ effectiveRoundCount }}/{{ maxRounds }}</span>
                  </div>
                </th>
                <th
                  v-for="pRow in allPlayerRows"
                  :key="pRow.id"
                  class="text-center py-2 px-1 min-w-[72px]"
                >
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="font-semibold truncate max-w-[80px] text-xs leading-tight">{{ pRow.name }}</span>
                    <UBadge
                      v-if="pRow.isLocal && mpConnected"
                      size="xs"
                      color="primary"
                      variant="subtle"
                    >
                      {{ $t('wizard.you') }}
                    </UBadge>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Round rows (ri is 1-based) -->
              <tr
                v-for="ri in effectiveRoundCount"
                :key="ri"
              >
                <td class="text-xs text-muted py-1 pr-3 tabular-nums align-top pt-2.5">
                  {{ ri }}
                </td>
                <td
                  v-for="pRow in allPlayerRows"
                  :key="pRow.id"
                  class="py-1 px-1 align-top"
                >
                  <div class="flex flex-col items-center gap-0.5 w-[72px]">
                    <!-- BID -->
                    <!-- Local player in current round, bid not yet locked: editable -->
                    <template v-if="isCurrentRound(ri) && pRow.localIndex !== null && !pRow.getRound(ri - 1)?.bidLocked">
                      <div class="flex items-center gap-0.5">
                        <UInput
                          :model-value="pRow.getRound(ri - 1)?.bid ?? ''"
                          type="number"
                          inputmode="numeric"
                          size="xs"
                          class="w-11 text-center"
                          :placeholder="$t('wizard.bidShort')"
                          min="0"
                          @update:model-value="(v) => handleBidInput(ri - 1, pRow.localIndex!, v)"
                        />
                        <UButton
                          icon="i-lucide-lock"
                          size="xs"
                          variant="ghost"
                          color="neutral"
                          :disabled="pRow.getRound(ri - 1)?.bid === null"
                          :aria-label="$t('wizard.lockBid')"
                          @click="handleLockBid(ri - 1, pRow.localIndex!)"
                        />
                      </div>
                    </template>

                    <!-- Bid visible: local player locked, or past round, or MP all-locked -->
                    <template v-else-if="shouldShowBid(ri - 1, pRow)">
                      <span class="text-xs tabular-nums flex items-center gap-0.5 leading-none">
                        <span>{{ pRow.getRound(ri - 1)?.bid ?? '—' }}</span>
                        <UIcon
                          v-if="pRow.getRound(ri - 1)?.bidLocked"
                          name="i-lucide-lock"
                          class="w-2.5 h-2.5 text-muted"
                        />
                      </span>
                    </template>

                    <!-- Bid hidden (remote in MP, bids not all locked yet) -->
                    <template v-else>
                      <UIcon
                        name="i-lucide-eye-off"
                        class="w-3 h-3 text-muted"
                      />
                    </template>

                    <!-- TRICKS -->
                    <!-- Local player in current round, tricks phase active: editable -->
                    <template v-if="isCurrentRound(ri) && pRow.localIndex !== null && areTricksEditable(ri - 1)">
                      <UInput
                        :model-value="pRow.getRound(ri - 1)?.tricks ?? ''"
                        type="number"
                        inputmode="numeric"
                        size="xs"
                        class="w-11 text-center"
                        :placeholder="$t('wizard.tricksShort')"
                        min="0"
                        @update:model-value="(v) => handleTricksInput(ri - 1, pRow.localIndex!, v)"
                      />
                    </template>
                    <!-- Past/remote: display value -->
                    <template v-else>
                      <span class="text-xs tabular-nums text-muted leading-none">
                        {{ pRow.getRound(ri - 1)?.tricks ?? '—' }}
                      </span>
                    </template>

                    <!-- POINTS -->
                    <span
                      v-if="getPoints(ri - 1, pRow) !== null"
                      class="text-xs font-semibold tabular-nums leading-none"
                      :class="getPoints(ri - 1, pRow)! >= 0 ? 'text-success' : 'text-error'"
                    >
                      {{ getPoints(ri - 1, pRow)! > 0 ? '+' : '' }}{{ getPoints(ri - 1, pRow) }}
                    </span>
                    <span
                      v-else
                      class="text-xs text-muted leading-none"
                    >–</span>
                  </div>
                </td>
              </tr>

              <!-- Totals row -->
              <tr
                v-if="effectiveRoundCount > 0"
                class="border-t border-default"
              >
                <td class="text-xs font-semibold text-muted uppercase tracking-wide py-2 pr-3 whitespace-nowrap">
                  {{ $t('wizard.total') }}
                </td>
                <td
                  v-for="pRow in allPlayerRows"
                  :key="pRow.id"
                  class="text-center py-2 px-1"
                >
                  <span class="text-base font-bold tabular-nums">{{ pRow.total }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MP status hints -->
        <div
          v-if="mpConnected && effectiveRoundCount > 0"
          class="mb-3 flex items-center gap-1.5 text-xs text-muted"
        >
          <template v-if="!allBidsLockedForRound(effectiveRoundCount - 1)">
            <UIcon
              name="i-lucide-clock"
              class="w-3.5 h-3.5 shrink-0"
            />
            {{ $t('wizard.waitingForBids') }}
          </template>
          <template v-else-if="!canAddRound">
            <UIcon
              name="i-lucide-clock"
              class="w-3.5 h-3.5 shrink-0"
            />
            {{ $t('wizard.waitingForTricks') }}
          </template>
        </div>

        <!-- Empty state -->
        <div
          v-if="effectiveRoundCount === 0"
          class="text-center py-10 text-muted mb-4"
        >
          <UIcon
            name="i-lucide-wand-2"
            class="w-10 h-10 mx-auto mb-3 opacity-60"
          />
          <p class="text-sm leading-relaxed">
            {{ $t('wizard.emptyState') }}
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2 flex-wrap">
          <UButton
            icon="i-lucide-plus"
            :label="$t('wizard.addRound')"
            :disabled="!canAddRound"
            @click="addRound"
          />
          <UButton
            v-if="rounds.length > 0 && !mpConnected"
            icon="i-lucide-undo-2"
            variant="ghost"
            color="neutral"
            :label="$t('wizard.removeLastRound')"
            @click="removeLastRound"
          />
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
import { useWizard, computeRoundPoints, type WizardRoundEntry } from '~/composables/useWizard'
import { useWizardMultiplayer } from '~/composables/useWizardMultiplayer'

const { t } = useI18n()
useSeoMeta({ title: () => t('wizard.title') })

const { players, rounds, playerTotals, load, startGame, addRound, removeLastRound, setBid, lockBid, setTricks, reset } = useWizard()

const {
  roomCode: mpRoom,
  playerName: mpPlayerName,
  connected: mpConnected,
  connecting: mpConnecting,
  reconnecting: mpReconnecting,
  otherPlayers: mpOtherPlayers,
  connectionError: mpError,
  connect: mpConnect,
  sendUpdate: mpSendUpdate,
  close: mpClose
} = useWizardMultiplayer()

onMounted(() => load())

const confirmReset = ref(false)
const newPlayerName = ref('')
const setupPlayers = ref<string[]>([])

// ── Player row model ──

interface PlayerRow {
  id: string
  name: string
  isLocal: boolean
  /** Index in players/rounds.entries for local players; null for remote */
  localIndex: number | null
  getRound: (ri: number) => WizardRoundEntry | null
  total: number
}

const allPlayerRows = computed<PlayerRow[]>(() => {
  if (!mpConnected.value) {
    // Solo: all players are local
    return players.value.map((name, pi) => ({
      id: `local-${pi}`,
      name,
      isLocal: true,
      localIndex: pi,
      getRound: (ri: number) => rounds.value[ri]?.entries[pi] ?? null,
      total: playerTotals.value[pi] ?? 0
    }))
  }

  // MP: local player first (always index 0 in the local rounds array), then remote
  const localRow: PlayerRow = {
    id: 'local',
    name: mpPlayerName.value,
    isLocal: true,
    localIndex: 0,
    getRound: (ri: number) => rounds.value[ri]?.entries[0] ?? null,
    total: playerTotals.value[0] ?? 0
  }

  const remoteRows: PlayerRow[] = mpOtherPlayers.value.map(p => ({
    id: p.playerId,
    name: p.name,
    isLocal: false,
    localIndex: null,
    getRound: (ri: number) => p.state?.rounds[ri] ?? null,
    total: p.state?.total ?? 0
  }))

  return [localRow, ...remoteRows]
})

// ── Round helpers ──

const effectiveRoundCount = computed(() => {
  if (!mpConnected.value) return rounds.value.length
  const remoteLengths = mpOtherPlayers.value.map(p => p.state?.rounds.length ?? 0)
  return Math.max(rounds.value.length, ...remoteLengths, 0)
})

// 60-card deck (52 + 4 Wizards + 4 Jesters); round N deals N cards each
const maxRounds = computed(() => Math.floor(60 / allPlayerRows.value.length))

function isCurrentRound(ri: number): boolean {
  return ri === effectiveRoundCount.value
}

function allBidsLockedForRound(ri: number): boolean {
  return allPlayerRows.value.every(row => row.getRound(ri)?.bidLocked === true)
}

/**
 * Whether to show the bid value for a given player in a given round.
 * In MP mode, other players' bids are hidden until all have locked.
 */
function shouldShowBid(ri: number, row: PlayerRow): boolean {
  if (!mpConnected.value) return true
  if (ri < effectiveRoundCount.value - 1) return true // completed round
  if (row.isLocal) return true // always see own bid
  return allBidsLockedForRound(ri)
}

/**
 * Tricks are editable for the local player in the current round
 * only after all players have locked their bids (solo + MP).
 */
function areTricksEditable(ri: number): boolean {
  return allBidsLockedForRound(ri)
}

function getPoints(ri: number, row: PlayerRow): number | null {
  const entry = row.getRound(ri)
  if (!entry) return null
  return computeRoundPoints(entry.bid, entry.tricks)
}

const canAddRound = computed(() => {
  if (effectiveRoundCount.value >= maxRounds.value) return false
  if (effectiveRoundCount.value === 0) return true
  const last = effectiveRoundCount.value - 1
  return allPlayerRows.value.every(row => row.getRound(last)?.tricks !== null)
})

const gameOver = computed(() => {
  if (effectiveRoundCount.value < maxRounds.value || effectiveRoundCount.value === 0) return false
  const last = effectiveRoundCount.value - 1
  return allPlayerRows.value.every(row => row.getRound(last)?.tricks !== null)
})

const winner = computed(() => {
  if (!gameOver.value || allPlayerRows.value.length === 0) return null
  return allPlayerRows.value.reduce((best, row) => row.total > best.total ? row : best)
})

// ── Setup actions ──

function addSetupPlayer() {
  const name = newPlayerName.value.trim()
  if (!name) return
  setupPlayers.value.push(name)
  newPlayerName.value = ''
}

function beginGame() {
  if (mpConnected.value) {
    startGame([mpPlayerName.value])
  } else {
    if (setupPlayers.value.length < 2) return
    startGame(setupPlayers.value)
    setupPlayers.value = []
  }
  newPlayerName.value = ''
  addRound()
}

function doReset() {
  reset()
  setupPlayers.value = []
  newPlayerName.value = ''
  confirmReset.value = false
}

// ── In-game input handlers ──

function handleBidInput(ri: number, pi: number, value: string | number) {
  const n = value === '' || value === null ? null : Number(value)
  setBid(ri, pi, n !== null && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null)
}

function handleLockBid(ri: number, pi: number) {
  lockBid(ri, pi)
}

function handleTricksInput(ri: number, pi: number, value: string | number) {
  const n = value === '' || value === null ? null : Number(value)
  setTricks(ri, pi, n !== null && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null)
}

// ── Multiplayer sync ──

// Broadcast local state on every change
watch(
  [rounds, playerTotals],
  () => {
    if (!mpConnected.value) return
    const localRounds = rounds.value.map(r => r.entries[0] ?? { bid: null, bidLocked: false, tricks: null })
    mpSendUpdate(localRounds, playerTotals.value[0] ?? 0, players.value.length > 0)
  },
  { deep: true }
)

// Send initial state when connection is established mid-game
watch(mpConnected, (val) => {
  if (val && players.value.length > 0) {
    const localRounds = rounds.value.map(r => r.entries[0] ?? { bid: null, bidLocked: false, tricks: null })
    mpSendUpdate(localRounds, playerTotals.value[0] ?? 0, true)
  }
})

// Auto-start when any connected player starts the game
watch(mpOtherPlayers, (peers) => {
  if (!mpConnected.value || players.value.length > 0) return
  if (peers.some(p => p.state?.started)) {
    beginGame()
  }
}, { deep: true })

// When a remote player adds a round, sync up locally so inputs are backed by a real entry
watch(effectiveRoundCount, (newCount) => {
  if (!mpConnected.value || players.value.length === 0) return
  while (rounds.value.length < newCount) {
    addRound()
  }
})

// When starting the game in MP mode, catch up on rounds that were added before this player joined
watch(() => players.value.length, (newLen, oldLen) => {
  if (!mpConnected.value || oldLen !== 0 || newLen === 0) return
  while (rounds.value.length < effectiveRoundCount.value) {
    addRound()
  }
})
</script>

<style scoped>
</style>
