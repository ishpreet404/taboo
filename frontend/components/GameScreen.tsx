'use client'

import { useState, useEffect } from 'react'
import { useGame } from './GameContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Trophy, Zap, LogOut } from 'lucide-react'
import { wordDatabase } from '@/lib/wordDatabase'

export default function GameScreen() {
  const { gameState, socket, roomCode, playerName, leaveGame } = useGame()
  const [gamePhase, setGamePhase] = useState<'turn-start' | 'playing' | 'turn-end'>('turn-start')
  const [currentWords, setCurrentWords] = useState<any[]>([])
  const [guessedWords, setGuessedWords] = useState<any[]>([])
  const [guess, setGuess] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [turnActive, setTurnActive] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const currentTeam = gameState.teams[gameState.currentTeamIndex]
  const currentDescriber = currentTeam.players[gameState.currentDescriberIndex[gameState.currentTeamIndex]]
  const isMyTurn = currentDescriber === playerName

  // Listen for sync events
  useEffect(() => {
    if (!socket) return

    const handleWordGuessed = (data: any) => {
      // Update local state with server data
      if (data.gameState) {
        // Refresh game state from server
      }
    }

    const handleTurnEnded = (data: any) => {
      setTurnActive(false)
      setGamePhase('turn-end')
    }

    const handleNextTurn = (data: any) => {
      setGamePhase('turn-start')
      setGuessedWords([])
      setTimeRemaining(60)
    }

    const handleTimerSync = (data: any) => {
      setTimeRemaining(data.timeRemaining)
    }

    const handleHostLeft = () => {
      alert('Host has left. Room is closing.')
      leaveGame()
    }

    socket.on('word-guessed-sync', handleWordGuessed)
    socket.on('turn-ended', handleTurnEnded)
    socket.on('next-turn-sync', handleNextTurn)
    socket.on('timer-sync', handleTimerSync)
    socket.on('host-left', handleHostLeft)

    return () => {
      socket.off('word-guessed-sync', handleWordGuessed)
      socket.off('turn-ended', handleTurnEnded)
      socket.off('next-turn-sync', handleNextTurn)
      socket.off('timer-sync', handleTimerSync)
      socket.off('host-left', handleHostLeft)
    }
  }, [socket])

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (turnActive && timeRemaining > 0 && isMyTurn) {
      timer = setTimeout(() => {
        const newTime = timeRemaining - 1
        setTimeRemaining(newTime)
        // Broadcast timer to all players
        socket?.emit('timer-update', { roomCode, timeRemaining: newTime })
      }, 1000)
    } else if (timeRemaining === 0 && turnActive) {
      handleEndTurn()
    }
    return () => clearTimeout(timer)
  }, [turnActive, timeRemaining, isMyTurn])

  const selectWords = (count: number) => {
    const shuffled = [...wordDatabase].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  const startTurn = () => {
    const words = selectWords(10)
    setCurrentWords(words)
    setGuessedWords([])
    setTimeRemaining(60)
    setTurnActive(true)
    setGamePhase('playing')
    
    socket?.emit('start-turn', { roomCode })
  }

  const handleGuess = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.trim().toUpperCase()
    setGuess(input)

    if (input.length === 0) return

    for (const wordObj of currentWords) {
      if (guessedWords.includes(wordObj)) continue

      if (input === wordObj.word) {
        const newGuessed = [...guessedWords, wordObj]
        setGuessedWords(newGuessed)
        setGuess('')
        
        // Emit to server
        socket?.emit('word-guessed', { 
          roomCode, 
          word: wordObj.word, 
          guesser: playerName,
          points: wordObj.points 
        })
        
        // Add more words if running low
        const remaining = currentWords.length - newGuessed.length
        if (remaining <= 2) {
          setCurrentWords([...currentWords, ...selectWords(5)])
        }
        break
      }
    }
  }

  const handleEndTurn = () => {
    setTurnActive(false)
    setGamePhase('turn-end')
    
    const totalPoints = guessedWords.reduce((sum, w) => sum + w.points, 0)
    socket?.emit('end-turn', { 
      roomCode, 
      guessedCount: guessedWords.length,
      skippedCount: 0,
      totalPoints
    })
  }

  const handleNextTurn = () => {
    socket?.emit('next-turn', { roomCode })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'border-green-500 bg-green-500/10'
      case 'medium': return 'border-yellow-500 bg-yellow-500/10'
      case 'hard': return 'border-red-500 bg-red-500/10'
      default: return 'border-gray-500 bg-gray-500/10'
    }
  }

  const handleLeaveGame = () => {
    setShowLeaveConfirm(false)
    leaveGame()
  }

  return (
    <div className="space-y-6 relative">
      {/* Leave Game Button */}
      <div className="absolute top-0 right-0 z-10">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="px-4 py-2 glass-strong rounded-xl hover:bg-red-500/20 transition-colors flex items-center gap-2 text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Leave Game
        </button>
      </div>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-4">Leave Game?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to leave the game? You'll return to the lobby.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 px-6 py-3 glass rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveGame}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl transition-colors font-semibold"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Scores */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-strong rounded-xl p-4 border-2 border-blue-500/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Team 1</div>
              <div className="text-3xl font-bold text-blue-400">{gameState.teams[0].score}</div>
            </div>
            <Trophy className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-strong rounded-xl p-4 border-2 border-red-500/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Team 2</div>
              <div className="text-3xl font-bold text-red-400">{gameState.teams[1].score}</div>
            </div>
            <Trophy className="w-8 h-8 text-red-400" />
          </div>
        </motion.div>
      </div>

      {/* Turn Start */}
      {gamePhase === 'turn-start' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong rounded-2xl p-8 text-center"
        >
          <div className={`text-6xl mb-4 ${gameState.currentTeamIndex === 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {currentTeam.name}'s Turn
          </div>
          <div className="text-2xl mb-6">
            Describer: <span className="font-bold">{currentDescriber}</span>
          </div>
          <div className="text-gray-400 mb-8">
            Round {gameState.round} of {gameState.maxRounds}
          </div>
          {isMyTurn && (
            <button
              onClick={startTurn}
              className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-xl transition-all transform hover:scale-105"
            >
              Start Turn
            </button>
          )}
          {!isMyTurn && (
            <div className="text-gray-400">Waiting for {currentDescriber} to start...</div>
          )}
        </motion.div>
      )}

      {/* Playing */}
      {gamePhase === 'playing' && (
        <>
          {/* Timer */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-strong rounded-xl p-6 text-center"
          >
            <div className="flex items-center justify-center gap-4">
              <Clock className={`w-8 h-8 ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`} />
              <div className={`text-5xl font-bold ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
                {timeRemaining}
              </div>
            </div>
          </motion.div>

          {/* Words Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <AnimatePresence>
              {currentWords.map((wordObj, index) => {
                const isGuessed = guessedWords.includes(wordObj)
                
                return (
                  <motion.div
                    key={`${wordObj.word}-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={`glass-strong rounded-xl p-4 border-2 ${getDifficultyColor(wordObj.difficulty)} ${
                      isGuessed ? 'opacity-30 line-through' : ''
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-bold text-lg mb-2">{wordObj.word}</div>
                      <div className="text-xs space-y-1 text-gray-400">
                        {wordObj.taboo.map((t: string) => (
                          <div key={t} className="text-red-400">🚫 {t}</div>
                        ))}
                      </div>
                      <div className="mt-2 text-sm font-semibold">
                        <Zap className="w-3 h-3 inline mr-1" />
                        {wordObj.points}pts
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Guess Input */}
          {!isMyTurn && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-strong rounded-xl p-6"
            >
              <input
                type="text"
                value={guess}
                onChange={handleGuess}
                placeholder="Type your guess..."
                className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 text-xl text-center font-bold uppercase"
                autoFocus
              />
            </motion.div>
          )}

          {/* Controls */}
          {isMyTurn && (
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleEndTurn}
                className="px-8 py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
              >
                End Turn
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="glass rounded-xl p-4 flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{guessedWords.length}</div>
              <div className="text-sm text-gray-400">Words Guessed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {guessedWords.reduce((sum, w) => sum + w.points, 0)}
              </div>
              <div className="text-sm text-gray-400">Points</div>
            </div>
          </div>
        </>
      )}

      {/* Turn End */}
      {gamePhase === 'turn-end' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong rounded-2xl p-8 text-center"
        >
          <div className="text-4xl font-bold mb-6">Turn Complete! 🎉</div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-5xl font-bold text-green-400">{guessedWords.length}</div>
              <div className="text-gray-400">Words Guessed</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-400">
                {guessedWords.reduce((sum, w) => sum + w.points, 0)}
              </div>
              <div className="text-gray-400">Points Earned</div>
            </div>
          </div>
          {isMyTurn && (
            <button
              onClick={handleNextTurn}
              className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-bold text-xl transition-all transform hover:scale-105"
            >
              Next Turn
            </button>
          )}
          {!isMyTurn && (
            <div className="text-gray-400">Waiting for {currentDescriber}...</div>
          )}
        </motion.div>
      )}
    </div>
  )
}
