'use client'

import { motion } from 'framer-motion'
import { Home, Medal, Star, Trophy } from 'lucide-react'
import { useGame } from './GameContext'

export default function GameOverScreen() {
  const { gameState, setCurrentScreen } = useGame()

  const team1 = gameState.teams[0]
  const team2 = gameState.teams[1]
  const winner = team1.score > team2.score ? team1 : team2.score > team1.score ? team2 : null

  // Get top contributors
  const contributions = Object.entries(gameState.playerContributions)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.points - a.points)

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center mb-12"
      >
        {winner ? (
          <>
            <motion.div
              initial={{ rotate: -180 }}
              animate={{ rotate: 0 }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="text-8xl mb-6"
            >
              🏆
            </motion.div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {winner.name} Wins!
            </h1>
            <p className="text-2xl text-gray-300">{winner.score} Points</p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-8xl mb-6"
            >
              🤝
            </motion.div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              It's a Tie!
            </h1>
            <p className="text-2xl text-gray-300">{team1.score} - {team2.score}</p>
          </>
        )}
      </motion.div>

      {/* Final Scores */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`glass-strong rounded-2xl p-8 border-2 ${winner === team1 ? 'border-yellow-500 bg-yellow-500/10' : 'border-blue-500/30'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-blue-400">{team1.name}</h2>
            {winner === team1 && <Trophy className="w-8 h-8 text-yellow-400" />}
          </div>
          <div className="text-5xl font-bold mb-4">{team1.score}</div>
          <div className="text-sm text-gray-400">points</div>
          <div className="mt-4 space-y-2">
            {team1.players.map((player) => (
              <div key={player} className="glass rounded-lg p-2 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                  {player.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm">{player}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`glass-strong rounded-2xl p-8 border-2 ${winner === team2 ? 'border-yellow-500 bg-yellow-500/10' : 'border-red-500/30'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-red-400">{team2.name}</h2>
            {winner === team2 && <Trophy className="w-8 h-8 text-yellow-400" />}
          </div>
          <div className="text-5xl font-bold mb-4">{team2.score}</div>
          <div className="text-sm text-gray-400">points</div>
          <div className="mt-4 space-y-2">
            {team2.players.map((player) => (
              <div key={player} className="glass rounded-lg p-2 flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-sm font-bold">
                  {player.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm">{player}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Contributors */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-strong rounded-2xl p-8 mb-8"
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Star className="w-6 h-6 text-yellow-400" />
          Top Contributors
        </h2>
        <div className="space-y-4">
          {contributions.slice(0, 5).map((player, index) => (
            <motion.div
              key={player.name}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="glass rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {index === 0 && <Medal className="w-6 h-6 text-yellow-400" />}
                  {index === 1 && <Medal className="w-6 h-6 text-gray-400" />}
                  {index === 2 && <Medal className="w-6 h-6 text-orange-600" />}
                  {index > 2 && <span className="w-6 text-center text-gray-400">#{index + 1}</span>}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-lg font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-sm text-gray-400">
                    {(player.guessedWords?.length || player.words?.length || 0)} guessed | {player.describedWords?.length || 0} described
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-yellow-400">{player.points}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <button
          onClick={() => setCurrentScreen('room')}
          className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-bold text-xl transition-all transform hover:scale-105 flex items-center gap-3 mx-auto"
        >
          <Home className="w-6 h-6" />
          Back to Home
        </button>
      </motion.div>
    </div>
  )
}
