'use client'

import { getDiscordUser, isDiscordActivity, setupDiscordSdk } from '@/lib/discordSdk'
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface Player {
  id: string
  name: string
  team: number | null
}

interface WordObject {
  word: string
  taboo: string[]
  difficulty: string
  points: number
  rare?: string
}

interface Team {
  name: string
  players: string[]
  score: number
}

interface GameState {
  teams: Team[]
  currentTeamIndex: number
  currentDescriberIndex: number[]
  round: number
  maxRounds: number
  turnTime: number
  timeRemaining: number
  currentWords: WordObject[]
  guessedWords: WordObject[]
  skippedWords: WordObject[]
  playerContributions: Record<string, { points: number; guessedWords?: string[]; describedWords?: string[]; words?: string[] }>
}

interface Notification {
  message: string
  type: 'info' | 'warning' | 'success'
}

interface GameContextType {
  socket: Socket | null
  roomCode: string | null
  playerName: string | null
  isHost: boolean
  myTeam: number | null
  currentScreen: 'room' | 'lobby' | 'game' | 'gameover'
  players: Player[]
  gameState: GameState
  connected: boolean
  notification: Notification | null
  teamSwitchingLocked: boolean
  setNotification: (notification: Notification | null) => void
  setPlayerName: (name: string) => void
  createRoom: (name: string) => void
  joinRoom: (code: string, name: string) => void
  joinTeam: (teamIndex: number) => void
  startGame: () => void
  leaveGame: () => void
  setCurrentScreen: (screen: 'room' | 'lobby' | 'game' | 'gameover') => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [myTeam, setMyTeam] = useState<number | null>(null)
  const [currentScreen, setCurrentScreen] = useState<'room' | 'lobby' | 'game' | 'gameover'>('room')
  const [players, setPlayers] = useState<Player[]>([])
  const [teamSwitchingLocked, setTeamSwitchingLocked] = useState(false)
  const [midTurnJoinData, setMidTurnJoinData] = useState<any>(null)
  const [notification, setNotification] = useState<Notification | null>(null)
  const wasKicked = useRef(false)
  const [gameState, setGameState] = useState<GameState>({
    teams: [
      { name: 'Team 1', players: [], score: 0 },
      { name: 'Team 2', players: [], score: 0 }
    ],
    currentTeamIndex: 0,
    currentDescriberIndex: [0, 0],
    round: 1,
    maxRounds: 12,
    turnTime: 60,
    timeRemaining: 60,
    currentWords: [],
    guessedWords: [],
    skippedWords: [],
    playerContributions: {}
  })

  // Initialize Discord SDK if running as Discord Activity
  useEffect(() => {
    const initDiscord = async () => {
      if (isDiscordActivity()) {
        try {
          console.log('Initializing Discord SDK...')
          const sdk = await setupDiscordSdk()
          if (sdk) {
            console.log('Discord Activity initialized successfully')
            // Get Discord user info and auto-set player name
            const user = await getDiscordUser()
            if (user) {
              setPlayerName(user.username)
              console.log('Discord user logged in:', user.username)
            }
          } else {
            console.warn('Discord SDK setup returned null - running in fallback mode')
          }
        } catch (error) {
          console.error('Discord initialization failed:', error)
          console.log('Continuing in non-Discord mode')
        }
      }
    }

    initDiscord()
  }, [])

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    console.log('Connecting to server:', serverUrl)

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true, // Force new connection each time
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    newSocket.on('room-created', (data) => {
      wasKicked.current = false
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setIsHost(true)
      // Find this player's team assignment
      const currentPlayer = data.room.players.find((p: any) => p.id === newSocket.id)
      if (currentPlayer) {
        setMyTeam(currentPlayer.team)
      }
      setCurrentScreen('lobby')
    })

    newSocket.on('room-joined', (data) => {
      wasKicked.current = false
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      // Find this player's team assignment
      const currentPlayer = data.room.players.find((p: any) => p.id === newSocket.id)
      if (currentPlayer) {
        setMyTeam(currentPlayer.team)
      }
      setCurrentScreen('lobby')
    })

    newSocket.on('room-joined-midgame', (data) => {
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setGameState(data.gameState)
      setCurrentScreen('lobby') // Show lobby so they can pick a team
      setNotification({ message: 'Game is in progress! Please join a team to participate.', type: 'info' })
      setTimeout(() => setNotification(null), 4000)
    })

    newSocket.on('room-rejoined', (data) => {
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setGameState(data.gameState)
      // Find player's team
      const player = data.room.players.find((p: any) => p.id === newSocket.id)
      if (player) {
        setMyTeam(player.team)
      }
      setCurrentScreen('game')
      setNotification({ message: 'Reconnected to game!', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
    })

    newSocket.on('player-joined', (data) => {
      setPlayers(data.room.players)
    })

    newSocket.on('player-joined-midgame', (data) => {
      setPlayers(data.room.players)
      // Notify existing players
      if (data.player.name !== playerName) {
        // Show notification for other players
        console.log(`${data.player.name} joined the game`)
      }
    })

    newSocket.on('player-reconnected', (data) => {
      setPlayers(data.room.players)
      console.log(`${data.playerName} reconnected`)
    })

    newSocket.on('player-left', (data) => {
      setPlayers(data.room.players)
      // Update game state if provided (during active game)
      if (data.gameState) {
        setGameState(data.gameState)
      }
    })

    newSocket.on('host-changed', (data) => {
      setPlayers(data.room.players)
      // Update isHost status for the new host
      const isNewHost = data.hostId === newSocket.id
      setIsHost(isNewHost)
      console.log(`New host: ${data.newHost}`)
      if (isNewHost) {
        setNotification({ message: 'You are now the host of the room!', type: 'info' })
        setTimeout(() => setNotification(null), 3000)
      }
    })

    newSocket.on('team-updated', (data) => {
      setPlayers(data.room.players)
      // Update myTeam based on current player's team assignment from server
      const currentPlayer = data.room.players.find((p: any) => p.id === newSocket.id)
      if (currentPlayer) {
        setMyTeam(currentPlayer.team)
      }
    })

    newSocket.on('team-updated-midgame', (data) => {
      setPlayers(data.room.players)
      setGameState(data.gameState)
      // If this is the player who just joined
      const player = data.room.players.find((p: any) => p.id === newSocket.id)
      if (player && player.name === data.joinedPlayer) {
        setMyTeam(player.team)

        // Store mid-turn data if there's an active turn
        if (data.turnInProgress) {
          console.log(`Joined ${data.joinedTeam} mid-turn! Storing turn data...`)
          setMidTurnJoinData(data)

          // Navigate to game screen
          setCurrentScreen('game')

          // After a small delay, dispatch a custom event for GameScreen to catch
          setTimeout(() => {
            console.log('📢 Dispatching midturn-sync event for GameScreen')
            const event = new CustomEvent('midturn-sync', { detail: data })
            window.dispatchEvent(event)
          }, 150)
        } else {
          console.log(`Joined ${data.joinedTeam}. Game in progress.`)
          setCurrentScreen('game')
        }
      } else {
        // Notify other players
        console.log(`${data.joinedPlayer} joined ${data.joinedTeam}`)
      }
    })

    newSocket.on('game-started', (data) => {
      setGameState(data.gameState)
      setCurrentScreen('game')
    })

    newSocket.on('game-state-updated', (data) => {
      setGameState(data.gameState)
    })

    newSocket.on('word-guessed-sync', (data) => {
      setGameState(data.gameState)
    })

    newSocket.on('word-skipped-sync', (data) => {
      setGameState(data.gameState)
    })

    newSocket.on('turn-ended', (data) => {
      setGameState(data.gameState)
    })

    newSocket.on('next-turn-sync', (data) => {
      setGameState(data.gameState)
    })

    newSocket.on('describer-skipped', (data) => {
      setGameState(data.gameState)
    })

    newSocket.on('turn-skipped', (data) => {
      setGameState(data.gameState)
      if (data.message) {
        setNotification({ message: data.message, type: 'info' })
        setTimeout(() => setNotification(null), 3000)
      }
    })

    newSocket.on('game-over', (data) => {
      // Only show game over screen if player wasn't kicked
      if (!wasKicked.current) {
        setGameState(data.gameState)
        setCurrentScreen('gameover')
      }
    })

    newSocket.on('host-left', (data) => {
      setNotification({ message: data.message, type: 'warning' })
      setTimeout(() => setNotification(null), 3000)
      setCurrentScreen('room')
      setRoomCode(null)
      setPlayers([])
      setIsHost(false)
      setMyTeam(null)
    })

    newSocket.on('player-kicked', (data) => {
      setPlayers(data.room.players)
      if (data.gameState) {
        setGameState(data.gameState)
      }
    })

    newSocket.on('you-were-kicked', (data) => {
      wasKicked.current = true
      setNotification({ message: data.message, type: 'warning' })
      setTimeout(() => setNotification(null), 4000)
      setCurrentScreen('room')
      setRoomCode(null)
      setPlayers([])
      setIsHost(false)
      setMyTeam(null)
    })

    newSocket.on('team-switching-locked', (data) => {
      setTeamSwitchingLocked(data.locked)
      const message = data.locked ? 'Team switching has been locked by the host' : 'Team switching has been unlocked'
      setNotification({ message, type: 'info' })
      setTimeout(() => setNotification(null), 3000)
    })

    newSocket.on('error', (data) => {
      setNotification({ message: data.message, type: 'warning' })
      setTimeout(() => setNotification(null), 3000)
    })

    newSocket.on('describer-changed', (data) => {
      setGameState(data.gameState)
      if (data.message) {
        setNotification({ message: data.message, type: 'info' })
        setTimeout(() => setNotification(null), 3000)
      }
    })

    newSocket.on('error', (data) => {
      console.error('Socket error:', data.message)
      // Error handling can be improved with custom UI in the future
    })

    setSocket(newSocket)

    // Handle tab/window close - ensure socket disconnects
    const handleBeforeUnload = () => {
      if (newSocket && roomCode) {
        newSocket.emit('leave-game', { roomCode })
        newSocket.disconnect()
      }
    }

    // Handle page visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden but not closed yet, keep connection alive
        // Socket.IO will handle disconnection if page is actually closed
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (roomCode) {
        newSocket.emit('leave-game', { roomCode })
      }
      newSocket.close()
    }
  }, [])

  const createRoom = (name: string) => {
    setPlayerName(name)
    socket?.emit('create-room', { playerName: name })
  }

  const joinRoom = (code: string, name: string) => {
    setPlayerName(name)
    socket?.emit('join-room', { roomCode: code, playerName: name })
  }

  const joinTeam = (teamIndex: number) => {
    setMyTeam(teamIndex)
    socket?.emit('join-team', { roomCode, teamIndex })
  }

  const startGame = () => {
    if (!isHost) return

    // Reset game state to initial values for a fresh game
    const newGameState: GameState = {
      teams: [
        { name: 'Team 1', players: players.filter(p => p.team === 0).map(p => p.name), score: 0 },
        { name: 'Team 2', players: players.filter(p => p.team === 1).map(p => p.name), score: 0 }
      ],
      currentTeamIndex: 0,
      currentDescriberIndex: [0, 0],
      round: 1,
      maxRounds: 12,
      turnTime: 60,
      timeRemaining: 60,
      currentWords: [],
      guessedWords: [],
      skippedWords: [],
      playerContributions: {}
    }

    socket?.emit('start-game', { roomCode, gameState: newGameState })
  }

  const leaveGame = () => {
    socket?.emit('leave-game', { roomCode })
    setMyTeam(null)
    setCurrentScreen('room')
  }

  return (
    <GameContext.Provider
      value={{
        socket,
        roomCode,
        playerName,
        isHost,
        myTeam,
        currentScreen,
        players,
        gameState,
        connected,
        notification,
        teamSwitchingLocked,
        setNotification,
        setPlayerName,
        createRoom,
        joinRoom,
        joinTeam,
        startGame,
        leaveGame,
        setCurrentScreen
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
