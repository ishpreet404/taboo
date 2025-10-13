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
  const [showBonusNotification, setShowBonusNotification] = useState(false)

  const currentTeam = gameState.teams[gameState.currentTeamIndex]
  const currentDescriber = currentTeam.players[gameState.currentDescriberIndex[gameState.currentTeamIndex]]
  const isMyTurn = currentDescriber === playerName
  
  // Check if player is on the current team and not the describer
  const isOnCurrentTeam = playerName ? currentTeam.players.includes(playerName) : false
  const isGuesser = isOnCurrentTeam && !isMyTurn

  // Listen for sync events
  useEffect(() => {
    if (!socket) return

    const handleWordGuessed = (data: any) => {
      // Track who guessed the word and update guessedWords for all players
      if (data.word && data.guesser && data.points && data.wordObj) {
        setGuessedByPlayer(prev => [...prev, {
          word: data.word,
          guesser: data.guesser,
          points: data.points
        }])
        
        // Update guessedWords for all players with the full wordObj
        setGuessedWords(prev => {
          // Avoid duplicates
          if (prev.some(w => w.word === data.word)) {
            return prev
          }
          return [...prev, data.wordObj]
        })
      }
    }

    const handleTurnStarted = (data: any) => {
      // When describer starts turn, all players switch to playing phase
      setGamePhase('playing')
      setTurnActive(true)
      setTimeRemaining(60)
      setGuessedWords([])
      setGuessedByPlayer([])
      // Set the words for all players (including guessers)
      if (data.words) {
        setCurrentWords(data.words)
      }
    }

    const handleTurnEnded = (data: any) => {
      setTurnActive(false)
      setGamePhase('turn-end')
      // Sync guessed words from the describer to all players
      if (data.guessedWords && !isMyTurn) {
        setGuessedWords(data.guessedWords)
      }
      if (data.guessedByPlayer && !isMyTurn) {
        setGuessedByPlayer(data.guessedByPlayer)
      }
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

    const handleBonusWords = (data: any) => {
      if (data.words) {
        setCurrentWords(prev => [...prev, ...data.words])
        setShowBonusNotification(true)
        setTimeout(() => setShowBonusNotification(false), 3000)
      }
    }

    socket.on('word-guessed-sync', handleWordGuessed)
    socket.on('turn-started', handleTurnStarted)
    socket.on('turn-ended', handleTurnEnded)
    socket.on('next-turn-sync', handleNextTurn)
    socket.on('timer-sync', handleTimerSync)
    socket.on('host-left', handleHostLeft)
    socket.on('bonus-words-sync', handleBonusWords)

    return () => {
      socket.off('word-guessed-sync', handleWordGuessed)
      socket.off('turn-started', handleTurnStarted)
      socket.off('turn-ended', handleTurnEnded)
      socket.off('next-turn-sync', handleNextTurn)
      socket.off('timer-sync', handleTimerSync)
      socket.off('host-left', handleHostLeft)
      socket.off('bonus-words-sync', handleBonusWords)
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
    // Only allow guesses from team members who are guessing
    if (!isGuesser) return
    
    const input = guess.trim().toUpperCase()
    if (input.length === 0) return

    for (const wordObj of currentWords) {
      if (guessedWords.includes(wordObj)) continue

      if (input === wordObj.word) {
        const newGuessed = [...guessedWords, wordObj]
        setGuessedWords(newGuessed)
        setGuess('')
        
        // Emit to server with full wordObj
        socket?.emit('word-guessed', { 
          roomCode, 
          word: wordObj.word, 
          wordObj: wordObj,
          guesser: playerName,
          points: wordObj.points 
        })
        
        // Add bonus words when 6 words are guessed correctly
        if (newGuessed.length === 6) {
          const bonusWords = selectWords(3)
          setCurrentWords([...currentWords, ...bonusWords])
          setShowBonusNotification(true)
          setTimeout(() => setShowBonusNotification(false), 3000)
          // Notify server about bonus words
          socket?.emit('bonus-words-added', { roomCode, words: bonusWords })
        }
        
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
      totalPoints,
      guessedWords: guessedWords,
      guessedByPlayer: guessedByPlayer
    })
  }

  const handleNextTurn = () => {
    socket?.emit('next-turn', { roomCode })
  }

  const handleSkipDescribing = () => {
    // Describer can skip their turn before starting
    if (isMyTurn && gamePhase === 'turn-start') {
      socket?.emit('skip-turn', { roomCode, playerName })
      alert('You have skipped your turn!')
    }
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
    <div className="space-y-3 md:space-y-4 lg:space-y-6 relative px-2 sm:px-0">
      {/* Leave Game Button */}
      <div className="absolute -top-2 left-0 z-10">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 glass-strong rounded-lg md:rounded-xl hover:bg-red-500/20 transition-colors flex items-center gap-1 sm:gap-2 text-red-400 text-xs sm:text-sm md:text-base"
        >
          <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
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
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mt-8 sm:mt-0">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.6)' }}
          transition={{ type: "spring", stiffness: 300 }}
          className="glass-strong rounded-lg md:rounded-xl p-2 sm:p-3 md:p-4 border-2 border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-semibold">Team 1</div>
              <motion.div 
                key={gameState.teams[0].score}
                initial={{ scale: 1.5, color: '#60A5FA' }}
                animate={{ scale: 1, color: '#60A5FA' }}
                className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-400"
              >
                {gameState.teams[0].score}
              </motion.div>
            </div>
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            >
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-400" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.02, borderColor: 'rgba(239, 68, 68, 0.6)' }}
          transition={{ type: "spring", stiffness: 300 }}
          className="glass-strong rounded-lg md:rounded-xl p-2 sm:p-3 md:p-4 border-2 border-red-500/30 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-semibold">Team 2</div>
              <motion.div 
                key={gameState.teams[1].score}
                initial={{ scale: 1.5, color: '#F87171' }}
                animate={{ scale: 1, color: '#F87171' }}
                className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400"
              >
                {gameState.teams[1].score}
              </motion.div>
            </div>
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            >
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-400" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Role Indicator */}
      {gamePhase === 'playing' && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={`glass-strong rounded-lg md:rounded-xl p-2 sm:p-3 md:p-4 text-center border-2 shadow-lg ${
            isMyTurn 
              ? 'border-purple-500/50 bg-purple-500/10 shadow-purple-500/20' 
              : isGuesser 
              ? 'border-green-500/50 bg-green-500/10 shadow-green-500/20' 
              : 'border-gray-500/50 bg-gray-500/10'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            <span className="font-bold text-base sm:text-lg md:text-xl">
              {isMyTurn 
                ? '🎤 You are DESCRIBING' 
                : isGuesser 
                ? '🤔 You are GUESSING' 
                : '👀 You are WATCHING'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Bonus Words Notification */}
      <AnimatePresence>
        {showBonusNotification && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 glass-strong rounded-2xl p-6 border-4 border-yellow-500 bg-gradient-to-r from-yellow-500/20 to-orange-500/20"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-2xl font-bold text-yellow-400 mb-1">BONUS!</div>
              <div className="text-white">+3 Extra Words Added!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn Start */}
      {gamePhase === 'turn-start' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center shadow-2xl border-2 border-white/10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4 font-extrabold ${gameState.currentTeamIndex === 0 ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]'}`}
          >
            {currentTeam.name}'s Turn
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl md:text-2xl mb-4 sm:mb-6"
          >
            Describer: <span className="font-bold text-purple-400">{currentDescriber}</span>
          </motion.div>
          <div className="text-gray-400 mb-4 sm:mb-6 md:mb-8 text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Round {gameState.round} of {gameState.maxRounds}
          </div>
          {isMyTurn && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center items-stretch sm:items-center"
            >
              <button
                onClick={startTurn}
                className="w-full sm:w-auto px-6 sm:px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg md:text-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/50"
              >
                🚀 Start Turn
              </button>
              <button
                onClick={handleSkipDescribing}
                className="w-full sm:w-auto px-5 sm:px-6 md:px-8 py-3 md:py-4 bg-orange-500 hover:bg-orange-600 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
              >
                ⏭️ Skip Turn
              </button>
            </motion.div>
          )}
          {!isMyTurn && (
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-gray-400 text-xs sm:text-sm md:text-base"
            >
              Waiting for {currentDescriber} to start...
            </motion.div>
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
            className={`glass-strong rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 text-center border-2 transition-all ${
              timeRemaining <= 10 
                ? 'border-red-500/50 shadow-lg shadow-red-500/30' 
                : 'border-blue-500/30 shadow-lg shadow-blue-500/20'
            }`}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
              <motion.div
                animate={timeRemaining <= 10 ? { 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1] 
                } : {}}
                transition={{ duration: 0.5, repeat: timeRemaining <= 10 ? Infinity : 0 }}
              >
                <Clock className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 ${timeRemaining <= 10 ? 'text-red-500' : 'text-blue-400'}`} />
              </motion.div>
              <motion.div 
                key={timeRemaining}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-3xl sm:text-4xl md:text-5xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-blue-400'}`}
              >
                {timeRemaining}
              </motion.div>
            </div>
          </motion.div>

          {/* Words Grid - Only visible to describer */}
          {isMyTurn && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
              <AnimatePresence>
                {currentWords.map((wordObj, index) => {
                  const isGuessed = guessedWords.includes(wordObj)
                  
                  return (
                    <motion.div
                      key={`${wordObj.word}-${index}`}
                      initial={{ scale: 0, opacity: 0, rotateY: -90 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                      transition={{ type: "spring", stiffness: 200, delay: index * 0.05 }}
                      whileHover={!isGuessed ? { scale: 1.05, rotateZ: 2 } : {}}
                      className={`glass-strong rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 border-2 ${getDifficultyColor(wordObj.difficulty)} ${
                        isGuessed ? 'opacity-30 line-through scale-95' : 'hover:shadow-lg transition-shadow'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-bold text-sm sm:text-base md:text-lg lg:text-xl mb-1 sm:mb-2 md:mb-3 break-words">{wordObj.word}</div>
                        <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm font-semibold flex items-center justify-center gap-0.5 sm:gap-1">
                          <Zap className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${!isGuessed && 'animate-pulse'}`} />
                        {wordObj.points}pts
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            </div>
          )}

          {/* Guess Input - Only for team members who are guessing */}
          {isGuesser && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 150 }}
              className="glass-strong rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 shadow-xl border-2 border-green-500/30"
            >
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={guess}
                  onChange={handleGuess}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your guess..."
                  className="flex-1 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-white/10 border-2 border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400 text-base sm:text-lg md:text-xl text-center font-bold uppercase transition-all"
                  autoFocus
                />
                <button
                  onClick={submitGuess}
                  className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all transform hover:scale-105 whitespace-nowrap shadow-lg hover:shadow-blue-500/50"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          )}

          {/* Message for opposite team players */}
          {!isOnCurrentTeam && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-strong rounded-lg sm:rounded-xl p-4 sm:p-6 text-center"
            >
              <div className="text-lg sm:text-xl font-semibold text-gray-400">
                👀 Watch {currentTeam.name} play their turn!
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2">
                You'll play when it's your team's turn
              </div>
            </motion.div>
          )}

          {/* Controls */}
          {isMyTurn && (
            <div className="flex gap-3 sm:gap-4 justify-center">
              <button
                onClick={handleEndTurn}
                className="px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-red-500 hover:bg-red-600 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                End Turn
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 flex justify-around text-center gap-2">
            <div className="flex-1">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-400">{guessedWords.length}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400">Words</div>
            </div>
            <div className="flex-1">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-400">
                {guessedWords.reduce((sum, w) => sum + w.points, 0)}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-400">Points</div>
            </div>
          </div>

          {/* Who Guessed What */}
          {guessedByPlayer.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-500/20"
            >
              <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-400 flex items-center gap-1.5 sm:gap-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                Recent Guesses:
              </h3>
              <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {guessedByPlayer.slice().reverse().map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-strong rounded-md sm:rounded-lg p-1.5 sm:p-2 flex items-center justify-between text-xs sm:text-sm hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-lg flex-shrink-0"
                        >
                          {item.guesser.charAt(0).toUpperCase()}
                        </motion.span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-green-400 truncate text-xs sm:text-sm">{item.word}</div>
                          <div className="text-[10px] sm:text-xs text-gray-400 truncate">by {item.guesser}</div>
                        </div>
                      </div>
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-blue-400 font-bold bg-blue-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs flex-shrink-0 ml-2"
                      >
                        +{item.points}
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Turn End */}
      {gamePhase === 'turn-end' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateX: -15 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center shadow-2xl border-2 border-yellow-500/30"
        >
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"
          >
            Turn Complete! 🎉
          </motion.div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-500/30"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-400 mb-1 sm:mb-2"
              >
                {guessedWords.length}
              </motion.div>
              <div className="text-gray-400 text-xs sm:text-sm md:text-base flex items-center justify-center gap-0.5 sm:gap-1">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                Words
              </div>
            </motion.div>
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-500/30"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-400 mb-1 sm:mb-2"
              >
                {guessedWords.reduce((sum, w) => sum + w.points, 0)}
              </motion.div>
              <div className="text-gray-400 text-xs sm:text-sm md:text-base flex items-center justify-center gap-0.5 sm:gap-1">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                Points
              </div>
            </motion.div>
          </div>
          {isMyTurn && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextTurn}
              className="w-full sm:w-auto px-6 sm:px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg md:text-xl transition-all shadow-lg hover:shadow-purple-500/50"
            >
              Next Turn
            </motion.button>
          )}
          {!isMyTurn && (
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-gray-400"
            >
              Waiting for {currentDescriber}...
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
