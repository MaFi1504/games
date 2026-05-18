<template>
  <div class="min-h-screen pb-32">
    <UContainer class="py-4 px-4 max-w-lg">
      <GamePageHeader
        :title="$t('phase10.title')"
        :reset-aria-label="$t('phase10.resetGame')"
        @reset="confirmReset = true"
      />

      <!-- Phase set selection (shown when no game started yet) -->
      <template v-if="!phaseSetKey">
        <!-- Multiplayer setup -->
        <UCard class="mb-4">
          <button
            type="button"
            class="w-full flex items-center justify-between"
            @click="mpExpanded = !mpExpanded"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="w-4 h-4 text-muted" />
              <span class="font-medium text-sm">{{ $t('phase10.mp.playWithOthers') }}</span>
              <UBadge v-if="mpConnected" color="success" variant="subtle" size="xs">
                {{ $t('phase10.mp.connected') }}
              </UBadge>
            </div>
            <UIcon
              :name="mpExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="w-4 h-4 text-muted"
            />
          </button>

          <div v-if="mpExpanded" class="mt-4 space-y-3">
            <template v-if="!mpConnected">
              <UInput
                v-model="mpNameInput"
                :placeholder="$t('phase10.mp.namePlaceholder')"
                :disabled="mpConnecting"
                size="sm"
              />
              <div class="flex rounded-lg border border-default overflow-hidden text-sm">
                <button
                  type="button"
                  class="flex-1 py-2 text-center transition-colors"
                  :class="mpMode === 'create' ? 'bg-primary text-white' : 'hover:bg-muted/40'"
                  @click="mpMode = 'create'"
                >
                  {{ $t('phase10.mp.createRoom') }}
                </button>
                <button
                  type="button"
                  class="flex-1 py-2 text-center transition-colors"
                  :class="mpMode === 'join' ? 'bg-primary text-white' : 'hover:bg-muted/40'"
                  @click="mpMode = 'join'"
                >
                  {{ $t('phase10.mp.joinRoom') }}
                </button>
              </div>
              <UInput
                v-if="mpMode === 'join'"
                v-model="mpRoomInput"
                :placeholder="$t('phase10.mp.roomCodePlaceholder')"
                :disabled="mpConnecting"
                size="sm"
                class="uppercase"
                maxlength="10"
              />
              <UAlert
                v-if="mpError"
                color="error"
                variant="subtle"
                :description="$t(`phase10.mp.error.${mpError}`, {}, { missingWarn: false }) || $t('phase10.mp.error.failed')"
                icon="i-lucide-triangle-alert"
              />
              <UButton
                block
                :loading="mpConnecting"
                :disabled="!mpNameInput.trim() || (mpMode === 'join' && !mpRoomInput.trim())"
                @click="startMultiplayer"
              >
                {{ $t('phase10.mp.connect') }}
              </UButton>
            </template>

            <template v-else>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-muted mb-1">
                    {{ $t('phase10.mp.shareCode') }}
                  </p>
                  <p class="text-3xl font-bold tracking-widest font-mono">
                    {{ mpRoom }}
                  </p>
                  <p class="text-xs text-muted mt-1">
                    {{ $t('phase10.mp.playingAs', { name: mpPlayerName }) }}
                  </p>
                </div>
                <UButton
                  variant="ghost"
                  size="sm"
                  color="neutral"
                  icon="i-lucide-log-out"
                  @click="mpClose"
                >
                  {{ $t('phase10.mp.disconnect') }}
                </UButton>
              </div>
            </template>
          </div>
        </UCard>

        <p class="text-sm text-muted mb-4 text-center">
          {{ $t('phase10.selectPhaseSetSubtitle') }}
        </p>
        <div class="grid grid-cols-1 gap-3">
          <button
            v-for="set in phaseSets"
            :key="set.key"
            type="button"
            class="text-left p-4 rounded-xl border border-default hover:border-primary hover:bg-primary/5 active:scale-[0.99] transition-all"
            @click="selectPhaseSet(set.key)"
          >
            <p class="font-semibold mb-2">
              {{ set.name }}
            </p>
            <ol class="space-y-0.5">
              <li
                v-for="(phase, i) in set.phases"
                :key="i"
                class="text-sm text-muted flex gap-2"
              >
                <span class="tabular-nums shrink-0 w-5 text-right">{{ i + 1 }}.</span>
                <span>{{ phase }}</span>
              </li>
            </ol>
          </button>
        </div>
      </template>
      <template v-else>
        <!-- Phase set indicator -->
        <div class="flex items-center gap-2 mb-4">
          <UBadge color="primary" variant="subtle" size="sm">
            {{ activeSetName }}
          </UBadge>
          <UBadge v-if="mpConnected" color="success" variant="subtle" size="sm" class="flex items-center gap-1 font-mono">
            <UIcon name="i-lucide-users" class="w-3 h-3" />
            {{ mpRoom }}
          </UBadge>
        </div>

        <!-- Win banner -->
        <UAlert
          v-if="allPhasesCompleted"
          icon="i-lucide-trophy"
          color="success"
          variant="subtle"
          :title="$t('phase10.winTitle')"
          :description="$t('phase10.winDescription', { score: totalScore })"
          class="mb-4"
        />

        <!-- Score summary -->
        <UCard class="mb-4">
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <p class="text-xs text-muted mb-1 uppercase tracking-wide">
                {{ $t('phase10.totalScore') }}
              </p>
              <p class="text-5xl font-bold tabular-nums leading-none">
                {{ totalScore }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1 uppercase tracking-wide">
                {{ $t('phase10.phasesCompleted') }}
              </p>
              <p class="text-5xl font-bold tabular-nums leading-none">
                {{ completedPhases.length }}<span class="text-muted text-3xl">/{{ phases.length }}</span>
              </p>
            </div>
          </div>

          <!-- Round history -->
          <div v-if="scores.length > 0" class="mt-4">
            <USeparator class="mb-3" />
            <p class="text-xs text-muted uppercase tracking-wide mb-2">
              {{ $t('phase10.roundHistory') }}
            </p>
            <div class="space-y-1 max-h-48 overflow-y-auto">
              <div
                v-for="(score, i) in scores"
                :key="i"
                class="flex items-center justify-between py-1"
              >
                <span class="text-sm text-muted">{{ $t('phase10.round', { n: i + 1 }) }}</span>
                <div class="flex items-center gap-3">
                  <span class="tabular-nums text-sm font-medium">{{ $t('phase10.pts', { n: score }) }}</span>
                  <UButton
                    icon="i-lucide-x"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :aria-label="$t('phase10.removeRound')"
                    @click="removeScore(i)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Multiplayer: other players' progress -->
          <template v-if="mpConnected">
            <USeparator class="mt-4 mb-3" />
            <p class="text-xs text-muted uppercase tracking-wide mb-2">
              {{ $t('phase10.mp.otherPlayers') }}
            </p>
            <p v-if="mpOtherPlayers.length === 0" class="text-sm text-muted italic text-center py-1">
              {{ $t('phase10.mp.waitingForPlayers') }}
            </p>
            <div v-else class="space-y-3">
              <div
                v-for="player in mpOtherPlayers"
                :key="player.playerId"
                class="flex items-center justify-between gap-3"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">
                    {{ player.name }}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    <div class="h-1.5 rounded-full bg-muted/40 flex-1 overflow-hidden">
                      <div
                        class="h-full bg-primary rounded-full transition-all duration-500"
                        :style="{ width: `${Math.min(100, ((player.state?.phases.length ?? 0) / phases.length) * 100)}%` }"
                      />
                    </div>
                    <span class="text-xs text-muted tabular-nums shrink-0">
                      {{ player.state?.phases.length ?? 0 }}/{{ phases.length }}
                    </span>
                  </div>
                </div>
                <p class="tabular-nums font-semibold text-sm shrink-0">
                  {{ $t('phase10.pts', { n: player.state?.totalScore ?? 0 }) }}
                </p>
              </div>
            </div>
          </template>
        </UCard>

        <!-- Phases list -->
        <UCard class="mb-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-base">
              {{ $t('phase10.phases') }}
            </h2>
            <p v-if="currentPhase" class="text-xs text-muted">
              {{ $t('phase10.currentPhaseLabel', { n: currentPhase.id }) }}
            </p>
          </div>

          <div class="space-y-1" data-testid="phase-list">
            <button
              v-for="phase in phases"
              :key="phase.id"
              type="button"
              class="w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left active:scale-[0.99]"
              :class="[
                isCompleted(phase.id)
                  ? 'bg-success/10'
                  : currentPhase?.id === phase.id
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'hover:bg-muted/40 active:bg-muted/60'
              ]"
              @click="togglePhase(phase.id)"
            >
              <span
                class="mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                :class="isCompleted(phase.id)
                  ? 'bg-success border-success'
                  : currentPhase?.id === phase.id
                    ? 'border-primary'
                    : 'border-muted'"
              >
                <UIcon
                  v-if="isCompleted(phase.id)"
                  name="i-lucide-check"
                  class="text-white w-3 h-3"
                />
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span
                    class="text-xs font-semibold tabular-nums"
                    :class="isCompleted(phase.id) ? 'text-success' : 'text-muted'"
                  >
                    {{ $t('phase10.phaseN', { n: phase.id }) }}
                  </span>
                  <UBadge v-if="currentPhase?.id === phase.id" size="xs" color="primary" variant="subtle">
                    {{ $t('phase10.current') }}
                  </UBadge>
                  <UBadge v-if="isCompleted(phase.id)" size="xs" color="success" variant="subtle">
                    {{ $t('phase10.done') }}
                  </UBadge>
                </div>
                <p
                  class="text-sm font-medium leading-snug"
                  :class="isCompleted(phase.id) ? 'line-through text-muted' : ''"
                >
                  {{ phase.description }}
                </p>
              </div>
            </button>
          </div>
        </UCard>

        <!-- Card values reference -->
        <UCard>
          <h2 class="font-semibold text-base mb-3">
            {{ $t('phase10.cardValues') }}
          </h2>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div
              v-for="row in cardValueRows"
              :key="row.label"
              class="flex justify-between"
            >
              <span class="text-muted">{{ row.label }}</span>
              <span class="font-medium tabular-nums">{{ row.value }}</span>
            </div>
          </div>
        </UCard>
      </template>
    </UContainer>

    <!-- Sticky score input (only during game) -->
    <div
      v-if="phaseSetKey"
      class="fixed bottom-0 left-0 right-0 z-50 border-t border-default bg-background/95 backdrop-blur-sm p-3 pb-safe"
    >
      <div class="max-w-lg mx-auto flex gap-2">
        <UInput
          v-model="scoreInput"
          type="number"
          min="0"
          inputmode="numeric"
          pattern="[0-9]*"
          :placeholder="$t('phase10.pointsThisRound')"
          class="flex-1"
          size="lg"
          @keydown.enter="submitScore"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('phase10.add')"
          size="lg"
          :disabled="!validScore"
          @click="submitScore"
        />
      </div>
    </div>

    <ConfirmResetModal
      v-model:open="confirmReset"
      :title="$t('phase10.resetTitle')"
      :body="$t('phase10.resetBody')"
      :cancel-label="$t('phase10.cancel')"
      :confirm-label="$t('phase10.reset')"
      @confirm="doReset"
    />
  </div>
</template>

<script setup lang="ts">
import { usePhase10, type PhaseSetKey } from '~/composables/usePhase10'
import { useGameHistory } from '~/composables/useGameHistory'
import { usePhase10Multiplayer } from '~/composables/usePhase10Multiplayer'

const { t, tm, rt } = useI18n()

useSeoMeta({ title: () => `${t('phase10.title')} – ${t('app.title')}` })

const { completedPhases, scores, totalScore, phaseSetKey, load, selectPhaseSet, togglePhase, addScore, removeScore, reset } = usePhase10()
const { savePhase10Game } = useGameHistory()

function resolvePhaseList(key: 'phase10.phaseList' | 'phase10.phaseListAlt') {
  const raw = tm(key as string)
  if (!Array.isArray(raw)) return []
  return (raw as any[]).map((p, i) => ({
    id: i + 1,
    description: typeof p === 'object' && p.description ? rt(p.description) : String(p)
  }))
}

const classicPhases = computed(() => resolvePhaseList('phase10.phaseList'))
const altPhases = computed(() => resolvePhaseList('phase10.phaseListAlt'))

const phases = computed(() =>
  phaseSetKey.value === 'alt' ? altPhases.value : classicPhases.value
)

const allPhasesCompleted = computed(() =>
  phases.value.length > 0 && completedPhases.value.length >= phases.value.length
)

const currentPhase = computed(() => {
  for (const phase of phases.value) {
    if (!completedPhases.value.includes(phase.id)) return phase
  }
  return null
})

const phaseSets = computed(() => [
  {
    key: 'classic' as PhaseSetKey,
    name: t('phase10.phaseSetClassicName'),
    phases: classicPhases.value.map(p => p.description)
  },
  {
    key: 'alt' as PhaseSetKey,
    name: t('phase10.phaseSetAltName'),
    phases: altPhases.value.map(p => p.description)
  }
])

const activeSetName = computed(() =>
  phaseSetKey.value === 'alt' ? t('phase10.phaseSetAltName') : t('phase10.phaseSetClassicName')
)

const cardValueRows = computed(() => {
  const raw = (tm('phase10.cardValuesRows') as any[])
  if (!Array.isArray(raw)) return []
  return (raw as any[]).map(r => ({
    label: typeof r === 'object' && r.label ? rt(r.label) : '',
    value: typeof r === 'object' && r.value ? rt(r.value) : ''
  }))
})

const scoreInput = ref<string>('')
const confirmReset = ref(false)

// Multiplayer
const {
  roomCode: mpRoom,
  playerName: mpPlayerName,
  connected: mpConnected,
  connecting: mpConnecting,
  otherPlayers: mpOtherPlayers,
  connectionError: mpError,
  generateRoomCode,
  connect: mpConnect,
  sendUpdate: mpSendUpdate,
  close: mpClose
} = usePhase10Multiplayer()

const mpExpanded = ref(false)
const mpMode = ref<'create' | 'join'>('create')
const mpNameInput = ref('')
const mpRoomInput = ref('')

async function startMultiplayer() {
  const room = mpMode.value === 'create' ? generateRoomCode() : mpRoomInput.value
  if (!mpNameInput.value.trim() || !room.trim()) return
  await mpConnect(room, mpNameInput.value).catch(() => {})
}

// Sync local state to room whenever it changes
watch(
  [completedPhases, totalScore, phaseSetKey],
  () => {
    if (mpConnected.value) {
      mpSendUpdate(completedPhases.value, totalScore.value, phaseSetKey.value)
    }
  },
  { deep: true }
)

// Send initial state when connecting mid-game
watch(mpConnected, (val) => {
  if (val && phaseSetKey.value !== null) {
    mpSendUpdate(completedPhases.value, totalScore.value, phaseSetKey.value)
  }
})

// Adopt the room's phase set when joining — only if the local game hasn't started yet.
// This ensures all players always play with the same variant.
watch(
  () => mpOtherPlayers.value.map(p => p.state?.phaseSetKey).find(k => k != null),
  (remoteKey) => {
    if (!mpConnected.value || !remoteKey) return
    if (completedPhases.value.length === 0 && scores.value.length === 0) {
      selectPhaseSet(remoteKey as PhaseSetKey)
    }
  }
)

const validScore = computed(() => {
  const n = Number(scoreInput.value)
  return scoreInput.value !== '' && Number.isFinite(n) && n >= 0
})

function isCompleted(id: number) {
  return completedPhases.value.includes(id)
}

function submitScore() {
  if (!validScore.value) return
  addScore(Number(scoreInput.value))
  scoreInput.value = ''
}

function doReset() {
  if (phaseSetKey.value && (completedPhases.value.length > 0 || scores.value.length > 0)) {
    savePhase10Game({
      phaseSetKey: phaseSetKey.value,
      phasesCompleted: completedPhases.value.length,
      totalPhases: phases.value.length,
      totalScore: totalScore.value
    })
  }
  reset()
  confirmReset.value = false
}

onMounted(load)
</script>
