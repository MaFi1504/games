import { useMultiplayer } from './useMultiplayer'
import type { WizardRoundEntry } from './useWizard'

export interface WizardPlayerState {
  rounds: WizardRoundEntry[]
  total: number
  started?: boolean
}

/**
 * Thin wrapper around useMultiplayer scoped to the Wizard game.
 * Each player broadcasts their own rounds (bid, bidLocked, tricks) and running total.
 */
export function useWizardMultiplayer() {
  const mp = useMultiplayer<WizardPlayerState>({ game: 'wizard' })

  function sendUpdate(rounds: WizardRoundEntry[], total: number, started: boolean) {
    mp.sendUpdate({ rounds, total, started })
  }

  return { ...mp, sendUpdate }
}
