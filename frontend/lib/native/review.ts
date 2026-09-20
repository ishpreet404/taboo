// Native store rating prompt. The OS decides whether the dialog actually appears
// (both stores rate-limit it), so we only choose a good moment: right after a win,
// never on first launch, never more than once every couple of months.

import { isNative } from './device'

const STATE_KEY = 'iw_review_state'
const MIN_GAMES = 2
const MIN_DAYS_BETWEEN_PROMPTS = 60

interface ReviewState {
  gamesFinished: number
  lastPromptAt: number
}

function readState(): ReviewState {
  try {
    return { gamesFinished: 0, lastPromptAt: 0, ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}') }
  } catch {
    return { gamesFinished: 0, lastPromptAt: 0 }
  }
}

/** Call once per finished game. */
export async function recordGameFinished(playerWon: boolean) {
  const state = readState()
  state.gamesFinished += 1
  const dueAgain = Date.now() - state.lastPromptAt > MIN_DAYS_BETWEEN_PROMPTS * 24 * 60 * 60 * 1000
  const shouldAsk = isNative() && playerWon && state.gamesFinished >= MIN_GAMES && dueAgain
  if (shouldAsk) state.lastPromptAt = Date.now()
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable
  }
  if (!shouldAsk) return
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review')
    // Let the victory screen land first
    setTimeout(() => void InAppReview.requestReview().catch(() => {}), 2500)
  } catch {
    // plugin unavailable
  }
}
