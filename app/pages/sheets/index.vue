<template>
  <UContainer class="py-10 px-4">
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold mb-2">
        {{ $t('sheets.title') }}
      </h1>
      <p class="text-muted text-base">
        {{ $t('sheets.subtitle') }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="game in games"
        :key="game.id"
        :to="game.route"
        class="group"
      >
        <UCard class="h-full active:scale-[0.98] transition-transform cursor-pointer">
          <div class="flex items-start gap-4">
            <div class="text-4xl leading-none mt-1">
              {{ game.emoji }}
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                {{ game.name }}
              </h2>
              <p class="text-sm text-muted mb-3 leading-relaxed">
                {{ game.description }}
              </p>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in game.tags"
                  :key="tag"
                  variant="subtle"
                  color="neutral"
                  size="sm"
                >
                  {{ tag }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const { t, tm, rt } = useI18n()

useSeoMeta({ title: () => t('sheets.title') })

const games = computed(() => [
  {
    id: 'phase10',
    name: t('games.phase10.name'),
    emoji: '🃏',
    route: '/sheets/phase10',
    description: t('games.phase10.description'),
    tags: Array.isArray(tm('games.phase10.tags'))
      ? (tm('games.phase10.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  },
  {
    id: 'kniffel',
    name: t('games.kniffel.name'),
    emoji: '🎲',
    route: '/sheets/kniffel',
    description: t('games.kniffel.description'),
    tags: Array.isArray(tm('games.kniffel.tags'))
      ? (tm('games.kniffel.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  },
  {
    id: 'notizblock',
    name: t('games.notizblock.name'),
    emoji: '📝',
    route: '/sheets/notizblock',
    description: t('games.notizblock.description'),
    tags: Array.isArray(tm('games.notizblock.tags'))
      ? (tm('games.notizblock.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  },
  {
    id: 'wizard',
    name: t('games.wizard.name'),
    emoji: '🧙',
    route: '/sheets/wizard',
    description: t('games.wizard.description'),
    tags: Array.isArray(tm('games.wizard.tags'))
      ? (tm('games.wizard.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  },
  {
    id: 'nochmal',
    name: t('games.nochmal.name'),
    emoji: '🎲',
    route: '/sheets/nochmal',
    description: t('games.nochmal.description'),
    tags: Array.isArray(tm('games.nochmal.tags'))
      ? (tm('games.nochmal.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  }
])
</script>
