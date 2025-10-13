'use client'

import { useState, useEffect } from 'react'
import { useGame } from './GameContext'
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
  const [usedWordIndices, setUsedWordIndices] = useState<Set<number>>(new Set())

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

  // Fisher-Yates shuffle algorithm for better randomization
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const selectWords = (count: number) => {
    // Get indices of words we haven't used yet
    const availableIndices = wordDatabase
      .map((_, index) => index)
      .filter(index => !usedWordIndices.has(index))
    
    // If we've used more than 80% of words, reset the used words set
    if (availableIndices.length < wordDatabase.length * 0.2) {
      setUsedWordIndices(new Set())
      return selectWords(count) // Recursively call with reset set
    }
    
    // Shuffle available indices
    const shuffledIndices = shuffleArray(availableIndices)
    
    // Select the requested number of words
    const selectedIndices = shuffledIndices.slice(0, count)
    const selectedWords = selectedIndices.map(index => wordDatabase[index])
    
    // Mark these words as used
    setUsedWordIndices(prev => {
      const newSet = new Set(prev)
      selectedIndices.forEach(index => newSet.add(index))
      return newSet
    })
    
    // Sort by difficulty for better gameplay (easy to hard)
    return selectedWords.sort((a, b) => {
      const difficultyOrder: { [key: string]: number } = { easy: 0, medium: 1, hard: 2 }
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
    })
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
      case 'easy': return 'border-green-500/50 bg-green-500/10 hover:border-green-500/70'
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10 hover:border-yellow-500/70'
      case 'hard': return 'border-red-500/50 bg-red-500/10 hover:border-red-500/70'
      default: return 'border-gray-500/50 bg-gray-500/10 hover:border-gray-500/70'
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { label: 'E', color: 'text-green-400 bg-green-500/20' }
      case 'medium': return { label: 'M', color: 'text-yellow-400 bg-yellow-500/20' }
      case 'hard': return { label: 'H', color: 'text-red-400 bg-red-500/20' }
      default: return { label: '?', color: 'text-gray-400 bg-gray-500/20' }
    }
  }

  const handleLeaveGame = () => {
    setShowLeaveConfirm(false)
    leaveGame()
  }

  return (
    <div className="space-y-3 md:space-y-4 lg:space-y-6 relative px-2 sm:px-0">
      {/* Leave Game Button - Top Right */}
      <div className="absolute -top-2 right-0 z-20">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 glass-strong rounded-lg md:rounded-xl hover:bg-red-500/20 transition-colors flex items-center gap-2 text-red-400 text-sm md:text-base font-medium border border-red-500/30 hover:border-red-500/50"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Leave Game</span>
        </button>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
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
                className="flex-1 px-6 py-3 glass-strong hover:bg-white/5 border border-white/10 rounded-xl transition-colors font-semibold"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Scores */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mt-8 sm:mt-0">
        <div className="glass-strong rounded-lg p-3 md:p-4 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-gray-400 font-medium uppercase tracking-wide">Team 1</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-400 mt-1">
                {gameState.teams[0].score}
              </div>
            </div>
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="glass-strong rounded-lg p-3 md:p-4 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs md:text-sm text-gray-400 font-medium uppercase tracking-wide">Team 2</div>
              <div className="text-2xl md:text-3xl font-bold text-red-400 mt-1">
                {gameState.teams[1].score}
              </div>
            </div>
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-red-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Role Indicator */}
      {gamePhase === 'playing' && (
        <div className={`glass-strong rounded-lg p-3 md:p-4 text-center border ${
            isMyTurn 
              ? 'border-purple-500/30 bg-purple-500/5' 
              : isGuesser 
              ? 'border-green-500/30 bg-green-500/5' 
              : 'border-gray-500/30 bg-gray-500/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-5 h-5 opacity-60" />
            <span className="font-semibold text-lg tracking-wide">
              {isMyTurn 
                ? 'DESCRIBING' 
                : isGuesser 
                ? 'GUESSING' 
                : 'WATCHING'}
            </span>
          </div>
        </div>
      )}

      {/* Bonus Words Notification */}
      {showBonusNotification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 glass-strong rounded-2xl p-6 border-2 border-yellow-500/40 bg-yellow-500/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">BONUS!</div>
            <div className="text-white">+3 Extra Words Added!</div>
          </div>
        </div>
      )}

      {/* Turn Start */}
      {gamePhase === 'turn-start' && (
        <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center border border-white/10">
          <div className={`text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4 font-extrabold ${gameState.currentTeamIndex === 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {currentTeam.name}'s Turn
          </div>
          <div className="text-lg sm:text-xl md:text-2xl mb-4 sm:mb-6">
            Describer: <span className="font-bold text-purple-400">{currentDescriber}</span>
          </div>
          <div className="text-gray-400 mb-4 sm:mb-6 md:mb-8 text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Round {gameState.round} of {gameState.maxRounds}
          </div>
          {isMyTurn && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center items-stretch sm:items-center">
              <button
                onClick={startTurn}
                className="w-full sm:w-auto px-6 sm:px-8 md:px-12 py-3 md:py-4 glass-strong hover:bg-white/5 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg md:text-xl transition-colors border border-white/10"
              >
                Start Turn
              </button>
              <button
                onClick={handleSkipDescribing}
                className="w-full sm:w-auto px-5 sm:px-6 md:px-8 py-3 md:py-4 glass-strong hover:bg-white/5 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-colors border border-white/10"
              >
                Skip Turn
              </button>
            </div>
          )}
          {!isMyTurn && (
            <div className="text-gray-400 text-xs sm:text-sm md:text-base opacity-70">
              Waiting for {currentDescriber} to start...
            </div>
          )}
        </div>
      )}

      {/* Playing */}
      {gamePhase === 'playing' && (
        <>
          {/* Timer */}
          <div className={`glass-strong rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 text-center border transition-colors ${
              timeRemaining <= 10 
                ? 'border-red-500/40 bg-red-500/5' 
                : 'border-blue-500/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
              <Clock className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 ${timeRemaining <= 10 ? 'text-red-500' : 'text-blue-400'}`} />
              <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-blue-400'}`}>
                {timeRemaining}
              </div>
            </div>
          </div>

          {/* Words Grid - Only visible to describer */}
          {isMyTurn && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
              {currentWords.map((wordObj, index) => {
                const isGuessed = guessedWords.includes(wordObj)
                
                return (
                  <div
                    key={`${wordObj.word}-${index}`}
                    className={`glass-strong rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 border ${getDifficultyColor(wordObj.difficulty)} ${
                      isGuessed ? 'opacity-30 line-through' : 'transition-opacity'
                    }`}
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1.5">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getDifficultyBadge(wordObj.difficulty).color}`}>
                          {getDifficultyBadge(wordObj.difficulty).label}
                        </span>
                        <span className={`text-[10px] font-semibold ${getDifficultyBadge(wordObj.difficulty).color.split(' ')[0]}`}>
                          {wordObj.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-bold text-sm sm:text-base md:text-lg lg:text-xl mb-1 sm:mb-2 break-words">{wordObj.word}</div>
                      <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm font-semibold flex items-center justify-center gap-0.5 sm:gap-1">
                        <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-60" />
                        {wordObj.points}pts
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Guess Input - Only for team members who are guessing */}
          {isGuesser && (
            <div className="glass-strong rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 border border-green-500/30">
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={guess}
                  onChange={handleGuess}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your guess..."
                  className="flex-1 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-white/10 border border-white/20 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400 text-base sm:text-lg md:text-xl text-center font-bold uppercase transition-all"
                  autoFocus
                />
                <button
                  onClick={submitGuess}
                  className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 glass-strong hover:bg-white/5 border border-white/10 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* Message and Words Grid for opposite team players (watchers) */}
          {!isOnCurrentTeam && (
            <>
              <div className="glass-strong rounded-lg sm:rounded-xl p-4 sm:p-6 text-center border border-blue-500/20">
                <div className="text-lg sm:text-xl font-semibold text-gray-400">
                  Watching {currentTeam.name}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2">
                  You'll play when it's your team's turn
                </div>
              </div>

              {/* Words Grid for watchers - Read only */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
                {currentWords.map((wordObj, index) => {
                  const isGuessed = guessedWords.includes(wordObj)
                  
                  return (
                    <div
                      key={`${wordObj.word}-${index}`}
                      className={`glass-strong rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 border ${getDifficultyColor(wordObj.difficulty)} ${
                        isGuessed ? 'opacity-30 line-through' : ''
                      }`}
                    >
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getDifficultyBadge(wordObj.difficulty).color}`}>
                            {getDifficultyBadge(wordObj.difficulty).label}
                          </span>
                          <span className={`text-[10px] font-semibold ${getDifficultyBadge(wordObj.difficulty).color.split(' ')[0]}`}>
                            {wordObj.difficulty.toUpperCase()}
                          </span>
                        </div>
                        <div className="font-bold text-sm sm:text-base md:text-lg lg:text-xl mb-1 sm:mb-2 break-words">{wordObj.word}</div>
                        <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm font-semibold flex items-center justify-center gap-0.5 sm:gap-1">
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-60" />
                          {wordObj.points}pts
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Controls */}
          {isMyTurn && (
            <div className="flex gap-3 sm:gap-4 justify-center">
              <button
                onClick={handleEndTurn}
                className="px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 glass-strong hover:bg-white/5 border border-white/10 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg transition-colors"
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
            <div className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-500/20">
              <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-400 flex items-center gap-1.5 sm:gap-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 opacity-60" />
                Recent Guesses:
              </h3>
              <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto custom-scrollbar">
                {guessedByPlayer.slice().reverse().map((item, index) => (
                  <div 
                    key={index}
                    className="glass-strong rounded-md sm:rounded-lg p-1.5 sm:p-2 flex items-center justify-between text-xs sm:text-sm hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <span className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0">
                        {item.guesser.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-green-400 truncate text-xs sm:text-sm">{item.word}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400 truncate">by {item.guesser}</div>
                      </div>
                    </div>
                    <div className="text-blue-400 font-bold bg-blue-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs flex-shrink-0 ml-2">
                      +{item.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Turn End */}
      {gamePhase === 'turn-end' && (
        <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center border border-yellow-500/30">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-yellow-400">
            Turn Complete!
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-500/30">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-400 mb-1 sm:mb-2">
                {guessedWords.length}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm md:text-base flex items-center justify-center gap-0.5 sm:gap-1">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 opacity-50" />
                Words
              </div>
            </div>
            <div className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-500/30">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-400 mb-1 sm:mb-2">
                {guessedWords.reduce((sum, w) => sum + w.points, 0)}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm md:text-base flex items-center justify-center gap-0.5 sm:gap-1">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 opacity-50" />
                Points
              </div>
            </div>
          </div>
          {isMyTurn && (
            <button
              onClick={handleNextTurn}
              className="w-full sm:w-auto px-6 sm:px-8 md:px-12 py-3 md:py-4 glass-strong hover:bg-white/5 border border-white/10 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg md:text-xl transition-colors"
            >
              Next Turn
            </button>
          )}
          {!isMyTurn && (
            <div className="text-gray-400 opacity-70">
              Waiting for {currentDescriber}...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
