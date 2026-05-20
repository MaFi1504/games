import { useMultiplayer } from './useMultiplayer'
import type { KniffelVariant } from './useKniffel'

export interface KniffelPlayerState {
  categories: Record<string, number | null>
  variant: KniffelVariant | null
  totalScore: number
}

/**
 * Thin wrapper around useMultiplayer scoped to the Kniffel game.
 * The generic `state` field is typed as KniffelPlayerState.
 */
export function useKniffelMultiplayer() {
  const mp = useMultiplayer<KniffelPlayerState>({ game: 'kniffel' })

  function sendUpdate(
    categories: Record<string, number | null>,
    variant: KniffelVariant | null,
    totalScore: number
  ) {
    mp.sendUpdate({ categories, variant, totalScore })
  }

  return { ...mp, sendUpdate }
}
