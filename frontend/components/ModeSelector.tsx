'use client'

import { getMode, MODES } from '@/lib/game/packCatalog'
import { Timer, Zap } from 'lucide-react'

interface Props {
  selected: string
  onSelect: (modeKey: string) => void
  /** Only the host picks; everyone else just sees what was picked */
  disabled?: boolean
}

// Game mode picker for the lobby. Modes are presets the game core enforces
// (turn length, words per turn, final-round multiplier) - see packCatalog.js.
export default function ModeSelector({ selected, onSelect, disabled }: Props) {
  const current = getMode(selected)

  return (
    <div className="glass rounded-xl p-3 md:p-4 mb-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
        <Zap className="w-3.5 h-3.5" /> Game mode
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Game mode">
        {MODES.map((mode) => (
          <button
            key={mode.key}
            type="button"
            role="radio"
            aria-checked={selected === mode.key}
            disabled={disabled}
            onClick={() => onSelect(mode.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${selected === mode.key ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {mode.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <Timer className="w-3.5 h-3.5 shrink-0" />
        {current.description}
      </p>
    </div>
  )
}
