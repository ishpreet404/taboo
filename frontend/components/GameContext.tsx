'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  playerContributions: Record<string, { points: number; words: string[] }>
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

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const newSocket = io(serverUrl)

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    newSocket.on('room-created', (data) => {
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setIsHost(true)
      setCurrentScreen('lobby')
    })

    newSocket.on('room-joined', (data) => {
      setRoomCode(data.roomCode)
      setPlayers(data.room.players)
      setCurrentScreen('lobby')
    })

    newSocket.on('player-joined', (data) => {
      setPlayers(data.room.players)
    })

    newSocket.on('player-left', (data) => {
      setPlayers(data.room.players)
    })

    newSocket.on('team-updated', (data) => {
      setPlayers(data.room.players)
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

    newSocket.on('game-over', (data) => {
      setGameState(data.gameState)
      setCurrentScreen('gameover')
    })

    newSocket.on('game-left', (data) => {
      setCurrentScreen('lobby')
    })

    newSocket.on('host-left', (data) => {
      alert(data.message)
      setCurrentScreen('room')
      setRoomCode(null)
      setPlayers([])
      setIsHost(false)
      setMyTeam(null)
    })

    newSocket.on('error', (data) => {
      alert(data.message)
    })

    setSocket(newSocket)

    return () => {
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

    const newGameState = { ...gameState }
    newGameState.teams[0].players = players.filter(p => p.team === 0).map(p => p.name)
    newGameState.teams[1].players = players.filter(p => p.team === 1).map(p => p.name)

    socket?.emit('start-game', { roomCode, gameState: newGameState })
  }

  const leaveGame = () => {
    socket?.emit('leave-game', { roomCode })
    setCurrentScreen('lobby')
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
