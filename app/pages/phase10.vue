<template>
  <div class="min-h-screen pb-32">
    <UContainer class="py-4 px-4 max-w-lg">
      <!-- Header row -->
      <div class="flex items-center gap-2 mb-4">
        <UButton
          to="/"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="md"
          :aria-label="$t('nav.back')"
          class="shrink-0"
        />
        <h1 class="text-xl font-bold flex-1">
          {{ $t('phase10.title') }}
        </h1>
        <UButton
          icon="i-lucide-rotate-ccw"
          variant="ghost"
          color="neutral"
          size="md"
          :aria-label="$t('phase10.resetGame')"
          class="shrink-0"
          @click="confirmReset = true"
        />
      </div>

      <!-- Phase set selection (shown when no game started yet) -->
      <template v-if="!phaseSetKey">
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

    <!-- Reset confirmation modal -->
    <UModal v-model:open="confirmReset">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold text-base">
              {{ $t('phase10.resetTitle') }}
            </h3>
          </template>
          <p class="text-sm text-muted leading-relaxed">
            {{ $t('phase10.resetBody') }}
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                :label="$t('phase10.cancel')"
                @click="confirmReset = false"
              />
              <UButton
                color="error"
                :label="$t('phase10.reset')"
                @click="doReset"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { usePhase10, type PhaseSetKey } from '~/composables/usePhase10'

const { t, tm, rt } = useI18n()

useSeoMeta({ title: () => `${t('phase10.title')} – ${t('app.title')}` })

const { completedPhases, scores, totalScore, phaseSetKey, load, selectPhaseSet, togglePhase, addScore, removeScore, reset } = usePhase10()

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
  reset()
  confirmReset.value = false
}

onMounted(load)
</script>
