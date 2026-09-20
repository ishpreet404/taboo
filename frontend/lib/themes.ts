// Colour themes. Purely cosmetic and per-device; applied as html[data-theme] and
// implemented with CSS variables in app/globals.css.
export interface Theme {
  key: string
  name: string
  // Swatch shown in the picker (CSS gradient)
  swatch: string
  // Premium themes come with All Access in the apps (always free on the web
  // unless NEXT_PUBLIC_LOCK_PREMIUM_ON_WEB is set)
  premium: boolean
}

export const THEMES: Theme[] = [
  { key: 'classic', name: 'Classic', swatch: 'linear-gradient(135deg, #0a0a1e, #0f3460)', premium: false },
  { key: 'midnight', name: 'Midnight', swatch: 'linear-gradient(135deg, #000000, #1a1a2e)', premium: false },
  { key: 'ember', name: 'Ember', swatch: 'linear-gradient(135deg, #1e0505, #8c2a0a)', premium: false },
  { key: 'ocean', name: 'Ocean', swatch: 'linear-gradient(135deg, #051932, #006e82)', premium: true },
  { key: 'forest', name: 'Forest', swatch: 'linear-gradient(135deg, #051e19, #0a503c)', premium: true },
  { key: 'sunset', name: 'Sunset', swatch: 'linear-gradient(135deg, #3c0f28, #a03c1e)', premium: true },
  { key: 'candy', name: 'Candy', swatch: 'linear-gradient(135deg, #3c1450, #be3c82)', premium: true },
]

export const DEFAULT_THEME = 'classic'
export const THEME_STORAGE_KEY = 'iw_theme'
