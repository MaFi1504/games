<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
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
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <span class="text-lg font-bold tracking-tight">{{ $t('app.title') }}</span>
        </NuxtLink>
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
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          {{ $t('app.title') }} • {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
