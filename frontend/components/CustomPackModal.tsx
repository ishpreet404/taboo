'use client'

import { CUSTOM_PACK_LIMITS } from '@/lib/game/packCatalog'
import { AnimatePresence, motion } from 'framer-motion'
import { PenLine, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const DRAFT_KEY = 'iw_custom_pack_draft'

// Same normalisation the game core applies, so the count shown is the count used
export function parseCustomWords(text: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  for (const raw of text.split(/[\n,;]+/)) {
    const word = raw.replace(/\s+/g, ' ').trim().slice(0, CUSTOM_PACK_LIMITS.maxWordLength).toUpperCase()
    if (word.length < 2 || seen.has(word)) continue
    seen.add(word)
    words.push(word)
    if (words.length >= CUSTOM_PACK_LIMITS.maxWords) break
  }
  return words
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, words: string[]) => void
}

export default function CustomPackModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')

  // The draft survives closing the dialog, reloads and new rooms
  useEffect(() => {
    if (!open) return
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (draft) {
        setName(draft.name || '')
        setText(draft.text || '')
      }
    } catch {
      // no draft
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, text }))
    } catch {
      // storage unavailable
    }
  }, [open, name, text])

  const words = useMemo(() => parseCustomWords(text), [text])
  const missing = Math.max(0, CUSTOM_PACK_LIMITS.minWords - words.length)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.form
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              if (missing === 0) onSubmit(name.trim(), words)
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Custom word pack"
            className="glass-strong w-full max-w-lg rounded-2xl border border-rose-500/30 p-5 max-h-[90vh] overflow-y-auto text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PenLine className="w-5 h-5 text-rose-300" /> Custom Pack
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-sm font-medium mb-1" htmlFor="custom-pack-name">Pack name</label>
            <input
              id="custom-pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={CUSTOM_PACK_LIMITS.maxNameLength}
              placeholder="e.g. Office Inside Jokes"
              className="w-full px-4 py-2.5 mb-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder-gray-400 text-sm"
            />

            <label className="block text-sm font-medium mb-1" htmlFor="custom-pack-words">Words</label>
            <textarea
              id="custom-pack-words"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={'One word or phrase per line (or separated by commas)\n\nFriday standup\nThe broken coffee machine\nReply all'}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder-gray-500 text-sm font-mono"
            />
            <p className={`mt-2 text-sm ${missing ? 'text-yellow-300' : 'text-green-300'}`} role="status">
              {words.length} unique {words.length === 1 ? 'word' : 'words'}
              {missing ? ` - add ${missing} more (minimum ${CUSTOM_PACK_LIMITS.minWords})` : ''}
              {words.length >= CUSTOM_PACK_LIMITS.maxWords ? ` - maximum reached` : ''}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Points are set automatically from each word&apos;s length and complexity. Your words stay on the host&apos;s device and are only
              revealed as they come up in play. Keep it friendly: everyone in the room will see them.
            </p>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={missing > 0}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-500 to-indigo-600 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use this pack
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
