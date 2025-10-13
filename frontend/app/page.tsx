'use client'

import { GameProvider } from '@/components/GameContext'
import RoomScreen from '@/components/RoomScreen'
import LobbyScreen from '@/components/LobbyScreen'
import GameScreen from '@/components/GameScreen'
import GameOverScreen from '@/components/GameOverScreen'
import { useGame } from '@/components/GameContext'

function GameContent() {
  const { currentScreen } = useGame()

  return (
    <main className="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {currentScreen === 'room' && <RoomScreen />}
        {currentScreen === 'lobby' && <LobbyScreen />}
        {currentScreen === 'game' && <GameScreen />}
        {currentScreen === 'gameover' && <GameOverScreen />}
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  )
}
