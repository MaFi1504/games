<template>
  <UCard class="mb-4">
    <button
      type="button"
      class="w-full flex items-center justify-between"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-users"
          class="w-4 h-4 text-muted"
        />
        <span class="font-medium text-sm">{{ $t('mp.playWithOthers') }}</span>
        <UBadge
          v-if="connected"
          color="success"
          variant="subtle"
          size="xs"
        >
          {{ $t('mp.connected') }}
        </UBadge>
        <UBadge
          v-else-if="reconnecting"
          color="warning"
          variant="subtle"
          size="xs"
        >
          {{ $t('mp.reconnecting') }}
        </UBadge>
      </div>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="w-4 h-4 text-muted"
      />
    </button>

    <div
      v-if="expanded"
      class="mt-4 space-y-3"
    >
      <template v-if="!connected">
        <UInput
          v-model="nameInput"
          :placeholder="$t('mp.namePlaceholder')"
          :disabled="connecting"
          size="sm"
        />
        <div class="flex rounded-lg border border-default overflow-hidden text-sm">
          <button
            type="button"
            class="flex-1 py-2 text-center transition-colors"
            :class="mode === 'create' ? 'bg-primary text-white' : 'hover:bg-muted/40'"
            @click="mode = 'create'"
          >
            {{ $t('mp.createRoom') }}
          </button>
          <button
            type="button"
            class="flex-1 py-2 text-center transition-colors"
            :class="mode === 'join' ? 'bg-primary text-white' : 'hover:bg-muted/40'"
            @click="mode = 'join'"
          >
            {{ $t('mp.joinRoom') }}
          </button>
        </div>
        <UInput
          v-if="mode === 'join'"
          v-model="roomInput"
          :placeholder="$t('mp.roomCodePlaceholder')"
          :disabled="connecting"
          size="sm"
          class="uppercase"
          maxlength="10"
        />
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :description="$t(`mp.error.${error}`, {}, { missingWarn: false }) || $t('mp.error.failed')"
          icon="i-lucide-triangle-alert"
        />
        <UButton
          block
          :loading="connecting"
          :disabled="!nameInput.trim() || (mode === 'join' && !roomInput.trim())"
          @click="handleConnect"
        >
          {{ $t('mp.connect') }}
        </UButton>
      </template>

      <template v-else-if="reconnecting">
        <UAlert
          color="warning"
          variant="subtle"
          :description="$t('mp.reconnectingDescription')"
          icon="i-lucide-refresh-cw"
        />
      </template>

      <template v-else>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted mb-1">
              {{ $t('mp.shareCode') }}
            </p>
            <p class="text-3xl font-bold tracking-widest font-mono">
              {{ room }}
            </p>
            <p class="text-xs text-muted mt-1">
              {{ $t('mp.playingAs', { name: playerName }) }}
            </p>
          </div>
          <UButton
            variant="ghost"
            size="sm"
            color="neutral"
            icon="i-lucide-log-out"
            @click="$emit('disconnect')"
          >
            {{ $t('mp.disconnect') }}
          </UButton>
        </div>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  connected: boolean
  connecting: boolean
  reconnecting?: boolean
  error: string | null
  room: string
  playerName: string
}>()

const emit = defineEmits<{
  connect: [name: string, room: string]
  disconnect: []
}>()

const expanded = ref(false)
const mode = ref<'create' | 'join'>('create')
const nameInput = ref('')
const roomInput = ref('')

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function handleConnect() {
  const resolvedRoom = mode.value === 'create' ? generateRoomCode() : roomInput.value
  if (!nameInput.value.trim() || !resolvedRoom.trim()) return
  emit('connect', nameInput.value, resolvedRoom)
}
</script>
