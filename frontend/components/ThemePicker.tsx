'use client'

import { THEMES } from '@/lib/themes'
import { Palette } from 'lucide-react'
import { useTheme } from './ThemeContext'

// Colour theme swatches on the home screen
export default function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="mt-4 flex items-center justify-center gap-2" role="radiogroup" aria-label="Colour theme">
      <Palette className="w-4 h-4 text-gray-400" aria-hidden="true" />
      {THEMES.map((t) => (
        <button
          key={t.key}
          type="button"
          role="radio"
          aria-checked={theme === t.key}
          aria-label={`${t.name} theme`}
          title={t.name}
          onClick={() => setTheme(t.key)}
          style={{ background: t.swatch }}
          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${theme === t.key ? 'border-white scale-110' : 'border-white/30'}`}
        />
      ))}
    </div>
  )
}
