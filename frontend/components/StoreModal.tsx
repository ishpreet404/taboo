'use client'

import { PREMIUM_PACKS, WEB_URL } from '@/lib/appConfig'
import { openAdPrivacyOptions } from '@/lib/native/ads'
import type { ProductKey } from '@/lib/native/purchases'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Crown, Loader2, ShieldOff, X } from 'lucide-react'
import { useState } from 'react'
import { useMonetization } from './MonetizationContext'

const ITEMS: Array<{ key: ProductKey; owned: 'removeAds' | 'premiumPacks'; title: string; blurb: string; Icon: typeof Crown }> = [
  {
    key: 'premiumPacks',
    owned: 'premiumPacks',
    title: 'Premium Word Packs',
    blurb: `Unlock all ${PREMIUM_PACKS.length} extra packs (Insane, Intense, Hindi and more). Only the host needs it - everyone in your room plays along. One-time purchase.`,
    Icon: Crown,
  },
  {
    key: 'removeAds',
    owned: 'removeAds',
    title: 'Remove Ads',
    blurb: 'No banners, no ads between games. One-time purchase.',
    Icon: ShieldOff,
  },
]

export default function StoreModal() {
  const { storeOpen, closeStore, storeAvailable, entitlements, products, buy, restorePurchases, native } = useMonetization()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (id: string, action: () => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>, success: string) => {
    setBusy(id)
    setMessage(null)
    const outcome = await action()
    setBusy(null)
    if (outcome.ok) setMessage(success)
    else if (!outcome.cancelled) setMessage(outcome.message || 'Something went wrong.')
  }

  return (
    <AnimatePresence>
      {storeOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={closeStore}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Store"
            className="glass-strong w-full max-w-md rounded-2xl border border-purple-500/30 p-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" /> Store
              </h2>
              <button onClick={closeStore} aria-label="Close store" className="p-2 rounded-lg hover:bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!storeAvailable && (
              <p className="text-sm text-gray-300 mb-4">
                {native
                  ? 'Purchases are not available right now. Please try again later.'
                  : 'Purchases are available in the Android and iOS apps.'}
              </p>
            )}

            <div className="space-y-3">
              {ITEMS.map(({ key, owned, title, blurb, Icon }) => {
                const isOwned = entitlements[owned]
                const price = products.find((p) => p.key === key)?.price
                return (
                  <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <Icon className="w-6 h-6 text-purple-300 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{title}</div>
                        <p className="text-sm text-gray-400 mt-1">{blurb}</p>
                      </div>
                    </div>
                    <button
                      disabled={isOwned || !storeAvailable || !price || busy !== null}
                      onClick={() => run(key, () => buy(key), 'Thank you! Your purchase is active.')}
                      className="mt-3 w-full px-4 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {busy === key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isOwned ? (
                        <>
                          <Check className="w-4 h-4" /> Owned
                        </>
                      ) : (
                        price || 'Unavailable'
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {message && <p className="mt-4 text-sm text-center text-cyan-300" role="status">{message}</p>}

            <div className="mt-5 flex flex-col items-center gap-2 text-sm">
              {storeAvailable && (
                <button
                  disabled={busy !== null}
                  onClick={() => run('restore', restorePurchases, 'Purchases restored.')}
                  className="text-blue-300 underline underline-offset-2 disabled:opacity-50"
                >
                  {busy === 'restore' ? 'Restoring...' : 'Restore purchases'}
                </button>
              )}
              {native && (
                <button
                  onClick={async () => {
                    if (!(await openAdPrivacyOptions())) setMessage('No ad privacy options are required in your region.')
                  }}
                  className="text-gray-400 underline underline-offset-2"
                >
                  Ad privacy choices
                </button>
              )}
              <div className="flex gap-4 text-gray-400">
                <a href={`${WEB_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Privacy Policy</a>
                <a href={`${WEB_URL}/terms`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Terms of Use</a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
