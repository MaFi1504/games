<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="needRefresh"
        class="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
      >
        <UCard class="max-w-lg mx-auto shadow-2xl">
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <h3 class="font-semibold mb-1">
                {{ $t('pwa.updateAvailable') }}
              </h3>
              <p class="text-sm text-muted">
                {{ $t('pwa.updateDescription') }}
              </p>
            </div>
          </div>
          <template #footer>
            <div class="flex gap-2 justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                @click="close"
              >
                {{ $t('pwa.later') }}
              </UButton>
              <UButton
                color="primary"
                size="sm"
                @click="update"
              >
                {{ $t('pwa.updateNow') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useI18n()

// Only import in client-side
const needRefresh = ref(false)
const updateServiceWorker = ref<((reloadPage?: boolean) => Promise<void>) | null>(null)

onMounted(async () => {
  if (import.meta.client) {
    try {
      const { useRegisterSW } = await import('virtual:pwa-register/vue')
      const {
        needRefresh: swNeedRefresh,
        updateServiceWorker: swUpdateServiceWorker
      } = useRegisterSW({
        onRegisteredSW(swScriptUrl, registration) {
          if (registration) {
            // Check for updates every hour
            setInterval(() => {
              registration.update()
            }, 3600000)
          }
        }
      })
      
      needRefresh.value = swNeedRefresh.value
      updateServiceWorker.value = swUpdateServiceWorker
      
      // Watch for changes
      watch(swNeedRefresh, (value) => {
        needRefresh.value = value
      })
    } catch (e) {
      // PWA not available
      console.log('PWA registration not available')
    }
  }
})

function close() {
  needRefresh.value = false
}

async function update() {
  if (updateServiceWorker.value) {
    await updateServiceWorker.value(true)
  }
}
</script>
