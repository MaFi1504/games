<template>
  <div
    class="flex items-center gap-3 p-2 rounded-lg"
    :class="cat.scored ? 'bg-success/10' : ''"
  >
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium">
        {{ $t(`kniffel.categories.${cat.id}`) }}
        <span v-if="showFixedHint && fixedPoints !== null" class="text-muted">
          ({{ fixedPoints }})
        </span>
      </p>
    </div>
    <div class="flex items-center gap-2">
      <template v-if="!cat.scored">
        <!-- Checkbox for fixed-value categories -->
        <button
          v-if="fixedPoints !== null"
          type="button"
          class="w-6 h-6 rounded border-2 border-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
          @click="$emit('scoreFixed', cat.id)"
        >
          <UIcon name="i-lucide-check" class="w-4 h-4 text-primary opacity-0" />
        </button>
        <!-- Input field for variable-value categories -->
        <UInput
          v-else
          :model-value="inputValue"
          type="number"
          min="0"
          inputmode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          class="w-20"
          size="sm"
          @update:model-value="$emit('update:inputValue', $event)"
          @keydown.enter="$emit('scoreInput', cat.id)"
          @blur="$emit('scoreInput', cat.id)"
        />
      </template>
      <div v-else class="flex items-center gap-2 w-20">
        <span class="tabular-nums text-sm font-semibold flex-1 text-right">
          {{ cat.value }}
        </span>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="xs"
          :aria-label="$t('kniffel.removeScore')"
          @click="$emit('remove', cat.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KniffelCategory } from '~/composables/useKniffel'

defineProps<{
  cat: KniffelCategory
  fixedPoints: number | null
  inputValue: string | undefined
  showFixedHint?: boolean
}>()

defineEmits<{
  scoreFixed: [id: string]
  scoreInput: [id: string]
  remove: [id: string]
  'update:inputValue': [value: string]
}>()
</script>
