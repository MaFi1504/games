<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()
const appConfig = useAppConfig()
const route = useRoute()

const isPhase10 = computed(() => route.path === '/sheets/phase10')
const isKniffel = computed(() => route.path === '/sheets/kniffel')
const isInSheets = computed(() => route.path.startsWith('/sheets/'))
const isSudoku = computed(() => route.path === '/sudoku')

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
        v-if="isPhase10 || isKniffel || isSudoku"
        #body
      >
        <LazyGameHistorySidebar />
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
