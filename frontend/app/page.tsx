'use client'

import { GameProvider, useGame } from '@/components/GameContext'
import GameOverScreen from '@/components/GameOverScreen'
import GameScreen from '@/components/GameScreen'
import LobbyScreen from '@/components/LobbyScreen'
import RoomScreen from '@/components/RoomScreen'

function GameContent() {
  const { currentScreen, notification } = useGame()

  return (
    <main className="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {currentScreen === 'room' && <RoomScreen />}
        {currentScreen === 'lobby' && <LobbyScreen />}
        {currentScreen === 'game' && <GameScreen />}
        {currentScreen === 'gameover' && <GameOverScreen />}
      </div>

      {/* Global notification display */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in w-11/12 sm:w-auto">
          <div className={`glass-strong rounded-xl px-8 py-4 border-2 shadow-2xl min-w-[400px] max-w-2xl ${notification.type === 'success' ? 'border-green-500/50 bg-green-500/10' :
              notification.type === 'warning' ? 'border-yellow-500/50 bg-yellow-500/10' :
                'border-cyan-500/50 bg-cyan-500/10'
            }`}>
            <div className={`text-center font-semibold text-base sm:text-lg whitespace-pre-line ${notification.type === 'success' ? 'text-green-300' :
                notification.type === 'warning' ? 'text-yellow-300' :
                  'text-cyan-300'
              }`}>
              {notification.message}
            </div>
          </div>
        </div>
      )}
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
