'use client'

import { useState, useEffect } from 'react'
import { useGame } from './GameContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Trophy, Zap, SkipForward } from 'lucide-react'
import { wordDatabase } from '@/lib/wordDatabase'

export default function GameScreen() {
  const { gameState, socket, roomCode, playerName } = useGame()
  const [gamePhase, setGamePhase] = useState<'turn-start' | 'playing' | 'turn-end'>('turn-start')
  const [currentWords, setCurrentWords] = useState<any[]>([])
  const [guessedWords, setGuessedWords] = useState<any[]>([])
  const [skippedWords, setSkippedWords] = useState<any[]>([])
  const [guess, setGuess] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [turnActive, setTurnActive] = useState(false)

  const currentTeam = gameState.teams[gameState.currentTeamIndex]
  const currentDescriber = currentTeam.players[gameState.currentDescriberIndex[gameState.currentTeamIndex]]
  const isMyTurn = currentDescriber === playerName

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (turnActive && timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(t => t - 1)
      }, 1000)
    } else if (timeRemaining === 0 && turnActive) {
      handleEndTurn()
    }
    return () => clearTimeout(timer)
  }, [turnActive, timeRemaining])

  const selectWords = (count: number) => {
    const shuffled = [...wordDatabase].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  const startTurn = () => {
    setCurrentWords(selectWords(10))
    setGuessedWords([])
    setSkippedWords([])
    setTimeRemaining(60)
    setTurnActive(true)
    setGamePhase('playing')
  }

  const handleGuess = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.trim().toUpperCase()
    setGuess(input)

    if (input.length === 0) return

    for (const wordObj of currentWords) {
      if (guessedWords.includes(wordObj) || skippedWords.includes(wordObj)) continue

      if (input === wordObj.word) {
        setGuessedWords([...guessedWords, wordObj])
        setGuess('')
        socket?.emit('word-guessed', { roomCode, word: wordObj.word, guesser: playerName })
        
        // Add more words if needed
        const remaining = currentWords.length - guessedWords.length - skippedWords.length - 1
        if (remaining <= 2) {
          setCurrentWords([...currentWords, ...selectWords(5)])
        }
        break
      }
    }
  }

  const skipWord = () => {
    for (const wordObj of currentWords) {
      if (!guessedWords.includes(wordObj) && !skippedWords.includes(wordObj)) {
        setSkippedWords([...skippedWords, wordObj])
        socket?.emit('word-skipped', { roomCode, word: wordObj.word })
        break
      }
    }
  }

  const handleEndTurn = () => {
    setTurnActive(false)
    setGamePhase('turn-end')
  }

  const handleNextTurn = () => {
    setGamePhase('turn-start')
    // Emit next turn to server
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

  return (
    <div className="space-y-6">
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
                const isSkipped = skippedWords.includes(wordObj)
                
                return (
                  <motion.div
                    key={`${wordObj.word}-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={`glass-strong rounded-xl p-4 border-2 ${getDifficultyColor(wordObj.difficulty)} ${
                      isGuessed ? 'opacity-30 line-through' : isSkipped ? 'opacity-20 line-through' : ''
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
                onClick={skipWord}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Skip (-1pt)
              </button>
              <button
                onClick={handleEndTurn}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition-all"
              >
                End Turn
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="glass rounded-xl p-4 flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{guessedWords.length}</div>
              <div className="text-sm text-gray-400">Guessed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{skippedWords.length}</div>
              <div className="text-sm text-gray-400">Skipped</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {guessedWords.reduce((sum, w) => sum + w.points, 0) - skippedWords.length}
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
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-4xl font-bold text-green-400">{guessedWords.length}</div>
              <div className="text-gray-400">Words Guessed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-400">{skippedWords.length}</div>
              <div className="text-gray-400">Words Skipped</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">
                {guessedWords.reduce((sum, w) => sum + w.points, 0) - skippedWords.length}
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
        </motion.div>
      )}
    </div>
  )
}
