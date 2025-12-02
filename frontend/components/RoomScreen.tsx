'use client'

import { motion } from 'framer-motion'
import { Heart, Users, Wifi, WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGame } from './GameContext'

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
    <div className="flex items-center justify-center min-h-screen p-4">
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
          <p className="text-gray-300 text-base md:text-lg">Made by Ishpreet ,Funded by Ansh(1$),Cosmo(1Rs)
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
          <button
            onClick={() => router.push('/donate')}
            className="w-full py-3 px-6 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Heart className="w-4 h-4 fill-white" />
            Support Us
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
