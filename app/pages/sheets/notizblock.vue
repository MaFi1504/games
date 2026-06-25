<template>
  <div class="min-h-screen pb-10">
    <UContainer class="py-4 px-4 max-w-lg">
      <GamePageHeader
        :title="$t('notepad.title')"
        :reset-aria-label="$t('notepad.resetGame')"
        :reset-disabled="players.length === 0"
        @reset="confirmReset = true"
      />

      <UCard class="mb-4">
        <template #header>
          <div>
            <h2 class="font-semibold text-base">
              {{ $t('notepad.setupTitle') }}
            </h2>
            <p class="text-sm text-muted mt-1">
              {{ $t('notepad.setupDescription') }}
            </p>
          </div>
        </template>

        <div class="flex gap-2">
          <UInput
            v-model="newPlayerName"
            class="flex-1"
            size="lg"
            :placeholder="$t('notepad.playerNamePlaceholder')"
            @keydown.enter="submitPlayer"
          />
          <UButton
            icon="i-lucide-user-plus"
            size="lg"
            :label="$t('notepad.addPlayer')"
            :disabled="!newPlayerName.trim()"
            @click="submitPlayer"
          />
        </div>

        <div
          v-if="players.length > 0"
          class="mt-4 space-y-2"
        >
          <div
            v-for="player in players"
            :key="player.id"
            class="flex items-center justify-between rounded-xl border border-default px-3 py-2"
          >
            <span class="font-medium truncate pr-4">{{ player.name }}</span>
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="neutral"
              size="sm"
              :aria-label="$t('notepad.removePlayer')"
              @click="removePlayer(player.id)"
            />
          </div>
        </div>
      </UCard>

      <div
        v-if="playerSummaries.length === 0"
        class="text-center py-10 text-muted"
      >
        <UIcon
          name="i-lucide-notebook-pen"
          class="w-10 h-10 mx-auto mb-3 opacity-60"
        />
        <p class="text-sm leading-relaxed">
          {{ $t('notepad.emptyState') }}
        </p>
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <UCard
          v-for="player in playerSummaries"
          :key="player.id"
        >
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="flex-1 min-w-0 text-left rounded-lg p-2 hover:bg-muted/40 active:bg-muted/60 transition-colors"
              @click="openAddPoints(player.id)"
            >
              <p class="text-xs text-muted uppercase tracking-wide mb-1">
                {{ $t('notepad.addPointsHint') }}
              </p>
              <p class="text-lg font-semibold truncate">
                {{ player.name }}
              </p>
            </button>

            <button
              type="button"
              class="shrink-0 rounded-xl bg-primary/10 px-4 py-3 text-right min-w-28 hover:bg-primary/15 active:bg-primary/20 transition-colors"
              @click="openEntries(player.id)"
            >
              <p class="text-xs text-muted uppercase tracking-wide mb-1">
                {{ $t('notepad.totalScore') }}
              </p>
              <p class="text-3xl font-bold tabular-nums leading-none">
                {{ player.total }}
              </p>
            </button>
          </div>
        </UCard>
      </div>
    </UContainer>

    <UModal v-model:open="addPointsOpen">
      <template #content>
        <UCard>
          <template #header>
            <div>
              <h3 class="font-semibold text-base">
                {{ $t('notepad.addPointsTitle') }}
              </h3>
              <p
                v-if="activePlayer"
                class="text-sm text-muted mt-1"
              >
                {{ activePlayer.name }}
              </p>
            </div>
          </template>

          <div class="space-y-3">
            <UInput
              :model-value="normalizeInput(pointsInput)"
              type="number"
              inputmode="numeric"
              size="lg"
              :placeholder="$t('notepad.pointsPlaceholder')"
              @update:model-value="value => { pointsInput = value }"
              @keydown.enter.prevent="submitPointsFromKeyboard"
            />
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                :label="$t('notepad.cancel')"
                @click="closeAddPoints"
              />
              <UButton
                :label="$t('notepad.add')"
                :disabled="parsedPoints === null || !activePlayerId"
                @click="submitPoints"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="entriesOpen">
      <template #content>
        <UCard>
          <template #header>
            <div>
              <h3 class="font-semibold text-base">
                {{ $t('notepad.entriesTitle') }}
              </h3>
              <p
                v-if="activePlayer"
                class="text-sm text-muted mt-1"
              >
                {{ activePlayer.name }}
              </p>
            </div>
          </template>

          <div
            v-if="activePlayer"
            class="space-y-3"
          >
            <div
              v-if="activePlayer.entries.length === 0"
              class="text-sm text-muted"
            >
              {{ $t('notepad.noEntries') }}
            </div>
            <div
              v-else
              class="space-y-2 max-h-80 overflow-y-auto pr-1"
            >
              <div
                v-for="(entry, index) in activePlayer.entries"
                :key="entry.id"
                class="flex items-center gap-2 rounded-xl border border-default p-3"
              >
                <div class="w-16 text-sm text-muted">
                  {{ $t('notepad.entryLabel', { n: index + 1 }) }}
                </div>
                <UInput
                  :model-value="String(entry.points)"
                  type="number"
                  inputmode="numeric"
                  class="flex-1"
                  @update:model-value="value => updateEntryDraft(entry.id, value)"
                  @blur="() => submitEntryUpdate(entry.id)"
                  @keydown.enter="() => submitEntryUpdate(entry.id)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  :aria-label="$t('notepad.removeEntry')"
                  @click="removeEntryForActivePlayer(entry.id)"
                />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                :label="$t('notepad.close')"
                @click="closeEntries"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <ConfirmResetModal
      v-model:open="confirmReset"
      :title="$t('notepad.resetTitle')"
      :body="$t('notepad.resetBody')"
      :cancel-label="$t('notepad.cancel')"
      :confirm-label="$t('notepad.reset')"
      @confirm="handleReset"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({ title: () => t('notepad.title') })

const {
  players,
  playerSummaries,
  load,
  addPlayer,
  removePlayer,
  addEntry,
  updateEntry,
  removeEntry,
  reset
} = useNotepad()

const newPlayerName = ref('')
const pointsInput = ref<string | number>('')
const confirmReset = ref(false)
const addPointsOpen = ref(false)
const entriesOpen = ref(false)
const activePlayerId = ref<string | null>(null)
const entryDrafts = ref<Record<string, string>>({})

const activePlayer = computed(() =>
  activePlayerId.value
    ? players.value.find(player => player.id === activePlayerId.value) ?? null
    : null
)

function normalizeInput(value: string | number) {
  return typeof value === 'string' ? value : String(value)
}

const parsedPoints = computed(() => {
  const raw = normalizeInput(pointsInput.value)
  if (raw.trim() === '') return null

  const value = Number(raw)
  return Number.isFinite(value) ? value : null
})

onMounted(load)

watch(activePlayer, (player) => {
  entryDrafts.value = player
    ? Object.fromEntries(player.entries.map(entry => [entry.id, String(entry.points)]))
    : {}
}, { immediate: true })

function submitPlayer() {
  if (!newPlayerName.value.trim()) return

  addPlayer(newPlayerName.value)
  newPlayerName.value = ''
}

function openAddPoints(playerId: string) {
  activePlayerId.value = playerId
  pointsInput.value = ''
  addPointsOpen.value = true
}

function closeAddPoints() {
  addPointsOpen.value = false
  pointsInput.value = ''
}

function submitPoints() {
  if (!activePlayerId.value || parsedPoints.value === null) return

  addEntry(activePlayerId.value, parsedPoints.value)
  closeAddPoints()
}

function submitPointsFromKeyboard() {
  if (!activePlayerId.value || parsedPoints.value === null) return

  addEntry(activePlayerId.value, parsedPoints.value)
  pointsInput.value = ''
}

function openEntries(playerId: string) {
  activePlayerId.value = playerId
  entriesOpen.value = true
}

function closeEntries() {
  entriesOpen.value = false
}

function updateEntryDraft(entryId: string, value: string | number) {
  entryDrafts.value = {
    ...entryDrafts.value,
    [entryId]: String(value ?? '')
  }
}

function submitEntryUpdate(entryId: string) {
  if (!activePlayerId.value) return

  const draft = entryDrafts.value[entryId]
  if (typeof draft !== 'string' || draft.trim() === '') return

  const points = Number(draft)
  if (!Number.isFinite(points)) return

  updateEntry(activePlayerId.value, entryId, points)
}

function removeEntryForActivePlayer(entryId: string) {
  if (!activePlayerId.value) return

  removeEntry(activePlayerId.value, entryId)
}

function handleReset() {
  reset()
  confirmReset.value = false
  addPointsOpen.value = false
  entriesOpen.value = false
  activePlayerId.value = null
  pointsInput.value = ''
  entryDrafts.value = {}
}
</script>
