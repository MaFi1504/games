<script setup lang="ts">
import { useGameHistory, type Phase10HistoryEntry, type KniffelHistoryEntry } from '~/composables/useGameHistory'

const { locale, locales, setLocale, t } = useI18n()
const appConfig = useAppConfig()
const route = useRoute()
const { phase10History, kniffelHistory, init, clearPhase10History, clearKniffelHistory } = useGameHistory()

onMounted(init)

const isPhase10 = computed(() => route.path === '/sheets/phase10')
const isKniffel = computed(() => route.path === '/sheets/kniffel')
const isInSheets = computed(() => route.path.startsWith('/sheets/'))

interface HistoryGroup {
  key: string
  label: string
  avgScore: number
  entries: (Phase10HistoryEntry | KniffelHistoryEntry)[]
}

const groupedHistory = computed((): HistoryGroup[] => {
  if (isPhase10.value) {
    const map = new Map<string, Phase10HistoryEntry[]>()
    for (const entry of phase10History.value) {
      if (!map.has(entry.phaseSetKey)) map.set(entry.phaseSetKey, [])
      map.get(entry.phaseSetKey)!.push(entry)
    }
    return [...map.entries()]
      .map(([key, entries]) => ({
        key,
        label: key === 'alt' ? t('phase10.phaseSetAltName') : t('phase10.phaseSetClassicName'),
        avgScore: Math.round(entries.reduce((s, e) => s + e.totalScore, 0) / entries.length),
        entries
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
  if (isKniffel.value) {
    const map = new Map<string, KniffelHistoryEntry[]>()
    for (const entry of kniffelHistory.value) {
      if (!map.has(entry.variant)) map.set(entry.variant, [])
      map.get(entry.variant)!.push(entry)
    }
    return [...map.entries()]
      .map(([key, entries]) => ({
        key,
        label: key === 'extrem' ? t('kniffel.variantExtrem') : t('kniffel.variantStandard'),
        avgScore: Math.round(entries.reduce((s, e) => s + e.totalScore, 0) / entries.length),
        entries
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
  return []
})

const hasHistory = computed(() => groupedHistory.value.length > 0)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function clearActiveHistory() {
  if (isPhase10.value) clearPhase10History()
  else if (isKniffel.value) clearKniffelHistory()
}

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#4f46e5' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { rel: 'apple-touch-icon', href: '/icon-192.png' }
  ],
  htmlAttrs: {
    lang: locale
  }
})

useSeoMeta({
  title: () => t('app.title'),
  description: () => t('app.subtitle')
})

async function switchLocale(code: 'en' | 'de') {
  await setLocale(code)
}
</script>

<template>
  <UApp>
    <UHeader :ui="{ toggle: '!block', content: '!block', overlay: '!block' }">
      <template #left>
        <NuxtLink to="/">
          <span class="text-lg font-bold tracking-tight">{{ $t('app.title') }}</span>
        </NuxtLink>
        <template v-if="isInSheets">
          <span class="text-muted mx-1.5">/</span>
          <NuxtLink to="/sheets">
            <span class="text-lg font-bold tracking-tight">{{ $t('sheets.title') }}</span>
          </NuxtLink>
        </template>
      </template>

      <template #right>
        <div class="flex items-center rounded-md overflow-hidden border border-default">
          <UButton
            v-for="l in (locales as { code: string, name: string }[])"
            :key="l.code"
            :label="l.code.toUpperCase()"
            :variant="locale === l.code ? 'solid' : 'ghost'"
            color="neutral"
            size="sm"
            class="rounded-none"
            @click="switchLocale(l.code as 'en' | 'de')"
          />
        </div>
        <UColorModeButton />
      </template>

      <template
        v-if="isPhase10 || isKniffel"
        #body
      >
        <div class="flex items-center justify-between mb-3">
          <p class="font-semibold text-sm uppercase tracking-wide text-muted">
            {{ $t('history.title') }}
          </p>
          <UButton
            v-if="hasHistory"
            icon="i-lucide-trash-2"
            variant="ghost"
            color="neutral"
            size="xs"
            :aria-label="$t('history.clearHistory')"
            @click="clearActiveHistory"
          />
        </div>

        <div
          v-if="!hasHistory"
          class="text-sm text-muted text-center py-4"
        >
          {{ $t('history.noGames') }}
        </div>

        <div
          v-else
          class="space-y-5"
        >
          <div
            v-for="group in groupedHistory"
            :key="group.key"
          >
            <!-- Group header -->
            <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-default">
              <p class="text-sm font-semibold">
                {{ group.label }}
              </p>
              <span class="text-xs text-muted">
                {{ $t('history.avgScore') }}
                <span class="font-semibold tabular-nums text-default">{{ group.avgScore }}</span>
              </span>
            </div>

            <!-- Entries -->
            <div class="space-y-2">
              <div
                v-for="(entry, i) in group.entries"
                :key="i"
                class="rounded-lg border border-default p-3"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs text-muted tabular-nums">{{ formatDate(entry.date) }}</span>
                  <UBadge
                    v-if="isPhase10"
                    :color="(entry as Phase10HistoryEntry).phasesCompleted === (entry as Phase10HistoryEntry).totalPhases ? 'success' : 'error'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ (entry as Phase10HistoryEntry).phasesCompleted === (entry as Phase10HistoryEntry).totalPhases ? $t('history.won') : $t('history.lost') }}
                  </UBadge>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p class="text-xs text-muted mb-0.5">
                      {{ $t('history.score') }}
                    </p>
                    <p class="text-lg font-bold tabular-nums leading-none">
                      {{ entry.totalScore }}
                    </p>
                  </div>
                  <div v-if="isPhase10">
                    <p class="text-xs text-muted mb-0.5">
                      {{ $t('history.phases') }}
                    </p>
                    <p class="text-lg font-bold tabular-nums leading-none">
                      {{ (entry as Phase10HistoryEntry).phasesCompleted }}<span class="text-muted text-sm">/{{ (entry as Phase10HistoryEntry).totalPhases }}</span>
                    </p>
                  </div>
                  <div v-else-if="isKniffel">
                    <p class="text-xs text-muted mb-0.5">
                      {{ $t('history.categories') }}
                    </p>
                    <p class="text-lg font-bold tabular-nums leading-none">
                      {{ (entry as KniffelHistoryEntry).categoriesScored }}<span class="text-muted text-sm">/{{ (entry as KniffelHistoryEntry).totalCategories }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          {{ $t('app.title') }} • {{ new Date().getFullYear() }} • v{{ appConfig.version }}
        </p>
      </template>
      <template #right>
        <NuxtLink
          to="/credits"
          class="text-sm text-muted hover:text-default transition-colors"
        >
          {{ $t('app.credits') }}
        </NuxtLink>
      </template>
    </UFooter>

    <ClientOnly>
      <PwaUpdatePrompt />
    </ClientOnly>
  </UApp>
</template>
