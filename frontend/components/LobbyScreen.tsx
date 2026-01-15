'use client'

import { motion } from 'framer-motion'
import { Copy, Crown, LogOut, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGame } from './GameContext'

export default function LobbyScreen() {
  const { roomCode, players, isHost, myTeam, joinTeam, startGame, playerName, leaveGame, teamSwitchingLocked, socket, lobbyTeamCount, tabooReporting, tabooVoting, setTabooSettings, playAgainDefaulted } = useGame()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  // Debug: Log lobbyTeamCount changes
  useEffect(() => {
    console.log('LobbyScreen - lobbyTeamCount changed to:', lobbyTeamCount)
  }, [lobbyTeamCount])

  // Update team count and broadcast to all players (host only)
  const handleTeamCountChange = (newTeamCount: number) => {
    console.log('handleTeamCountChange called with:', newTeamCount)
    if (socket && roomCode) {
      socket.emit('set-team-count', { roomCode, teamCount: newTeamCount })
    }
  }

  // Toggle taboo settings (host only)
  const handleTabooReportingToggle = () => {
    const newReporting = !tabooReporting
    // If turning off reporting, also turn off voting
    const newVoting = newReporting ? tabooVoting : false
    setTabooSettings(newReporting, newVoting)
  }

  const handleTabooVotingToggle = () => {
    // Can only toggle voting if reporting is enabled
    if (tabooReporting) {
      setTabooSettings(tabooReporting, !tabooVoting)
    }
  }

  const team1 = players.filter(p => p.team === 0)
  const team2 = players.filter(p => p.team === 1)
  const team3 = players.filter(p => p.team === 2)
  const unassigned = players.filter(p => p.team === null)

  const canStart = team1.length > 0 && team2.length > 0 && (lobbyTeamCount === 2 || team3.length > 0)

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
    }
  }

  const handleLeaveGame = () => {
    setShowLeaveConfirm(false)
    leaveGame()
  }

  return (
    <div className="py-6 md:py-8 relative px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 md:mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Game Lobby</h1>
        <div className="flex items-center justify-center gap-3 relative">
          <div className="glass rounded-xl px-4 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-3">
            <span className="text-gray-400 text-sm md:text-base">Room Code:</span>
            <span className="text-xl md:text-2xl font-mono font-bold tracking-wider">{roomCode}</span>
            <button
              onClick={copyRoomCode}
              className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          {/* Leave Button */}
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="absolute right-0 p-2 md:p-2.5 glass-strong rounded-lg hover:bg-red-500/20 transition-colors text-red-400 border border-red-500/30 hover:border-red-500/50"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Team Count Selection (Host Only) */}
        {isHost && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm text-gray-400">Number of Teams:</span>
            <div className="flex gap-2">
              {/* Determine active visual based on play-again default or actual lobby count */}
              {/** If `playAgainDefaulted` is true, show 2 as active briefly */}
              {(() => {
                const activeCount = playAgainDefaulted ? 2 : lobbyTeamCount
                return (
                  <>
                    <button
                      onClick={() => handleTeamCountChange(2)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeCount === 2
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      2 Teams
                    </button>
                    <button
                      onClick={() => handleTeamCountChange(3)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeCount === 3
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      3 Teams
                    </button>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Taboo Settings (Host Only) */}
        {isHost && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <span className="text-sm text-gray-400">Taboo Features:</span>
            <div className="flex gap-4">
              {/* Taboo Reporting Toggle */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={tabooReporting}
                    onChange={handleTabooReportingToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-orange-500 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
                <span className={`text-sm font-medium ${tabooReporting ? 'text-orange-300' : 'text-gray-500'}`}>
                  🚫 Reporting
                </span>
              </label>

              {/* Taboo Voting Toggle */}
              <label className={`flex items-center gap-2 ${tabooReporting ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={tabooVoting}
                    onChange={handleTabooVotingToggle}
                    disabled={!tabooReporting}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${tabooReporting ? 'bg-gray-700 peer-checked:bg-green-500' : 'bg-gray-800'}`}></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
                <span className={`text-sm font-medium ${tabooVoting && tabooReporting ? 'text-green-300' : 'text-gray-500'}`}>
                  ✓ Voting
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 text-center max-w-md">
              {tabooReporting && tabooVoting
                ? 'Players can report taboo words, then all vote to confirm. Confirmed taboos deduct points.'
                : tabooReporting
                  ? 'Players can report taboo words (no voting). Reported words are auto-confirmed and deduct points.'
                  : 'Taboo features disabled. No reporting or voting.'}
            </p>
          </div>
        )}

        {/* Show settings to non-hosts */}
        {!isHost && (tabooReporting || tabooVoting) && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-400">
            <span>Features:</span>
            {tabooReporting && <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">🚫 Reporting</span>}
            {tabooVoting && <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">✓ Voting</span>}
          </div>
        )}
      </motion.div>

      <div className={`grid ${lobbyTeamCount === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 md:gap-6 mb-6 md:mb-8`}>
        {/* Team 1 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl p-4 md:p-6 border-2 border-blue-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-blue-400">Team 1</h2>
            <span className="text-gray-400 text-sm md:text-base">{team1.length} players</span>
          </div>

          <div className="space-y-2 md:space-y-3 mb-4 min-h-[150px] md:min-h-[200px]">
            {team1.map((player) => (
              <div
                key={player.id}
                className={`glass rounded-xl p-3 md:p-4 flex items-center gap-2 md:gap-3 ${player.name === playerName ? 'ring-2 ring-blue-400' : ''
                  }`}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-sm md:text-base">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-sm md:text-base">{player.name}</span>
                {player.name === playerName && <span className="text-blue-400 text-xs md:text-sm">(You)</span>}
              </div>
            ))}
          </div>

          <button
            onClick={() => joinTeam(0)}
            disabled={myTeam === 0 || teamSwitchingLocked}
            className={`w-full py-2.5 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition-all transform text-sm md:text-base ${myTeam === 0
              ? 'bg-blue-500/50 cursor-not-allowed'
              : teamSwitchingLocked
                ? 'bg-gray-500/50 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
              }`}
          >
            {myTeam === 0 ? 'Current Team' : teamSwitchingLocked ? 'Teams Locked' : 'Join Team 1'}
          </button>
        </motion.div>

        {/* Team 2 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-4 md:p-6 border-2 border-red-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-red-400">Team 2</h2>
            <span className="text-gray-400 text-sm md:text-base">{team2.length} players</span>
          </div>

          <div className="space-y-2 md:space-y-3 mb-4 min-h-[150px] md:min-h-[200px]">
            {team2.map((player) => (
              <div
                key={player.id}
                className={`glass rounded-xl p-3 md:p-4 flex items-center gap-2 md:gap-3 ${player.name === playerName ? 'ring-2 ring-red-400' : ''
                  }`}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-red-500 rounded-full flex items-center justify-center font-bold text-sm md:text-base">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-sm md:text-base">{player.name}</span>
                {player.name === playerName && <span className="text-red-400 text-xs md:text-sm">(You)</span>}
              </div>
            ))}
          </div>

          <button
            onClick={() => joinTeam(1)}
            disabled={myTeam === 1 || teamSwitchingLocked}
            className={`w-full py-2.5 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition-all transform text-sm md:text-base ${myTeam === 1
              ? 'bg-red-500/50 cursor-not-allowed'
              : teamSwitchingLocked
                ? 'bg-gray-500/50 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 hover:scale-105'
              }`}
          >
            {myTeam === 1 ? 'Current Team' : teamSwitchingLocked ? 'Teams Locked' : 'Join Team 2'}
          </button>
        </motion.div>

        {/* Team 3 (Only shown when lobbyTeamCount === 3) */}
        {lobbyTeamCount === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-strong rounded-2xl p-4 md:p-6 border-2 border-green-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-green-400">Team 3</h2>
              <span className="text-gray-400 text-sm md:text-base">{team3.length} players</span>
            </div>

            <div className="space-y-2 md:space-y-3 mb-4 min-h-[150px] md:min-h-[200px]">
              {team3.map((player) => (
                <div
                  key={player.id}
                  className={`glass rounded-xl p-3 md:p-4 flex items-center gap-2 md:gap-3 ${player.name === playerName ? 'ring-2 ring-green-400' : ''
                    }`}
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center font-bold text-sm md:text-base">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm md:text-base">{player.name}</span>
                  {player.name === playerName && <span className="text-green-400 text-xs md:text-sm">(You)</span>}
                </div>
              ))}
            </div>

            <button
              onClick={() => joinTeam(2)}
              disabled={myTeam === 2 || teamSwitchingLocked}
              className={`w-full py-2.5 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition-all transform text-sm md:text-base ${myTeam === 2
                ? 'bg-green-500/50 cursor-not-allowed'
                : teamSwitchingLocked
                  ? 'bg-gray-500/50 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 hover:scale-105'
                }`}
            >
              {myTeam === 2 ? 'Current Team' : teamSwitchingLocked ? 'Teams Locked' : 'Join Team 3'}
            </button>
          </motion.div>
        )}
      </div>

      {/* Unassigned Players */}
      {unassigned.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-xl p-4 mb-6"
        >
          <h3 className="text-lg font-semibold mb-3 text-gray-400">Waiting to join:</h3>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((player) => (
              <div key={player.id} className="glass rounded-lg px-4 py-2 text-sm">
                {player.name}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Start Game Button */}
      {isHost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <button
            onClick={() => startGame(lobbyTeamCount)}
            disabled={!canStart}
            className="px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center gap-2 md:gap-3 mx-auto"
          >
            <Crown className="w-5 h-5 md:w-6 md:h-6" />
            Start Game
            <Play className="w-6 h-6" />
          </button>
          {!canStart && (
            <p className="text-gray-400 text-sm mt-3">
              {lobbyTeamCount === 3
                ? 'Need at least 1 player in each of the 3 teams to start'
                : 'Need at least 1 player in each team to start'}
            </p>
          )}
        </motion.div>
      )}

      {!isHost && (
        <div className="text-center text-gray-400">
          Waiting for host to start the game...
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="glass-strong rounded-2xl p-6 md:p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl md:text-2xl font-bold mb-4">Leave Lobby?</h3>
            <p className="text-gray-400 mb-6 text-sm md:text-base">
              Are you sure you want to leave? You'll need to rejoin with a new name.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 md:px-6 py-2.5 md:py-3 glass rounded-xl hover:bg-white/10 transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveGame}
                className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl transition-colors font-semibold text-sm md:text-base"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
