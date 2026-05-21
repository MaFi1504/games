<template>
  <UModal
    :open="open"
    @update:open="$emit('update:open', $event)"
  >
    <template #content>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-base">
            {{ title }}
          </h3>
        </template>

        <p class="text-sm text-muted leading-relaxed">
          {{ body }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              :label="cancelLabel"
              @click="$emit('update:open', false)"
            />
            <UButton
              color="error"
              :label="confirmLabel"
              @click="$emit('confirm')"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
}>()

defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()
</script>
