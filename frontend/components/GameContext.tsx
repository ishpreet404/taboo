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
  teamCount: number
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
  coAdmins?: string[] // List of co-admin player names
  tabooReporting?: boolean // Enable taboo reporting feature
  tabooVoting?: boolean // Enable taboo voting feature
  confirmedTaboosByTeam?: Record<number, number> // Track taboo point deductions per team
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
  isAdmin: boolean // true if host or co-admin
  isReconnecting: boolean // true while attempting to reconnect to a session
  myTeam: number | null
  currentScreen: 'room' | 'lobby' | 'game' | 'gameover'
  players: Player[]
  gameState: GameState
  connected: boolean
  notification: Notification | null
  teamSwitchingLocked: boolean
  lobbyTeamCount: number
  tabooReporting: boolean
  tabooVoting: boolean
  setTabooSettings: (reporting: boolean, voting: boolean) => void
  setNotification: (notification: Notification | null) => void
  setPlayerName: (name: string) => void
  createRoom: (name: string) => void
  joinRoom: (code: string, name: string) => void
  joinTeam: (teamIndex: number) => void
  startGame: (teamCount?: number) => void
  leaveGame: () => void
  setCurrentScreen: (screen: 'room' | 'lobby' | 'game' | 'gameover') => void
  submitWordFeedback: (word: string, feedback: string, difficulty: string) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false) // true if host or co-admin
  const [myTeam, setMyTeam] = useState<number | null>(null)
  const [currentScreen, setCurrentScreen] = useState<'room' | 'lobby' | 'game' | 'gameover'>('room')
  const [isReconnecting, setIsReconnecting] = useState(false) // Show loading during reconnection
  const [players, setPlayers] = useState<Player[]>([])
  const [teamSwitchingLocked, setTeamSwitchingLocked] = useState(false)
  const [midTurnJoinData, setMidTurnJoinData] = useState<any>(null)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [lobbyTeamCount, setLobbyTeamCount] = useState(2) // Track team count in lobby
  const [tabooReporting, setTabooReporting] = useState(false) // Taboo reporting off by default
  const [tabooVoting, setTabooVoting] = useState(false) // Taboo voting off by default
  const wasKicked = useRef(false)
  const [gameState, setGameState] = useState<GameState>({
    teams: [
      { name: 'Team 1', players: [], score: 0 },
      { name: 'Team 2', players: [], score: 0 }
    ],
    teamCount: 2,
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

    // Generate or retrieve session ID
    let sessionId = localStorage.getItem('taboo_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('taboo_session_id', sessionId)
    }

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true, // Force new connection each time
    })

    // Check if there's a stored session before connecting
    const storedRoomCode = localStorage.getItem('taboo_room_code')
    const storedPlayerName = localStorage.getItem('taboo_player_name')
    const storedSessionId = localStorage.getItem('taboo_session_id')
    const hasStoredSession = storedRoomCode && storedPlayerName && storedSessionId

    // If there's a stored session, show reconnecting state
    if (hasStoredSession) {
      setIsReconnecting(true)
    }

    newSocket.on('connect', () => {
      console.log('✅ Connected to server, Socket ID:', newSocket.id)
      setConnected(true)

      // Attempt auto-reconnect if we have stored session
      if (hasStoredSession) {
        console.log('🔄 Attempting to reconnect to room:', storedRoomCode)
        newSocket.emit('reconnect-session', {
          roomCode: storedRoomCode,
          playerName: storedPlayerName,
          sessionId: storedSessionId
        })
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    // Handle successful reconnection
    newSocket.on('reconnect-success', (data) => {
      console.log('✅ Reconnected to room:', data.roomCode)
      wasKicked.current = false
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setIsHost(data.isHost)
      setIsAdmin(data.isHost || data.isCoAdmin)
      setPlayerName(data.playerName)
      setIsReconnecting(false) // Clear reconnecting state

      // Restore team
      const currentPlayer = data.room.players.find((p: any) => p.id === newSocket.id)
      if (currentPlayer) {
        setMyTeam(currentPlayer.team)
      }

      // Restore taboo settings
      if (data.tabooReporting !== undefined) {
        setTabooReporting(data.tabooReporting)
      }
      if (data.tabooVoting !== undefined) {
        setTabooVoting(data.tabooVoting)
      }

      // Restore game state
      if (data.gameState) {
        setGameState(data.gameState)
        setLobbyTeamCount(data.gameState.teamCount || 2)
        setCurrentScreen(data.room.started ? 'game' : 'lobby')

        // Dispatch custom event with full reconnection data for GameScreen (if game is started)
        if (data.room.started) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('session-reconnected', {
              detail: {
                roundHistory: data.roundHistory || [],
                gameState: data.gameState,
                tabooReporting: data.tabooReporting,
                tabooVoting: data.tabooVoting,
                turnInProgress: data.gameState?.turnActive && data.gameState?.currentWords?.length > 0,
                currentWords: data.gameState?.currentWords || [],
                timeRemaining: data.gameState?.timeRemaining,
                currentTurnGuessedWords: data.gameState?.currentTurnGuessedWords || [],
                currentTurnWrongGuesses: data.gameState?.currentTurnWrongGuesses || [],
                guessedByPlayer: data.gameState?.guessedByPlayer || [],
              }
            }))
          }, 100)
        }
      } else {
        setCurrentScreen('lobby')
      }

      setNotification({ message: 'Reconnected to game!', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
    })

    // Handle failed reconnection (room no longer exists)
    newSocket.on('reconnect-failed', (data) => {
      console.log('❌ Reconnection failed:', data.message)
      // Clear stored session
      localStorage.removeItem('taboo_room_code')
      localStorage.removeItem('taboo_player_name')
      setIsReconnecting(false) // Clear reconnecting state
      setNotification({ message: data.message || 'Could not reconnect to room', type: 'warning' })
      setTimeout(() => setNotification(null), 4000)
    })

    newSocket.on('room-created', (data) => {
      wasKicked.current = false
      console.log(`📦 Room created! Room: ${data.roomCode}, Socket ID: ${newSocket.id}`)
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setIsHost(true)
      setIsAdmin(true) // Host is always admin
      // Save session info
      localStorage.setItem('taboo_room_code', data.roomCode)
      if (playerName) localStorage.setItem('taboo_player_name', playerName)
      // Set initial team count from room
      if (data.room.teamCount) {
        setLobbyTeamCount(data.room.teamCount)
      }
      // Find this player's team assignment
      const currentPlayer = data.room.players.find((p: any) => p.id === newSocket.id)
      if (currentPlayer) {
        setMyTeam(currentPlayer.team)
      }
      setCurrentScreen('lobby')
    })

    newSocket.on('room-joined', (data) => {
      wasKicked.current = false
      console.log(`📦 Joined room! Room: ${data.roomCode}, Socket ID: ${newSocket.id}`)
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setIsHost(false) // Joining player is not the host
      setIsAdmin(data.isCoAdmin || false) // Check if rejoining as co-admin
      // Save session info
      localStorage.setItem('taboo_room_code', data.roomCode)
      if (playerName) localStorage.setItem('taboo_player_name', playerName)
      // Set lobby team count from server
      if (data.teamCount) {
        setLobbyTeamCount(data.teamCount)
      }
      // Set taboo settings from server
      if (data.tabooReporting !== undefined) {
        setTabooReporting(data.tabooReporting)
      }
      if (data.tabooVoting !== undefined) {
        setTabooVoting(data.tabooVoting)
      }
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
      setIsHost(false)
      setIsAdmin(data.isCoAdmin || false) // Check if rejoining as co-admin
      // Save session info
      localStorage.setItem('taboo_room_code', data.roomCode)
      if (playerName) localStorage.setItem('taboo_player_name', playerName)
      // Set team count from game state or data
      if (data.teamCount) {
        setLobbyTeamCount(data.teamCount)
      } else if (data.gameState?.teamCount) {
        setLobbyTeamCount(data.gameState.teamCount)
      }
      setCurrentScreen('lobby') // Show lobby so they can pick a team
      setNotification({ message: 'Game is in progress! Please join a team to participate.', type: 'info' })
      setTimeout(() => setNotification(null), 4000)
    })

    newSocket.on('room-rejoined', (data) => {
      console.log('[ROOM-REJOINED] Full data received:', data)
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setGameState(data.gameState)
      // Find player's team
      const player = data.room.players.find((p: any) => p.id === newSocket.id)
      if (player) {
        setMyTeam(player.team)
      }
      // Sync taboo settings
      if (data.tabooReporting !== undefined) {
        setTabooReporting(data.tabooReporting)
      }
      if (data.tabooVoting !== undefined) {
        setTabooVoting(data.tabooVoting)
      }
      setCurrentScreen('game')
      setNotification({ message: 'Reconnected to game!', type: 'success' })
      setTimeout(() => setNotification(null), 3000)

      // Dispatch custom event with full reconnection data for GameScreen
      // Use setTimeout to ensure GameScreen has mounted first
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('session-reconnected', {
          detail: {
            roundHistory: data.roundHistory || [],
            gameState: data.gameState,
            tabooReporting: data.tabooReporting,
            tabooVoting: data.tabooVoting,
            turnInProgress: data.gameState?.turnActive && data.gameState?.currentWords?.length > 0,
            currentWords: data.gameState?.currentWords || [],
            timeRemaining: data.gameState?.timeRemaining,
            currentTurnGuessedWords: data.gameState?.currentTurnGuessedWords || [],
            currentTurnWrongGuesses: data.gameState?.currentTurnWrongGuesses || [],
            guessedByPlayer: data.gameState?.guessedByPlayer || [],
          }
        }))
      }, 100)
    })

    newSocket.on('player-joined', (data) => {
      setPlayers(data.room.players)
      // Sync team count for existing players when someone new joins
      if (data.teamCount) {
        setLobbyTeamCount(data.teamCount)
      }
    })

    newSocket.on('team-count-changed', (data) => {
      console.log('team-count-changed received:', data.teamCount)
      setLobbyTeamCount(data.teamCount)
    })

    newSocket.on('taboo-settings-changed', (data) => {
      console.log('taboo-settings-changed received:', data)
      setTabooReporting(data.tabooReporting)
      setTabooVoting(data.tabooVoting)
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
      console.log('🔄 team-updated event received:', data)
      setPlayers(data.room.players)
      // Update myTeam based on current player's team assignment from server
      const currentPlayer = data.room.players.find((p: any) => p.id === newSocket.id)
      if (currentPlayer) {
        setMyTeam(currentPlayer.team)
      }
      // Show notification if provided
      if (data.message) {
        console.log('Setting notification:', data.message)
        setNotification({ message: data.message, type: 'info' })
        setTimeout(() => setNotification(null), 3000)
      }
    })

    newSocket.on('team-updated-midgame', (data) => {
      console.log('🔄 team-updated-midgame event received:', data)
      setPlayers(data.room.players)
      setGameState(data.gameState)

      // Show notification if provided (for team randomization)
      if (data.message) {
        console.log('Setting notification:', data.message)
        setNotification({ message: data.message, type: 'info' })
        setTimeout(() => setNotification(null), 3000)
      }

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
      console.log(`🎮 Game started! Socket ID: ${newSocket.id}`)
      setGameState(data.gameState)
      setCurrentScreen('game')
    })

    newSocket.on('third-team-added', (data) => {
      console.log('🟢 third-team-added event received:', data)
      setGameState(data.gameState)
      setLobbyTeamCount(3)
      if (data.room) {
        setPlayers(data.room.players)
      }
      // Don't set notification here - let the game-state-updated handler do it
      // or handle notification display in the component that needs it
    })

    newSocket.on('third-team-removed', (data) => {
      console.log('🔴 third-team-removed event received:', data)
      setGameState(data.gameState)
      setLobbyTeamCount(2)
      setPlayers(data.room.players)
      // Update myTeam if I was on Team 3
      const currentPlayer = data.room.players.find((p: any) => p.id === newSocket.id)
      if (currentPlayer) {
        console.log('Updating myTeam from', myTeam, 'to', currentPlayer.team)
        setMyTeam(currentPlayer.team)
      }
      // Don't set notification here - let the game-state-updated handler do it
      // or handle notification display in the component that needs it
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
      console.log('[GAME-OVER] Received data:', data)
      console.log('[GAME-OVER] confirmedTaboosByTeam:', data.gameState?.confirmedTaboosByTeam)
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
      setIsAdmin(false)
      setMyTeam(null)
      // Clear session data
      localStorage.removeItem('taboo_room_code')
      localStorage.removeItem('taboo_player_name')
    })

    // Listen for co-admin promotion
    newSocket.on('made-co-admin', (data) => {
      setIsAdmin(true)
      setNotification({ message: data.message || 'You are now a co-admin!', type: 'success' })
      setTimeout(() => setNotification(null), 4000)
    })

    // Listen for co-admin demotion
    newSocket.on('removed-co-admin', (data) => {
      setIsAdmin(false)
      setNotification({ message: data.message || 'You are no longer a co-admin.', type: 'info' })
      setTimeout(() => setNotification(null), 4000)
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
      setIsAdmin(false)
      setMyTeam(null)
      // Reset taboo toggles to default (off)
      setTabooReporting(false)
      setTabooVoting(false)
      // Clear session data
      localStorage.removeItem('taboo_room_code')
      localStorage.removeItem('taboo_player_name')
    })

    newSocket.on('you-left-game', (data) => {
      setNotification({ message: data.message, type: 'info' })
      setTimeout(() => setNotification(null), 4000)
      setCurrentScreen('room')
      setRoomCode(null)
      setPlayers([])
      setIsHost(false)
      setIsAdmin(false)
      setMyTeam(null)
      // Reset taboo toggles to default (off)
      setTabooReporting(false)
      setTabooVoting(false)
      // Clear session data
      localStorage.removeItem('taboo_room_code')
      localStorage.removeItem('taboo_player_name')
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

    // Handle tab/window close - DON'T emit leave-game, let grace period handle reconnection
    const handleBeforeUnload = () => {
      // Don't emit leave-game here - allow reconnection via grace period
      // The socket will disconnect naturally and the server will wait before removing player
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
      // Don't emit leave-game on cleanup - allow reconnection
      newSocket.close()
    }
  }, [])

  const createRoom = (name: string) => {
    setPlayerName(name)
    localStorage.setItem('taboo_player_name', name)
    socket?.emit('create-room', { playerName: name, sessionId: localStorage.getItem('taboo_session_id') })
  }

  const joinRoom = (code: string, name: string) => {
    setPlayerName(name)
    localStorage.setItem('taboo_player_name', name)
    socket?.emit('join-room', { roomCode: code, playerName: name, sessionId: localStorage.getItem('taboo_session_id') })
  }

  const joinTeam = (teamIndex: number) => {
    setMyTeam(teamIndex)
    socket?.emit('join-team', { roomCode, teamIndex })
  }

  const startGame = (teamCount: number = 2) => {
    if (!isHost) return

    // Build teams array based on teamCount
    const teams: Array<{ name: string; players: string[]; score: number }> = [
      { name: 'Team 1', players: players.filter(p => p.team === 0).map(p => p.name), score: 0 },
      { name: 'Team 2', players: players.filter(p => p.team === 1).map(p => p.name), score: 0 }
    ];

    if (teamCount === 3) {
      teams.push({ name: 'Team 3', players: players.filter(p => p.team === 2).map(p => p.name), score: 0 });
    }

    // Reset game state to initial values for a fresh game
    const newGameState: GameState = {
      teams,
      currentTeamIndex: 0,
      currentDescriberIndex: teamCount === 3 ? [0, 0, 0] : [0, 0],
      round: 1,
      maxRounds: 12,
      turnTime: 60,
      timeRemaining: 60,
      currentWords: [],
      guessedWords: [],
      skippedWords: [],
      playerContributions: {},
      teamCount
    }

    socket?.emit('start-game', { roomCode, gameState: newGameState })
  }

  const leaveGame = () => {
    socket?.emit('leave-game', { roomCode })
    // Clear session data when explicitly leaving
    localStorage.removeItem('taboo_room_code')
    localStorage.removeItem('taboo_player_name')
    setMyTeam(null)
    // Reset taboo toggles to default (off)
    setTabooReporting(false)
    setTabooVoting(false)
    // Reset room state
    setRoomCode(null)
    setPlayers([])
    setIsHost(false)
    setIsAdmin(false)
    setCurrentScreen('room')
  }

  // Function to update taboo settings (host only)
  const setTabooSettings = (reporting: boolean, voting: boolean) => {
    console.log('[SET-TABOO-SETTINGS] Called with:', { reporting, voting, hasSocket: !!socket, roomCode })
    if (socket && roomCode) {
      console.log('[SET-TABOO-SETTINGS] Emitting set-taboo-settings event')
      socket.emit('set-taboo-settings', { roomCode, tabooReporting: reporting, tabooVoting: voting })
    }
  }

  // Function to submit word feedback
  const submitWordFeedback = (word: string, feedback: string, difficulty: string) => {
    if (socket && roomCode && playerName) {
      socket.emit('submit-word-feedback', {
        roomCode,
        playerName,
        word,
        difficulty,
        feedback,
        timestamp: new Date().toISOString()
      })
    }
  }

  return (
    <GameContext.Provider
      value={{
        socket,
        roomCode,
        playerName,
        isHost,
        isAdmin,
        isReconnecting,
        myTeam,
        currentScreen,
        players,
        gameState,
        connected,
        notification,
        teamSwitchingLocked,
        lobbyTeamCount,
        tabooReporting,
        tabooVoting,
        setTabooSettings,
        setNotification,
        setPlayerName,
        createRoom,
        joinRoom,
        joinTeam,
        startGame,
        leaveGame,
        setCurrentScreen,
        submitWordFeedback
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
