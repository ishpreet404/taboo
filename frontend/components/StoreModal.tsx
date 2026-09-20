'use client'

import { PRODUCTS, WEB_URL } from '@/lib/appConfig'
import { CUSTOM_PACK_PRODUCT, PACKS } from '@/lib/game/packCatalog'
import { openAdPrivacyOptions } from '@/lib/native/ads'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Crown, Loader2, PenLine, PlayCircle, ShieldOff, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { PACK_PRODUCT_IDS, useMonetization } from './MonetizationContext'

// "pack_hindi" -> "Hindi, Hindi (Easy), ..." straight from the catalog
const packsIn = (productId: string) => PACKS.filter((p) => p.product === productId)
const productTitle = (productId: string) => {
  const packs = packsIn(productId)
  return packs.length === 1 ? packs[0].name : `${packs[0]?.category || 'Pack'} packs`
}
const productBlurb = (productId: string) => packsIn(productId).map((p) => p.name).join(' · ')

const FEATURED = [
  {
    id: PRODUCTS.allAccess,
    title: 'All Access',
    blurb: `Every word pack (${PACK_PRODUCT_IDS.length} paid collections, plus all future ones), custom packs and premium themes. Only the host needs it - everyone in your room plays along.`,
    Icon: Crown,
  },
  { id: CUSTOM_PACK_PRODUCT, title: 'Custom Packs', blurb: 'Play with your own words: inside jokes, a class, a team offsite.', Icon: PenLine },
  { id: PRODUCTS.removeAds, title: 'Remove Ads', blurb: 'No banners, no ads between games.', Icon: ShieldOff },
]

const formatRemaining = (expiry: number) => {
  const hours = Math.max(1, Math.round((expiry - Date.now()) / 3600000))
  return `${hours} h left`
}

export default function StoreModal() {
  const { storeOpen, storeFocus, closeStore, storeAvailable, native, products, ownsProduct, tempUnlockExpiry, buy, restorePurchases, unlockWithAd } = useMonetization()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const priceOf = (id: string) => products.find((p) => p.id === id)?.price

  const run = async (id: string, action: () => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>, success: string) => {
    setBusy(id)
    setMessage(null)
    const outcome = await action()
    setBusy(null)
    if (outcome.ok) setMessage(success)
    else if (!outcome.cancelled) setMessage(outcome.message || 'Something went wrong.')
  }

  const watchAd = async (productId: string) => {
    setBusy(`ad:${productId}`)
    setMessage(null)
    const granted = await unlockWithAd(productId)
    setBusy(null)
    setMessage(granted ? `${productTitle(productId)} unlocked for 24 hours. Enjoy!` : 'No ad is available right now. Please try again in a moment.')
  }

  const BuyButton = ({ id, compact = false }: { id: string; compact?: boolean }) => {
    const owned = ownsProduct(id)
    const price = priceOf(id)
    return (
      <button
        disabled={owned || !storeAvailable || !price || busy !== null}
        onClick={() => run(id, () => buy(id), 'Thank you! Your purchase is active.')}
        className={`${compact ? 'px-3 py-1.5 text-sm min-w-[5.5rem]' : 'w-full px-4 py-2.5'} rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {busy === id ? <Loader2 className="w-4 h-4 animate-spin" /> : owned ? <><Check className="w-4 h-4" /> Owned</> : price || 'Unavailable'}
      </button>
    )
  }

  const focusIsPack = !!storeFocus && PACK_PRODUCT_IDS.includes(storeFocus)

  return (
    <AnimatePresence>
      {storeOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
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
                {native ? 'Purchases are not available right now. Please try again later.' : 'Purchases are available in the Android and iOS apps.'}
              </p>
            )}

            {/* The thing the player just tapped: cheapest way in goes first */}
            {focusIsPack && storeFocus && !ownsProduct(storeFocus) && (
              <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 mb-3">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Sparkles className="w-5 h-5 text-yellow-300" /> Unlock {productTitle(storeFocus)}
                </div>
                <p className="text-sm text-gray-300 mt-1">{productBlurb(storeFocus)}</p>
                {tempUnlockExpiry(storeFocus) ? (
                  <p className="mt-3 text-sm text-green-300">Unlocked - {formatRemaining(tempUnlockExpiry(storeFocus)!)}</p>
                ) : (
                  native && (
                    <button
                      disabled={busy !== null}
                      onClick={() => watchAd(storeFocus)}
                      className="mt-3 w-full px-4 py-2.5 rounded-lg font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {busy === `ad:${storeFocus}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                      Watch an ad - free for 24 hours
                    </button>
                  )
                )}
                <div className="mt-2">
                  <BuyButton id={storeFocus} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {FEATURED.map(({ id, title, blurb, Icon }) => (
                <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Icon className="w-6 h-6 text-purple-300 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white">{title}</div>
                      <p className="text-sm text-gray-400 mt-1">{blurb} One-time purchase.</p>
                    </div>
                  </div>
                  <BuyButton id={id} />
                </div>
              ))}
            </div>

            <h3 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Individual packs</h3>
            <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
              {PACK_PRODUCT_IDS.map((id) => (
                <div key={id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{productTitle(id)}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {tempUnlockExpiry(id) && !ownsProduct(id) ? `Unlocked - ${formatRemaining(tempUnlockExpiry(id)!)}` : productBlurb(id)}
                    </div>
                  </div>
                  {native && !ownsProduct(id) && !tempUnlockExpiry(id) && (
                    <button
                      disabled={busy !== null}
                      onClick={() => watchAd(id)}
                      aria-label={`Watch an ad to unlock ${productTitle(id)} for 24 hours`}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 disabled:opacity-50"
                    >
                      {busy === `ad:${id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                    </button>
                  )}
                  <BuyButton id={id} compact />
                </div>
              ))}
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
