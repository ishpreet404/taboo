'use client'

import { APP_NAME, DONATE } from '@/lib/appConfig'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Heart, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

// Voluntary support, nothing is unlocked by it. UPI: scan the QR from another
// device, or tap "Pay with a UPI app" when already on the phone.
export default function DonateModal({ open, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(DONATE.upiId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the id is visible and selectable anyway
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Support the game"
            className="glass-strong w-full max-w-sm rounded-2xl border border-pink-500/30 p-5 max-h-[90vh] overflow-y-auto text-center"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" fill="currentColor" /> Keep {APP_NAME} alive
              </h2>
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-300 text-left">
              {APP_NAME} is free: no ads, no paywalls, every pack and mode unlocked. If it made your game night better, a small
              donation helps cover the costs and keeps new word packs coming. Totally optional. Thank you!
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/donate-upi-qr.png"
              alt={`UPI QR code for ${DONATE.upiId}`}
              width={260}
              height={221}
              className="mx-auto mt-4 w-full max-w-[260px] rounded-xl bg-white"
            />
            <p className="mt-2 text-xs text-gray-400">Scan with any UPI app (GPay, PhonePe, Paytm, BHIM...)</p>

            <button
              onClick={copyUpiId}
              className="mt-4 w-full px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-mono text-sm text-white flex items-center justify-center gap-2 break-all"
            >
              {DONATE.upiId}
              {copied ? <Check className="w-4 h-4 text-green-400 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            </button>
            <p className="mt-1 text-xs text-gray-400" role="status">{copied ? 'UPI ID copied' : 'Tap to copy the UPI ID'}</p>

            {isMobile && (
              <a
                href={DONATE.upiLink}
                className="mt-3 block w-full px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600"
              >
                Pay with a UPI app
              </a>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
