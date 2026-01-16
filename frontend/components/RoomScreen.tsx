'use client'

import { motion } from 'framer-motion'
import { Heart, Users, Wifi, WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import pkg from '../package.json'
import { useGame } from './GameContext'

// Supporters data - add new supporters here (include currency symbol in amount)
const supporters = [
  { name: 'Ansh', amount: '$ 1.50' },
  { name: 'Sumedh Lodhi', amount: '₹ 100' },
  { name: 'Magga', amount: '₹ 69' },
  { name: 'Shubhxho', amount: '₹ 20' },
  { name: 'Blok', amount: '₹ 6.70' },
  { name: 'Aditya Uniyal', amount: '₹ 2.04' },
  { name: 'Cosmo', amount: '₹ 1' },
  { name: 'Kifayath', amount: '₹ 1' },

]

export default function RoomScreen() {
  const { createRoom, joinRoom, connected } = useGame()
  const router = useRouter()
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      createRoom(name.trim())
    }
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && code.trim()) {
      joinRoom(code.trim().toUpperCase(), name.trim())
    }
  }

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen p-4 relative overflow-x-hidden">
      {/* Supporters List - Desktop only (absolute positioned) */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="hidden lg:block absolute right-4 xl:right-8 top-[15%] z-50"
      >
        <div className="glass-strong rounded-2xl p-6 border border-pink-500/20 w-72">
          <div className="flex items-center gap-3 mb-5">
            <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
            <h3 className="font-bold text-pink-300 text-xl">Our Supporters</h3>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-3">
            {supporters.map((supporter, index) => (
              <motion.div
                key={supporter.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center justify-between text-base"
              >
                <span className="text-gray-300 truncate max-w-[160px]">{supporter.name}</span>
                <span className="text-green-400 font-bold text-lg">{supporter.amount}</span>
              </motion.div>
            ))}
          </div>

          {/* Join them text */}
          <motion.div
            className="mt-5 pt-4 border-t border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-sm text-pink-300/80 text-center font-medium">
              ✨ Join our supporters! ✨
            </p>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            <img src="/taboo-logo.png" alt="Taboo Logo" className="w-32 h-32 md:w-40 md:h-40" />
          </motion.div>
          <motion.h1
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
          >
            TABOO
          </motion.h1>
          <p className="text-gray-300 text-base md:text-lg">Made by Ishpreet & Ansh
          </p>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {connected ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        {mode === 'select' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-strong rounded-2xl p-6 md:p-8 space-y-4"
          >
            <button
              onClick={() => setMode('create')}
              className="w-full py-3 md:py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-sm md:text-base"
            >
              <Users className="w-5 h-5" />
              Create New Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-3 md:py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-sm md:text-base"
            >
              <Users className="w-5 h-5" />
              Join Existing Room
            </button>
          </motion.div>
        )}

        {/* Create Room Form */}
        {mode === 'create' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6 md:p-8"
          >
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Create Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 text-sm md:text-base"
                  maxLength={20}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="flex-1 py-3 px-4 md:px-6 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all text-sm md:text-base"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!connected}
                  className="flex-1 py-3 px-4 md:px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm md:text-base"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Join Room Form */}
        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6 md:p-8"
          >
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Join Room</h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm md:text-base"
                  maxLength={20}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Room Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 uppercase tracking-wider text-center text-lg md:text-xl font-mono"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="flex-1 py-3 px-4 md:px-6 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all text-sm md:text-base"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!connected}
                  className="flex-1 py-3 px-4 md:px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm md:text-base"
                >
                  Join
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Donate Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-9"
        >
          <motion.button
            onClick={() => router.push('/donate')}
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 0 0 rgba(236, 72, 153, 0.7), 0 0 20px rgba(236, 72, 153, 0.3)',
                '0 0 0 15px rgba(236, 72, 153, 0), 0 0 40px rgba(236, 72, 153, 0.5)',
                '0 0 0 0 rgba(236, 72, 153, 0.7), 0 0 20px rgba(236, 72, 153, 0.3)'
              ]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full py-3 px-6 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 rounded-xl font-bold text-white transition-all transform hover:scale-110 flex items-center justify-center gap-2 text-sm md:text-base shadow-lg shadow-pink-500/30"
          >
            <Heart className="w-4 h-4 fill-white" />
            Support Us
          </motion.button>
        </motion.div>

        {/* Version & Copyright */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400">v5.0.0</p>
          <p className="text-xs text-gray-400">Taboo @ 2026. All rights reserved.</p>
        </div>
      </motion.div>

      {/* Supporters List - Mobile only (below main content) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="lg:hidden w-full max-w-md mt-8 mb-4"
      >
        <div className="glass-strong rounded-2xl p-4 border border-pink-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
            <h3 className="font-bold text-pink-300 text-lg">Our Supporters</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {supporters.map((supporter, index) => (
              <motion.div
                key={supporter.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-gray-300 truncate max-w-[80px]">{supporter.name}</span>
                <span className="text-green-400 font-bold">{supporter.amount}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-pink-300/80 text-center mt-4 font-medium">
            ✨ Join our supporters! ✨
          </p>
        </div>
      </motion.div>
    </div>
  )
}
