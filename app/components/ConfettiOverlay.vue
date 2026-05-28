<template>
  <!-- Confetti overlay -->
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 pointer-events-none overflow-hidden z-40"
    >
      <div
        v-for="p in confettiPieces"
        :key="p.id"
        class="confetti-piece absolute top-0"
        :style="{
          left: p.left,
          backgroundColor: p.color,
          animationDuration: p.duration,
          animationDelay: p.delay,
          width: p.width,
          height: p.height,
          borderRadius: p.borderRadius
        }"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show?: boolean
  pieceCount?: number
  colors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  pieceCount: 40,
  colors: () => ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
})

const confettiPieces = computed(() =>
  Array.from({ length: props.pieceCount }, (_, i) => ({
    id: i,
    left: `${((i * 97 + 3) % 100).toFixed(1)}%`,
    color: props.colors[i % props.colors.length],
    duration: `${(3 + ((i * 23) % 30) / 10).toFixed(1)}s`,
    delay: `-${(((i * 31) % 30) / 10).toFixed(1)}s`,
    width: i % 3 === 0 ? '10px' : '7px',
    height: i % 3 === 0 ? '7px' : '10px',
    borderRadius: i % 5 === 0 ? '50%' : '2px'
  }))
)
</script>

<style scoped>
.confetti-piece {
  will-change: transform;
  animation: confettiFall linear infinite;
}

@keyframes confettiFall {
  0% {
    transform: translateY(-12px) rotate(0deg);
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(105vh) rotate(720deg);
    opacity: 0;
  }
}
</style>
