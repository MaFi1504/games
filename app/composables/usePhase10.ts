import { ref, computed } from 'vue'

export type PhaseSetKey = 'classic' | 'alt'

interface Phase10State {
  completedPhases: number[]
  scores: number[]
  phaseSetKey: PhaseSetKey | null
}

const STORAGE_KEY = 'phase10-game'

export function usePhase10(totalPhases = 10) {
  const completedPhases = ref<number[]>([])
  const scores = ref<number[]>([])
  const phaseSetKey = ref<PhaseSetKey | null>(null)

  const totalScore = computed(() => scores.value.reduce((sum, s) => sum + s, 0))

  const allPhasesCompleted = computed(() =>
    totalPhases > 0 && completedPhases.value.length >= totalPhases
  )

  const currentPhase = computed(() => {
    for (let i = 1; i <= totalPhases; i++) {
      if (!completedPhases.value.includes(i)) return { id: i }
    }
    return null
  })

  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: Phase10State = JSON.parse(raw)
        completedPhases.value = Array.isArray(data.completedPhases) ? data.completedPhases : []
        scores.value = Array.isArray(data.scores) ? data.scores : []
        phaseSetKey.value = data.phaseSetKey ?? null
      }
    }
    catch {
      // ignore corrupt data
    }
  }

  function save() {
    if (!import.meta.client) return
    const state: Phase10State = {
      completedPhases: completedPhases.value,
      scores: scores.value,
      phaseSetKey: phaseSetKey.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function selectPhaseSet(key: PhaseSetKey) {
    phaseSetKey.value = key
    save()
  }

  function togglePhase(id: number) {
    const idx = completedPhases.value.indexOf(id)
    if (idx >= 0) {
      completedPhases.value.splice(idx, 1)
    }
    else {
      completedPhases.value.push(id)
    }
    save()
  }

  function addScore(points: number) {
    if (!Number.isFinite(points) || points < 0) return
    scores.value.push(points)
    save()
  }

  function removeScore(index: number) {
    scores.value.splice(index, 1)
    save()
  }

  function reset() {
    completedPhases.value = []
    scores.value = []
    phaseSetKey.value = null
    save()
  }

  return {
    completedPhases,
    scores,
    totalScore,
    allPhasesCompleted,
    currentPhase,
    phaseSetKey,
    load,
    selectPhaseSet,
    togglePhase,
    addScore,
    removeScore,
    reset
  }
}
