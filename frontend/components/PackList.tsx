'use client'

import { getPack, isCustomPackKey, PACKS } from '@/lib/game/packCatalog'
import { Check, PenLine } from 'lucide-react'

/** Display name for any pack key, including a room's custom pack. */
export function packDisplayName(key: string, customPackName?: string | null): string {
  if (isCustomPackKey(key)) return customPackName ? `Custom: ${customPackName}` : 'Custom Pack'
  return getPack(key)?.name || 'Standard'
}

export const packColor = (key: string) => (isCustomPackKey(key) ? 'from-rose-500 to-indigo-500' : getPack(key)?.color || 'from-blue-500 to-blue-600')

export const packDescription = (key: string) => (isCustomPackKey(key) ? 'Your own words' : getPack(key)?.description || '')

const CATEGORIES = Array.from(new Set(PACKS.map((p) => p.category)))

interface PackListProps {
  selected: string
  onSelect: (packKey: string) => void
  /** Present only where a room exists to attach a custom pack to (the lobby) */
  onCustom?: () => void
  onClose?: () => void
}

// The rows inside every word-pack dropdown
export default function PackList({ selected, onSelect, onCustom, onClose }: PackListProps) {
  return (
    <div role="listbox" aria-label="Word packs">
      {onCustom && (
        <button
          type="button"
          role="option"
          aria-selected={isCustomPackKey(selected)}
          onClick={() => {
            onClose?.()
            onCustom()
          }}
          className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 border-b border-white/10 ${isCustomPackKey(selected) ? 'bg-white/10' : ''}`}
        >
          <PenLine className="w-4 h-4 text-rose-300 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold bg-gradient-to-r from-rose-400 to-indigo-400 bg-clip-text text-transparent">Custom Pack</span>
            <span className="block text-xs text-gray-400">Write your own words</span>
          </span>
        </button>
      )}

      {CATEGORIES.map((category) => (
        <div key={category}>
          <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{category}</div>
          {PACKS.filter((p) => p.category === category).map((pack) => (
              <button
                key={pack.key}
                type="button"
                role="option"
                aria-selected={selected === pack.key}
                onClick={() => {
                  onClose?.()
                  onSelect(pack.key)
                }}
                className={`w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center gap-3 ${selected === pack.key ? 'bg-white/10' : ''}`}
              >
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-bold bg-gradient-to-r ${pack.color} bg-clip-text text-transparent`}>{pack.name}</span>
                  <span className="block text-xs text-gray-400 leading-tight">{pack.description}</span>
                </span>
                {selected === pack.key && <Check className="w-4 h-4 text-green-500 shrink-0" />}
              </button>
          ))}
        </div>
      ))}
    </div>
  )
}
