'use client'

import { motion } from 'framer-motion'
import { Copy, Crown, LogOut, Play } from 'lucide-react'
import { useState } from 'react'
import { useGame } from './GameContext'

export default function LobbyScreen() {
  const { roomCode, players, isHost, myTeam, joinTeam, startGame, playerName, leaveGame } = useGame()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const team1 = players.filter(p => p.team === 0)
  const team2 = players.filter(p => p.team === 1)
  const unassigned = players.filter(p => p.team === null)

  const canStart = team1.length > 0 && team2.length > 0

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
    }
  }

  const handleLeaveGame = () => {
    setShowLeaveConfirm(false)
    leaveGame()
  }

  return (
    <div className="py-6 md:py-8 relative px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 md:mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Game Lobby</h1>
        <div className="flex items-center justify-center gap-3 relative">
          <div className="glass rounded-xl px-4 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-3">
            <span className="text-gray-400 text-sm md:text-base">Room Code:</span>
            <span className="text-xl md:text-2xl font-mono font-bold tracking-wider">{roomCode}</span>
            <button
              onClick={copyRoomCode}
              className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          {/* Leave Button */}
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="absolute right-0 p-2 md:p-2.5 glass-strong rounded-lg hover:bg-red-500/20 transition-colors text-red-400 border border-red-500/30 hover:border-red-500/50"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Team 1 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl p-4 md:p-6 border-2 border-blue-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-blue-400">Team 1</h2>
            <span className="text-gray-400 text-sm md:text-base">{team1.length} players</span>
          </div>

          <div className="space-y-2 md:space-y-3 mb-4 min-h-[150px] md:min-h-[200px]">
            {team1.map((player) => (
              <div
                key={player.id}
                className={`glass rounded-xl p-3 md:p-4 flex items-center gap-2 md:gap-3 ${player.name === playerName ? 'ring-2 ring-blue-400' : ''
                  }`}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-sm md:text-base">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-sm md:text-base">{player.name}</span>
                {player.name === playerName && <span className="text-blue-400 text-xs md:text-sm">(You)</span>}
              </div>
            ))}
          </div>

          <button
            onClick={() => joinTeam(0)}
            disabled={myTeam === 0}
            className={`w-full py-2.5 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition-all transform text-sm md:text-base ${myTeam === 0
              ? 'bg-blue-500/50 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
              }`}
          >
            {myTeam === 0 ? 'Current Team' : 'Join Team 1'}
          </button>
        </motion.div>

        {/* Team 2 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-4 md:p-6 border-2 border-red-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-red-400">Team 2</h2>
            <span className="text-gray-400 text-sm md:text-base">{team2.length} players</span>
          </div>

          <div className="space-y-2 md:space-y-3 mb-4 min-h-[150px] md:min-h-[200px]">
            {team2.map((player) => (
              <div
                key={player.id}
                className={`glass rounded-xl p-3 md:p-4 flex items-center gap-2 md:gap-3 ${player.name === playerName ? 'ring-2 ring-red-400' : ''
                  }`}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-red-500 rounded-full flex items-center justify-center font-bold text-sm md:text-base">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-sm md:text-base">{player.name}</span>
                {player.name === playerName && <span className="text-red-400 text-xs md:text-sm">(You)</span>}
              </div>
            ))}
          </div>

          <button
            onClick={() => joinTeam(1)}
            disabled={myTeam === 1}
            className={`w-full py-2.5 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition-all transform text-sm md:text-base ${myTeam === 1
              ? 'bg-red-500/50 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 hover:scale-105'
              }`}
          >
            {myTeam === 1 ? 'Current Team' : 'Join Team 2'}
          </button>
        </motion.div>
      </div>

      {/* Unassigned Players */}
      {unassigned.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl p-4 mb-6"
        >
          <h3 className="text-lg font-semibold mb-3 text-gray-400">Waiting to join:</h3>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((player) => (
              <div key={player.id} className="glass rounded-lg px-4 py-2 text-sm">
                {player.name}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Start Game Button */}
      {isHost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <button
            onClick={startGame}
            disabled={!canStart}
            className="px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center gap-2 md:gap-3 mx-auto"
          >
            <Crown className="w-5 h-5 md:w-6 md:h-6" />
            Start Game
            <Play className="w-6 h-6" />
          </button>
          {!canStart && (
            <p className="text-gray-400 text-sm mt-3">
              Need at least 1 player in each team to start
            </p>
          )}
        </motion.div>
      )}

      {!isHost && (
        <div className="text-center text-gray-400">
          Waiting for host to start the game...
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="glass-strong rounded-2xl p-6 md:p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl md:text-2xl font-bold mb-4">Leave Lobby?</h3>
            <p className="text-gray-400 mb-6 text-sm md:text-base">
              Are you sure you want to leave? You'll need to rejoin with a new name.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 md:px-6 py-2.5 md:py-3 glass rounded-xl hover:bg-white/10 transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveGame}
                className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl transition-colors font-semibold text-sm md:text-base"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
