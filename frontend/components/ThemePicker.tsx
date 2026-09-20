'use client'

import { PRODUCTS } from '@/lib/appConfig'
import { THEMES } from '@/lib/themes'
import { Lock, Palette } from 'lucide-react'
import { useMonetization } from './MonetizationContext'

// Colour theme swatches on the home screen. Premium themes open the store.
export default function ThemePicker() {
  const { theme, setTheme, isThemeLocked, openStore } = useMonetization()

  return (
    <div className="mt-4 flex items-center justify-center gap-2" role="radiogroup" aria-label="Colour theme">
      <Palette className="w-4 h-4 text-gray-400" aria-hidden="true" />
      {THEMES.map((t) => {
        const locked = isThemeLocked(t.key)
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={theme === t.key}
            aria-label={`${t.name} theme${locked ? ' (premium)' : ''}`}
            title={t.name}
            onClick={() => (locked ? openStore(PRODUCTS.allAccess) : setTheme(t.key))}
            style={{ background: t.swatch }}
            className={`relative w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${theme === t.key ? 'border-white scale-110' : 'border-white/30'}`}
          >
            {locked && <Lock className="absolute inset-0 m-auto w-3 h-3 text-yellow-300" />}
          </button>
        )
      })}
    </div>
  )
}
