<template>
  <div class="min-h-screen pb-32">
    <UContainer class="py-4 px-4 max-w-lg">
      <GamePageHeader
        :title="$t('kniffel.title')"
        :reset-aria-label="$t('kniffel.resetGame')"
        @reset="confirmReset = true"
      />

      <!-- Variant selection (shown when no game started yet) -->
      <template v-if="!variant">
        <!-- Multiplayer setup -->
        <MultiplayerSetup
          :connected="mpConnected"
          :connecting="mpConnecting"
          :error="mpError"
          :room="mpRoom"
          :player-name="mpPlayerName"
          @connect="(name, room) => mpConnect(room, name).catch(() => {})"
          @disconnect="mpClose"
        />

        <p class="text-sm text-muted mb-4 text-center">
          {{ $t('kniffel.selectVariantSubtitle') }}
        </p>
        <div class="grid grid-cols-1 gap-3">
          <button
            type="button"
            class="text-left p-4 rounded-xl border border-default hover:border-primary hover:bg-primary/5 active:scale-[0.99] transition-all"
            @click="selectVariant('standard')"
          >
            <p class="font-semibold mb-2">
              {{ $t('kniffel.variantStandard') }}
            </p>
            <p class="text-sm text-muted">
              {{ $t('kniffel.variantStandardDescription') }}
            </p>
          </button>
          <button
            type="button"
            class="text-left p-4 rounded-xl border border-default hover:border-primary hover:bg-primary/5 active:scale-[0.99] transition-all"
            @click="selectVariant('extrem')"
          >
            <p class="font-semibold mb-2">
              {{ $t('kniffel.variantExtrem') }}
            </p>
            <p class="text-sm text-muted">
              {{ $t('kniffel.variantExtremDescription') }}
            </p>
          </button>
        </div>
      </template>

      <template v-else>
        <!-- Variant indicator -->
        <div class="flex items-center gap-2 mb-4">
          <UBadge
            color="primary"
            variant="subtle"
            size="sm"
          >
            {{ variant === 'standard' ? $t('kniffel.variantStandard') : $t('kniffel.variantExtrem') }}
          </UBadge>
          <UBadge
            v-if="mpConnected"
            color="success"
            variant="subtle"
            size="sm"
            class="flex items-center gap-1 font-mono"
          >
            <UIcon
              name="i-lucide-users"
              class="w-3 h-3"
            />
            {{ mpRoom }}
          </UBadge>
        </div>

        <!-- Win banner -->
        <UAlert
          v-if="allCategoriesScored"
          icon="i-lucide-trophy"
          color="success"
          variant="subtle"
          :title="$t('kniffel.winTitle')"
          :description="$t('kniffel.winDescription', { score: totalScore })"
          class="mb-4"
        />

        <!-- Score summary -->
        <UCard class="mb-4">
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <p class="text-xs text-muted mb-1 uppercase tracking-wide">
                {{ $t('kniffel.totalScore') }}
              </p>
              <p class="text-5xl font-bold tabular-nums leading-none">
                {{ totalScore }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1 uppercase tracking-wide">
                {{ $t('kniffel.categoriesScored') }}
              </p>
              <p class="text-5xl font-bold tabular-nums leading-none">
                {{ scoredCount }}<span class="text-muted text-3xl">/{{ categoryList.length }}</span>
              </p>
            </div>
          </div>

          <!-- Multiplayer: other players' progress -->
          <template v-if="mpConnected">
            <USeparator class="mt-4 mb-3" />
            <p class="text-xs text-muted uppercase tracking-wide mb-2">
              {{ $t('mp.otherPlayers') }}
            </p>
            <p
              v-if="mpOtherPlayers.length === 0"
              class="text-sm text-muted italic text-center py-1"
            >
              {{ $t('mp.waitingForPlayers') }}
            </p>
            <div
              v-else
              class="space-y-3"
            >
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
                        :style="{ width: `${Math.min(100, ((Object.values(player.state?.categories ?? {}).filter(v => v !== null && v !== undefined).length) / categoryList.length) * 100)}%` }"
                      />
                    </div>
                    <span class="text-xs text-muted tabular-nums shrink-0">
                      {{ Object.values(player.state?.categories ?? {}).filter(v => v !== null && v !== undefined).length }}/{{ categoryList.length }}
                    </span>
                  </div>
                </div>
                <p class="tabular-nums font-semibold text-sm shrink-0">
                  {{ player.state?.totalScore ?? 0 }}
                </p>
              </div>
            </div>
          </template>
        </UCard>

        <!-- Upper Section -->
        <UCard class="mb-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-base">
              {{ $t('kniffel.upperSection') }}
            </h2>
            <p class="text-xs text-muted">
              {{ upperSectionScore }}/{{ bonusThreshold }}
            </p>
          </div>

          <div class="space-y-1">
            <KniffelCategoryRow
              v-for="cat in upperCategories"
              :key="cat.id"
              v-model:input-value="categoryInputs[cat.id]"
              :cat="cat"
              :fixed-points="getFixedPoints(cat.id)"
              @score-fixed="scoreFixedCategory"
              @score-input="scoreFromInput"
              @remove="removeScore"
            />
          </div>

          <USeparator class="my-3" />

          <div class="flex items-center justify-between py-2">
            <span class="text-sm font-medium">
              {{ $t('kniffel.bonus') }} (≥{{ bonusThreshold }})
            </span>
            <span class="tabular-nums text-sm font-semibold">
              {{ upperSectionBonus }}
            </span>
          </div>
          <div class="flex items-center justify-between py-2 border-t border-default">
            <span class="text-sm font-semibold">{{ $t('kniffel.upperTotal') }}</span>
            <span class="tabular-nums text-lg font-bold">
              {{ upperSectionTotal }}
            </span>
          </div>
        </UCard>

        <!-- Lower Section -->
        <UCard class="mb-4">
          <h2 class="font-semibold text-base mb-3">
            {{ $t('kniffel.lowerSection') }}
          </h2>

          <div class="space-y-1">
            <KniffelCategoryRow
              v-for="cat in lowerCategories"
              :key="cat.id"
              v-model:input-value="categoryInputs[cat.id]"
              :cat="cat"
              :fixed-points="getFixedPoints(cat.id)"
              :show-fixed-hint="true"
              @score-fixed="scoreFixedCategory"
              @score-input="scoreFromInput"
              @remove="removeScore"
            />
          </div>

          <USeparator class="my-3" />

          <div class="flex items-center justify-between py-2 border-t border-default">
            <span class="text-sm font-semibold">{{ $t('kniffel.lowerTotal') }}</span>
            <span class="tabular-nums text-lg font-bold">
              {{ lowerSectionScore }}
            </span>
          </div>
        </UCard>
      </template>
    </UContainer>

    <ConfirmResetModal
      v-model:open="confirmReset"
      :title="$t('kniffel.resetTitle')"
      :body="$t('kniffel.resetBody')"
      :cancel-label="$t('kniffel.cancel')"
      :confirm-label="$t('kniffel.reset')"
      @confirm="handleReset"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { UPPER_SECTION_IDS } from '~/composables/useKniffel'
import { useGameHistory } from '~/composables/useGameHistory'
import { useKniffelMultiplayer } from '~/composables/useKniffelMultiplayer'

const { t } = useI18n()

useSeoMeta({ title: () => t('kniffel.title') })

const {
  variant,
  categoryList,
  upperSectionScore,
  upperSectionBonus,
  upperSectionTotal,
  lowerSectionScore,
  totalScore,
  allCategoriesScored,
  scoredCount,
  bonusThreshold,
  bonusValue: _bonusValue,
  load,
  selectVariant,
  scoreCategory,
  removeScore: removeScoreInternal,
  reset,
  getFixedPoints
} = useKniffel()

const upperCategories = computed(() =>
  categoryList.value.filter(cat => UPPER_SECTION_IDS.includes(cat.id))
)

const lowerCategories = computed(() =>
  categoryList.value.filter(cat => !UPPER_SECTION_IDS.includes(cat.id))
)

const { saveKniffelGame } = useGameHistory()

const confirmReset = ref(false)
const categoryInputs = reactive<Record<string, string>>({})

// Multiplayer
const {
  roomCode: mpRoom,
  playerName: mpPlayerName,
  connected: mpConnected,
  connecting: mpConnecting,
  otherPlayers: mpOtherPlayers,
  connectionError: mpError,
  connect: mpConnect,
  sendUpdate: mpSendUpdate,
  close: mpClose
} = useKniffelMultiplayer()

const categoriesRecord = computed(() =>
  Object.fromEntries(categoryList.value.map(cat => [cat.id, cat.value]))
)

// Sync local state to room whenever it changes
watch(
  [categoriesRecord, totalScore, variant],
  () => {
    if (mpConnected.value) {
      mpSendUpdate(categoriesRecord.value, variant.value, totalScore.value)
    }
  },
  { deep: true }
)

// Send initial state when connecting mid-game
watch(mpConnected, (val) => {
  if (val && variant.value !== null) {
    mpSendUpdate(categoriesRecord.value, variant.value, totalScore.value)
  }
})

// Adopt the room's variant when joining — only if the local game hasn't started yet.
watch(
  () => mpOtherPlayers.value.map(p => p.state?.variant).find(v => v != null),
  (remoteVariant) => {
    if (!mpConnected.value || !remoteVariant) return
    if (variant.value === null) {
      selectVariant(remoteVariant)
    }
  }
)

function scoreFromInput(categoryId: string) {
  const inputValue = categoryInputs[categoryId]
  if (inputValue && String(inputValue).trim() !== '') {
    const score = Number(inputValue) || 0
    if (score >= 0) {
      scoreCategory(categoryId, score)
      Reflect.deleteProperty(categoryInputs, categoryId)
    }
  }
}

function removeScore(categoryId: string) {
  removeScoreInternal(categoryId)
}

function scoreFixedCategory(categoryId: string) {
  const fixedPoints = getFixedPoints(categoryId)
  if (fixedPoints !== null) {
    scoreCategory(categoryId, fixedPoints)
  }
}

function handleReset() {
  if (variant.value && scoredCount.value > 0) {
    saveKniffelGame({
      variant: variant.value,
      totalScore: totalScore.value,
      categoriesScored: scoredCount.value,
      totalCategories: categoryList.value.length
    })
  }
  reset()
  Object.keys(categoryInputs).forEach(key => Reflect.deleteProperty(categoryInputs, key))
  confirmReset.value = false
}

onMounted(() => {
  load()
})
</script>
