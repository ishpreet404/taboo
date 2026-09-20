'use client'

import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from '@/lib/themes'
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

interface ThemeValue {
  theme: string
  setTheme: (key: string) => void
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined)

// Per-device colour theme, applied as <html data-theme="..."> (see globals.css)
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME)

  useEffect(() => {
    try {
      setThemeState(localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME)
    } catch {
      // storage unavailable
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = THEMES.some((t) => t.key === theme) ? theme : DEFAULT_THEME
  }, [theme])

  const value = useMemo<ThemeValue>(
    () => ({
      theme,
      setTheme: (key: string) => {
        setThemeState(key)
        try {
          localStorage.setItem(THEME_STORAGE_KEY, key)
        } catch {
          // storage unavailable
        }
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
