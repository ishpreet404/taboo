'use client'

import { useState, useEffect } from 'react'
import { useGame } from './GameContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Trophy, Zap, LogOut, Users } from 'lucide-react'
import { wordDatabase } from '@/lib/wordDatabase'

export default function GameScreen() {
  const { gameState, socket, roomCode, playerName, leaveGame } = useGame()
  const [gamePhase, setGamePhase] = useState<'turn-start' | 'playing' | 'turn-end'>('turn-start')
  const [currentWords, setCurrentWords] = useState<any[]>([])
  const [guessedWords, setGuessedWords] = useState<any[]>([])
  const [guessedByPlayer, setGuessedByPlayer] = useState<{word: string, guesser: string, points: number}[]>([])
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
      // Track who guessed the word
      if (data.word && data.guesser && data.points) {
        setGuessedByPlayer(prev => [...prev, {
          word: data.word,
          guesser: data.guesser,
          points: data.points
        }])
      }
    }

    const handleTurnStarted = (data: any) => {
      // When describer starts turn, all players switch to playing phase
      setGamePhase('playing')
      setTurnActive(true)
      setTimeRemaining(60)
      // Set the words for all players (including guessers)
      if (data.words) {
        setCurrentWords(data.words)
      }
    }

    const handleTurnEnded = (data: any) => {
      setTurnActive(false)
      setGamePhase('turn-end')
    }

    const handleNextTurn = (data: any) => {
      setGamePhase('turn-start')
      setGuessedWords([])
      setGuessedByPlayer([])
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
    socket.on('turn-started', handleTurnStarted)
    socket.on('turn-ended', handleTurnEnded)
    socket.on('next-turn-sync', handleNextTurn)
    socket.on('timer-sync', handleTimerSync)
    socket.on('host-left', handleHostLeft)

    return () => {
      socket.off('word-guessed-sync', handleWordGuessed)
      socket.off('turn-started', handleTurnStarted)
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
    
    // Send words to server so all players get them
    socket?.emit('start-turn', { roomCode, words })
  }

  const handleGuess = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.toUpperCase()
    setGuess(input)
  }

  const submitGuess = () => {
    const input = guess.trim().toUpperCase()
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitGuess()
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

  const handleSkipTurn = () => {
    if (!isMyTurn) {
      // Emit skip-guesser-turn event to server
      socket?.emit('skip-guesser-turn', { roomCode, playerName })
      alert('You have skipped your guessing turn!')
    }
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
    <div className="space-y-4 md:space-y-6 relative">
      {/* Leave Game Button */}
      <div className="absolute top-0 right-0 z-10">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="px-3 md:px-4 py-2 glass-strong rounded-xl hover:bg-red-500/20 transition-colors flex items-center gap-2 text-red-400 text-sm md:text-base"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Leave Game</span>
          <span className="sm:hidden">Leave</span>
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
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-strong rounded-xl p-3 md:p-4 border-2 border-blue-500/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-gray-400">Team 1</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-400">{gameState.teams[0].score}</div>
            </div>
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-strong rounded-xl p-3 md:p-4 border-2 border-red-500/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-gray-400">Team 2</div>
              <div className="text-2xl md:text-3xl font-bold text-red-400">{gameState.teams[1].score}</div>
            </div>
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-red-400" />
          </div>
        </motion.div>
      </div>

      {/* Role Indicator */}
      {gamePhase === 'playing' && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`glass-strong rounded-xl p-3 md:p-4 text-center border-2 ${
            isMyTurn ? 'border-purple-500/50 bg-purple-500/10' : 'border-green-500/50 bg-green-500/10'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-5 h-5" />
            <span className="font-bold text-lg md:text-xl">
              {isMyTurn ? '🎤 You are DESCRIBING' : '🤔 You are GUESSING'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Turn Start */}
      {gamePhase === 'turn-start' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong rounded-2xl p-6 md:p-8 text-center"
        >
          <div className={`text-4xl md:text-6xl mb-4 ${gameState.currentTeamIndex === 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {currentTeam.name}'s Turn
          </div>
          <div className="text-xl md:text-2xl mb-6">
            Describer: <span className="font-bold">{currentDescriber}</span>
          </div>
          <div className="text-gray-400 mb-6 md:mb-8 text-sm md:text-base">
            Round {gameState.round} of {gameState.maxRounds}
          </div>
          {isMyTurn && (
            <button
              onClick={startTurn}
              className="px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-lg md:text-xl transition-all transform hover:scale-105"
            >
              Start Turn
            </button>
          )}
          {!isMyTurn && (
            <div className="text-gray-400 text-sm md:text-base">Waiting for {currentDescriber} to start...</div>
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
            className="glass-strong rounded-xl p-4 md:p-6 text-center"
          >
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <Clock className={`w-6 h-6 md:w-8 md:h-8 ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`} />
              <div className={`text-4xl md:text-5xl font-bold ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
                {timeRemaining}
              </div>
            </div>
          </motion.div>

          {/* Words Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
            <AnimatePresence>
              {currentWords.map((wordObj, index) => {
                const isGuessed = guessedWords.includes(wordObj)
                
                return (
                  <motion.div
                    key={`${wordObj.word}-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={`glass-strong rounded-xl p-3 md:p-4 border-2 ${getDifficultyColor(wordObj.difficulty)} ${
                      isGuessed ? 'opacity-30 line-through' : ''
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-bold text-base md:text-xl mb-2 md:mb-3">{wordObj.word}</div>
                      <div className="mt-2 text-xs md:text-sm font-semibold">
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
              className="glass-strong rounded-xl p-6 space-y-3"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={guess}
                  onChange={handleGuess}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your guess..."
                  className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-white/10 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 text-lg md:text-xl text-center font-bold uppercase"
                  autoFocus
                />
                <button
                  onClick={submitGuess}
                  className="px-6 md:px-8 py-3 md:py-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold text-sm md:text-base transition-all transform hover:scale-105 whitespace-nowrap"
                >
                  Submit
                </button>
              </div>
              <button
                onClick={handleSkipTurn}
                className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold text-sm md:text-base transition-all"
              >
                ⏭️ Skip My Turn
              </button>
            </motion.div>
          )}

          {/* Controls */}
          {isMyTurn && (
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleEndTurn}
                className="px-6 md:px-8 py-3 md:py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-base md:text-lg transition-all transform hover:scale-105"
              >
                End Turn
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="glass rounded-xl p-4 flex justify-around text-center">
            <div>
              <div className="text-xl md:text-2xl font-bold text-green-400">{guessedWords.length}</div>
              <div className="text-xs md:text-sm text-gray-400">Words Guessed</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-blue-400">
                {guessedWords.reduce((sum, w) => sum + w.points, 0)}
              </div>
              <div className="text-xs md:text-sm text-gray-400">Points</div>
            </div>
          </div>

          {/* Who Guessed What */}
          {guessedByPlayer.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <h3 className="text-sm font-semibold mb-3 text-gray-400">Recent Guesses:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {guessedByPlayer.slice().reverse().map((item, index) => (
                  <div key={index} className="glass-strong rounded-lg p-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center font-bold text-xs">
                        {item.guesser.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="font-bold text-green-400">{item.word}</div>
                        <div className="text-xs text-gray-400">by {item.guesser}</div>
                      </div>
                    </div>
                    <div className="text-blue-400 font-bold">+{item.points}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Turn End */}
      {gamePhase === 'turn-end' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong rounded-2xl p-6 md:p-8 text-center"
        >
          <div className="text-3xl md:text-4xl font-bold mb-6">Turn Complete! 🎉</div>
          <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-green-400">{guessedWords.length}</div>
              <div className="text-gray-400 text-sm md:text-base">Words Guessed</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-400">
                {guessedWords.reduce((sum, w) => sum + w.points, 0)}
              </div>
              <div className="text-gray-400 text-sm md:text-base">Points Earned</div>
            </div>
          </div>
          {isMyTurn && (
            <button
              onClick={handleNextTurn}
              className="px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-bold text-lg md:text-xl transition-all transform hover:scale-105"
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
