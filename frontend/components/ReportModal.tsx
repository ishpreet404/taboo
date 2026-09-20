'use client'

import { APP_NAME, SUPPORT_EMAIL } from '@/lib/appConfig'
import { AnimatePresence, motion } from 'framer-motion'
import { Flag, X } from 'lucide-react'
import { useState } from 'react'
import { useGame } from './GameContext'

const REASONS = ['Offensive name', 'Offensive or inappropriate words', 'Harassment or abuse', 'Cheating or disrupting the game', 'Something else']

// In-app reporting of players/content (required for apps with user-generated content:
// nicknames and custom word packs are visible to everyone in a room). Reports go to
// the support inbox with the room context filled in; hosts can also kick + ban.
export default function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { players, playerName, roomCode, isHost, isAdmin } = useGame()
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState(REASONS[0])
  const [details, setDetails] = useState('')

  const others = players.filter((p) => p.name !== playerName)

  const mailto = () => {
    const subject = `[${APP_NAME}] Report: ${reason}`
    const body = [
      `Reported player: ${target || '(not specified)'}`,
      `Reason: ${reason}`,
      `Room code: ${roomCode || '-'}`,
      `Reported by: ${playerName || '-'}`,
      `When: ${new Date().toISOString()}`,
      '',
      'What happened:',
      details,
    ].join('\n')
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
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
            aria-label="Report a player or content"
            className="glass-strong w-full max-w-md rounded-2xl border border-red-500/30 p-5 max-h-[90vh] overflow-y-auto text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-400" /> Report
              </h2>
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-300 mb-4">
              Offensive names, words or behaviour are not allowed. Tell us what happened and we will review it.
              {isHost || isAdmin
                ? ' As host you can also remove the player right away from the Admin panel; removed players cannot rejoin.'
                : ' The host can remove a player from the room immediately; you can also leave the room at any time.'}
            </p>

            <label className="block text-sm font-medium mb-1" htmlFor="report-player">Player</label>
            <select
              id="report-player"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2.5 mb-3 bg-white/10 border border-white/20 rounded-xl text-white"
            >
              <option value="" className="text-black">Not about a specific player</option>
              {others.map((p) => (
                <option key={p.id} value={p.name} className="text-black">{p.name}</option>
              ))}
            </select>

            <label className="block text-sm font-medium mb-1" htmlFor="report-reason">Reason</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 mb-3 bg-white/10 border border-white/20 rounded-xl text-white"
            >
              {REASONS.map((r) => (
                <option key={r} value={r} className="text-black">{r}</option>
              ))}
            </select>

            <label className="block text-sm font-medium mb-1" htmlFor="report-details">What happened? (optional)</label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              rows={3}
              className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500"
            />

            <a
              href={mailto()}
              onClick={onClose}
              className="mt-4 block w-full text-center px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600"
            >
              Send report
            </a>
            <p className="mt-2 text-xs text-gray-400 text-center">Opens your email app with the details filled in ({SUPPORT_EMAIL}).</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
