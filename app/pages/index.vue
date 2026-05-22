<template>
  <UContainer class="py-10 px-4">
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold mb-2">
        {{ $t('app.title') }}
      </h1>
      <p class="text-muted text-base">
        {{ $t('app.subtitle') }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="app in apps"
        :key="app.id"
        :to="app.route"
        class="group"
      >
        <UCard class="h-full active:scale-[0.98] transition-transform cursor-pointer">
          <div class="flex items-start gap-4">
            <div class="text-4xl leading-none mt-1">
              {{ app.emoji }}
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                {{ app.name }}
              </h2>
              <p class="text-sm text-muted mb-3 leading-relaxed">
                {{ app.description }}
              </p>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in app.tags"
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

useSeoMeta({ title: () => t('app.title') })

const apps = computed(() => [
  {
    id: 'sheets',
    name: t('apps.sheets.name'),
    emoji: '📋',
    route: '/sheets',
    description: t('apps.sheets.description'),
    tags: Array.isArray(tm('apps.sheets.tags'))
      ? (tm('apps.sheets.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  },
  {
    id: 'sudoku',
    name: t('apps.sudoku.name'),
    emoji: '🔢',
    route: '/sudoku',
    description: t('apps.sudoku.description'),
    tags: Array.isArray(tm('apps.sudoku.tags'))
      ? (tm('apps.sudoku.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  },
  {
    id: '2048',
    name: t('apps.2048.name'),
    emoji: '🟨',
    route: '/2048',
    description: t('apps.2048.description'),
    tags: Array.isArray(tm('apps.2048.tags'))
      ? (tm('apps.2048.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  },
  {
    id: 'minesweeper',
    name: t('apps.minesweeper.name'),
    emoji: '💣',
    route: '/minesweeper',
    description: t('apps.minesweeper.description'),
    tags: Array.isArray(tm('apps.minesweeper.tags'))
      ? (tm('apps.minesweeper.tags') as unknown[]).map(tag => rt(tag as string))
      : []
  }
])
</script>
