import { useMultiplayer } from './useMultiplayer'
import type { PhaseSetKey } from './usePhase10'

export interface Phase10PlayerState {
  phases: number[]
  totalScore: number
  phaseSetKey: PhaseSetKey | null
}

/**
 * Thin wrapper around useMultiplayer scoped to the Phase 10 game.
 * The generic `state` field is typed as Phase10PlayerState.
 */
export function usePhase10Multiplayer() {
  const mp = useMultiplayer<Phase10PlayerState>({ game: 'phase10' })

  function sendUpdate(phases: number[], totalScore: number, phaseSetKey: PhaseSetKey | null) {
    mp.sendUpdate({ phases, totalScore, phaseSetKey })
  }

  return { ...mp, sendUpdate }
}
