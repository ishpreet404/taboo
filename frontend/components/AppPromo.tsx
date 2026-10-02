'use client'

import { PLAY_STORE_URL, STORE_APP_NAME } from '@/lib/appConfig'
import { isNative } from '@/lib/native/device'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const DISMISS_KEY = 'iw_app_promo_dismissed_at'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000 // ask again a week after "not now"
const SHOW_AFTER_MS = 2500

// "Get the app" pop-up (centred) for website visitors. Shown on the home screen only
// (never during a game), never inside the app itself, and not on iPhones/iPads
// since there is no iOS app yet. Dismissing it snoozes it for a week.
export default function AppPromo() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isNative() || /iPhone|iPad|iPod/i.test(navigator.userAgent)) return
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
      if (Date.now() - dismissedAt < SNOOZE_MS) return
    } catch {
      // storage unavailable: just show it
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // storage unavailable
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
        >
        <motion.div
          initial={{ scale: 0.9, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Get the ${STORE_APP_NAME} app`}
          className="w-full max-w-md glass-strong rounded-2xl border border-purple-500/40 p-5 shadow-2xl"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-12 h-12 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white">Get the app</div>
              <p className="text-sm text-gray-300">{STORE_APP_NAME} is on Google Play. Free, no ads.</p>
            </div>
            <button onClick={dismiss} aria-label="Dismiss" className="p-2 rounded-lg hover:bg-white/10 text-gray-300 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={dismiss} className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium">
              Not now
            </button>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Install
            </a>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
