// Colour themes. Purely cosmetic and per-device; applied as html[data-theme] and
// implemented with CSS variables in app/globals.css.
export interface Theme {
  key: string
  name: string
  // Swatch shown in the picker (CSS gradient)
  swatch: string
}

export const THEMES: Theme[] = [
  { key: 'classic', name: 'Classic', swatch: 'linear-gradient(135deg, #0a0a1e, #0f3460)' },
  { key: 'midnight', name: 'Midnight', swatch: 'linear-gradient(135deg, #000000, #1a1a2e)' },
  { key: 'ember', name: 'Ember', swatch: 'linear-gradient(135deg, #1e0505, #8c2a0a)' },
  { key: 'ocean', name: 'Ocean', swatch: 'linear-gradient(135deg, #051932, #006e82)' },
  { key: 'forest', name: 'Forest', swatch: 'linear-gradient(135deg, #051e19, #0a503c)' },
  { key: 'sunset', name: 'Sunset', swatch: 'linear-gradient(135deg, #3c0f28, #a03c1e)' },
  { key: 'candy', name: 'Candy', swatch: 'linear-gradient(135deg, #3c1450, #be3c82)' },
]

export const DEFAULT_THEME = 'classic'
export const THEME_STORAGE_KEY = 'iw_theme'
