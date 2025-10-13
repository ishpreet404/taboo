'use client'

import { useState } from 'react'
import { useGame } from './GameContext'
import { motion } from 'framer-motion'
import { Users, Wifi, WifiOff } from 'lucide-react'

export default function RoomScreen() {
  const { createRoom, joinRoom, connected } = useGame()
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
    <div className="flex items-center justify-center min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
          >
             TABOO
          </motion.h1>
                  <p className="text-gray-300 text-lg">Inferno ne banayi hai 
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
            className="glass-strong rounded-2xl p-8 space-y-4"
          >
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <Users className="w-5 h-5" />
              Create New Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-3"
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
            className="glass-strong rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold mb-6">Create Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  maxLength={20}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!connected}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            className="glass-strong rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold mb-6">Join Room</h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
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
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 uppercase tracking-wider text-center text-xl font-mono"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!connected}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Join
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
