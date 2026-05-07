<template>
  <div class="min-h-screen pb-32">
    <UContainer class="py-4 px-4 max-w-2xl">
      <!-- Header row -->
      <div class="flex items-center gap-2 mb-6">
        <UButton
          to="/"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="md"
          :aria-label="$t('nav.back')"
          class="shrink-0"
        />
        <h1 class="text-2xl font-bold flex-1">
          {{ $t('credits.title') }}
        </h1>
      </div>

      <!-- App Icon Attribution -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-lg font-semibold">
            {{ $t('credits.appIcon') }}
          </h2>
        </template>

        <div class="space-y-4">
          <!-- Icon preview -->
          <div class="flex justify-center py-4">
            <img src="/icon.svg" alt="App Icon" class="w-32 h-32" />
          </div>

          <!-- Attribution details -->
          <div class="space-y-2 text-sm">
            <div class="flex gap-2">
              <span class="font-semibold min-w-20">{{ $t('credits.author') }}:</span>
              <a 
                href="https://commons.wikimedia.org/wiki/User:Silsor" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                Silsor
              </a>
            </div>

            <div class="flex gap-2">
              <span class="font-semibold min-w-20">{{ $t('credits.source') }}:</span>
              <a 
                href="https://commons.wikimedia.org/w/index.php?curid=359539" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                Wikimedia Commons
              </a>
            </div>

            <div class="flex gap-2">
              <span class="font-semibold min-w-20">{{ $t('credits.license') }}:</span>
              <a 
                href="https://creativecommons.org/licenses/by-sa/3.0/" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                CC BY-SA 3.0
              </a>
            </div>

            <div class="flex gap-2">
              <span class="font-semibold min-w-20">{{ $t('credits.changes') }}:</span>
              <span class="text-muted">{{ $t('credits.changesDescription') }}</span>
            </div>
          </div>

          <!-- License explanation -->
          <UAlert 
            color="neutral" 
            variant="subtle"
            icon="i-lucide-info"
            :title="$t('credits.licenseTitle')"
            :description="$t('credits.licenseDescription')"
            class="mt-4"
          />
        </div>
      </UCard>

      <!-- App Information -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">
            {{ $t('credits.aboutApp') }}
          </h2>
        </template>

        <div class="space-y-3 text-sm">
          <p>
            {{ $t('credits.appDescription') }}
          </p>

          <div class="pt-3 border-t border-default">
            <h3 class="font-semibold mb-2">{{ $t('credits.technologies') }}</h3>
            <ul class="list-disc list-inside space-y-1 text-muted">
              <li>Nuxt 4 / Vue 3</li>
              <li>Nuxt UI / Tailwind CSS</li>
              <li>PWA (Progressive Web App)</li>
              <li>localStorage for data persistence</li>
            </ul>
          </div>

          <div class="pt-3 border-t border-default">
            <p class="text-muted">
              {{ $t('credits.copyright', { year: new Date().getFullYear() }) }}
            </p>
          </div>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({ 
  title: () => t('credits.title'),
  description: () => t('credits.appDescription')
})
</script>
