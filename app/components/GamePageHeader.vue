<template>
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
      {{ title }}
    </h1>
    <UButton
      icon="i-lucide-rotate-ccw"
      variant="ghost"
      color="neutral"
      size="md"
      :aria-label="resetAriaLabel"
      :disabled="resetDisabled"
      class="shrink-0"
      @click="$emit('reset')"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  resetAriaLabel: string
  resetDisabled?: boolean
}>()

defineEmits<{
  reset: []
}>()
</script>
