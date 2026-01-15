'use client'

import { motion } from 'framer-motion'
import { Check, Copy, Crown, Edit3, Flag, LogOut, Play, Shuffle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGame } from './GameContext'

export default function LobbyScreen() {
  const { roomCode, players, isHost, isAdmin, myTeam, joinTeam, startGame, playerName, leaveGame, teamSwitchingLocked, socket, lobbyTeamCount, tabooReporting, tabooVoting, setTabooSettings, playAgainDefaulted, gameState, setNotification } = useGame()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null)
  const [editingTeamName, setEditingTeamName] = useState<string>('')

  // Debug: Log lobbyTeamCount changes
  useEffect(() => {
    console.log('LobbyScreen - lobbyTeamCount changed to:', lobbyTeamCount)
  }, [lobbyTeamCount])

  // Socket listeners for captain draft flow
  useEffect(() => {
    if (!socket) return

    const onStart = (data: any) => {
      // show modal for admin to pick captains
      setSelectedCaptains(Array(lobbyTeamCount).fill(null))
      setCaptainModalOpen(true)
    }

    const onCaptainsConfirmed = (data: any) => {
      // server sends draft order / teams initial
      setDraftState(data)
      setCaptainModalOpen(false)
    }

    const onCaptainPickTurn = (data: any) => {
      setDraftState(data)
    }

    const onCaptainPicked = (data: any) => {
      setDraftState((prev: any) => ({ ...(prev || {}), ...data }))
    }

    const onLastPlayerChoice = (data: any) => {
      // If this client is the last player, server sends this event to that client only
      setDraftState((prev: any) => ({ ...(prev || {}), lastPlayerChoice: data }))
    }

    const onCaptainSelectionComplete = (data: any) => {
      setDraftState(null)
      setCaptainModalOpen(false)
      // server will emit team updates; show notification
      setNotification({ message: 'Captain draft complete. Teams assigned.', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
    }

    socket.on('captain-selection-started', onStart)
    socket.on('captains-confirmed', onCaptainsConfirmed)
    socket.on('captain-pick-turn', onCaptainPickTurn)
    socket.on('captain-picked', onCaptainPicked)
    socket.on('last-player-choice', onLastPlayerChoice)
    socket.on('captain-waiting-ready', (d: any) => {
      // ensure draft state contains captains list
      setDraftState((prev: any) => ({ ...(prev || {}), captains: d.captains }))
    })
    socket.on('captain-ready-update', (d: any) => {
      setDraftState((prev: any) => ({ ...(prev || {}), ready: d.ready }))
    })
    socket.on('coin-flip', (d: any) => {
      // optional: could show animation; for now attach to draftState
      setDraftState((prev: any) => ({ ...(prev || {}), coinFlipInProgress: true }))
    })
    socket.on('coin-result', (d: any) => {
      setDraftState((prev: any) => ({ ...(prev || {}), coinFlipInProgress: false, coinResult: d.winningTeamIndex }))
    })
    socket.on('captain-selection-complete', onCaptainSelectionComplete)

    return () => {
      socket.off('captain-selection-started', onStart)
      socket.off('captains-confirmed', onCaptainsConfirmed)
      socket.off('captain-pick-turn', onCaptainPickTurn)
      socket.off('captain-picked', onCaptainPicked)
      socket.off('last-player-choice', onLastPlayerChoice)
      socket.off('captain-waiting-ready')
      socket.off('captain-ready-update')
      socket.off('coin-flip')
      socket.off('coin-result')
      socket.off('captain-selection-complete', onCaptainSelectionComplete)
    }
  }, [socket, lobbyTeamCount])

  // Admin confirms selected captains
  const confirmCaptains = () => {
    if (!isAdmin || !socket || !roomCode) return
    // validate
    const picks = selectedCaptains.filter(Boolean) as string[]
    if (picks.length !== lobbyTeamCount) {
      setNotification({ message: 'Please select a captain for each team.', type: 'warning' })
      setTimeout(() => setNotification(null), 3000)
      return
    }
    const unique = Array.from(new Set(picks))
    if (unique.length !== picks.length) {
      setNotification({ message: 'Cannot select the same player as captain for multiple teams.', type: 'warning' })
      setTimeout(() => setNotification(null), 3000)
      return
    }
    // selectedCaptains contains player ids
    socket.emit('admin-set-captains', { roomCode, captains: selectedCaptains })
    setCaptainModalOpen(false)
  }

  // Player (captain) picks a player during draft
  const pickPlayer = (playerId: string) => {
    if (!socket || !roomCode) return
    socket.emit('captain-pick', { roomCode, playerId })
  }

  // Captain ready for coin flip
  const captainReady = () => {
    if (!socket || !roomCode) return
    socket.emit('captain-ready', { roomCode })
  }

  // Last remaining player chooses a team
  const chooseTeamAsLastPlayer = (teamIndex: number) => {
    if (!socket || !roomCode) return
    socket.emit('last-player-choose', { roomCode, teamIndex })
  }

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
  // Only show players who have opted back into the waiting list.
  // Treat undefined as true so new joiners (without an explicit flag) are visible by default.
  const unassigned = players.filter(p => p.team === null && (p.showInWaiting !== false))

  // Use team names from gameState when available so lobby reflects admin-renamed names
  const teamName = (idx: number, fallback: string) => {
    try {
      return gameState?.teams?.[idx]?.name || fallback
    } catch (e) {
      return fallback
    }
  }

  const canStart = team1.length > 0 && team2.length > 0 && (lobbyTeamCount === 2 || team3.length > 0)

  const handleSaveEdit = (teamIndex: number) => {
    if (!isAdmin) return
    const newName = (editingTeamName || '').trim()
    if (!newName) return
    socket?.emit('rename-team', { roomCode, teamIndex, newName })
    setEditingTeamIndex(null)
    setEditingTeamName('')
  }

  const handleRandomizeTeams = () => {
    if (!isAdmin) return
    socket?.emit('admin-randomize-teams', { roomCode })
  }

  // Captain selection / draft states (admin only)
  const [captainModalOpen, setCaptainModalOpen] = useState(false)
  const [selectedCaptains, setSelectedCaptains] = useState<(string | null)[]>([])
  const [draftState, setDraftState] = useState<any>(null)

  // Start captain selection (host/admin)
  const handleStartCaptainSelection = () => {
    if (!isAdmin) return
    if (lobbyTeamCount !== 2) {
      // For now only support 2-team captain draft
      setNotification({ message: 'Captain draft currently supports 2 teams only.', type: 'warning' })
      setTimeout(() => setNotification(null), 3000)
      return
    }
    socket?.emit('start-captain-selection', { roomCode })
  }

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

        {/* Host controls: Number of Teams (left) + Randomize (center) + Taboo Features (right) */}
        {isHost && (
          <div className="mt-3 w-full flex justify-center">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-8">
              {/* Left: Number of Teams */}
              <div className="flex items-center gap-3 min-w-0 justify-self-center md:justify-self-end">
                <span className="text-sm text-gray-400 whitespace-nowrap">Number of Teams:</span>
                <div className="flex gap-2">
                  {(() => {
                    const activeCount = playAgainDefaulted ? 2 : lobbyTeamCount
                    return (
                      <>
                        <button
                          onClick={() => handleTeamCountChange(2)}
                          className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeCount === 2 ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                        >
                          2
                        </button>
                        <button
                          onClick={() => handleTeamCountChange(3)}
                          className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeCount === 3 ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                        >
                          3
                        </button>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Center: Randomize button */}
              <div className="flex items-center justify-center justify-self-center">
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRandomizeTeams}
                      className="px-3 py-1 glass-strong rounded-lg hover:bg-purple-500/20 transition-colors flex items-center gap-2 text-purple-400 border border-purple-500/20 whitespace-nowrap"
                    >
                      <Shuffle className="w-4 h-4" />
                      <span className="inline">Randomize Teams</span>
                    </button>
                    <button
                      onClick={handleStartCaptainSelection}
                      className="px-3 py-1 glass-strong rounded-lg hover:bg-yellow-500/20 transition-colors flex items-center gap-2 text-yellow-300 border border-yellow-500/20 whitespace-nowrap"
                    >
                      <Crown className="w-4 h-4" />
                      <span className="inline">Start Captain Draft</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Taboo Features + description under it */}
              <div className="flex flex-col items-center md:items-start justify-self-center md:justify-self-start">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 whitespace-nowrap">Taboo Features:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" checked={tabooReporting} onChange={handleTabooReportingToggle} className="sr-only peer" />
                        <div className="w-10 h-6 bg-gray-700 rounded-full peer peer-checked:bg-orange-500 transition-colors"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                      </div>
                      <span className={`text-sm font-medium ${tabooReporting ? 'text-orange-300' : 'text-gray-500'}`}>
                        <Flag className="w-4 h-4 inline mr-1 text-orange-300" />
                        Reporting
                      </span>
                    </label>

                    <label className={`flex items-center gap-2 ${tabooReporting ? '' : 'opacity-50'}`}>
                      <div className="relative">
                        <input type="checkbox" checked={tabooVoting} onChange={handleTabooVotingToggle} disabled={!tabooReporting} className="sr-only peer" />
                        <div className={`w-10 h-6 rounded-full transition-colors ${tabooReporting ? 'bg-gray-700 peer-checked:bg-green-500' : 'bg-gray-800'}`}></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                      </div>
                      <span className={`text-sm font-medium ${tabooVoting && tabooReporting ? 'text-green-300' : 'text-gray-500'}`}>
                        <Check className="w-4 h-4 inline mr-1 text-green-300" />
                        <X className="w-4 h-4 inline mr-1 text-red-400" />
                        Voting
                      </span>
                    </label>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center md:text-right max-w-xs mt-1 mx-auto md:mx-0">
                  {tabooReporting && tabooVoting
                    ? 'Players can report taboo words, then all vote to confirm. Confirmed taboos deduct points.'
                    : tabooReporting
                      ? 'Players can report taboo words (no voting). Reported words are auto-confirmed and deduct points.'
                      : 'Taboo features disabled. No reporting or voting.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show settings to non-hosts */}
        {!isHost && (tabooReporting || tabooVoting) && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-400">
            <span>Features:</span>
            {tabooReporting && <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs flex items-center gap-1"><Flag className="w-3 h-3" /> Reporting</span>}
            {tabooVoting && <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1"><Check className="w-3 h-3 text-green-300" /><X className="w-3 h-3 text-red-400" /> Voting</span>}
          </div>
        )}
      </motion.div>

      {/* Start Game Button (moved above teams) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-6"
      >
        {/* Randomize button removed here (kept in the centered host-controls row) */}

        {isHost && (
          <button
            onClick={() => startGame(lobbyTeamCount)}
            disabled={!canStart}
            className="px-8 md:px-12 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center gap-2 md:gap-3 mx-auto"
          >
            <Crown className="w-5 h-5 md:w-6 md:h-6" />
            Start Game
            <Play className="w-6 h-6" />
          </button>
        )}

        {!isHost && !isAdmin && (
          <div className="text-center text-gray-400">Waiting for host to start the game...</div>
        )}

        {!isHost && isHost === false && null}

        {!isHost && isHost === false && null}

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
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              {editingTeamIndex === 0 ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    autoFocus
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 min-w-0 max-w-full px-3 py-1 rounded-lg bg-white/5 outline-none text-sm text-blue-400 truncate"
                    value={editingTeamName}
                    onChange={(e) => setEditingTeamName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(0) }
                      else if (e.key === 'Escape') { setEditingTeamIndex(null); setEditingTeamName('') }
                    }}
                    placeholder="Team 1"
                  />
                  <button onClick={() => handleSaveEdit(0)} className="flex-shrink-0 px-3 py-1 glass-strong rounded-lg text-sm text-green-300">Save</button>
                  <button onClick={() => { setEditingTeamIndex(null); setEditingTeamName('') }} className="flex-shrink-0 px-3 py-1 glass rounded-lg text-sm text-gray-300">Cancel</button>
                </div>
              ) : (
                <h2 className="text-xl md:text-2xl font-bold text-blue-400 flex items-center gap-2 min-w-0">
                  <span className="truncate">{teamName(0, 'Team 1')}</span>
                  {isAdmin && <button title="Edit team name" onClick={() => { setEditingTeamIndex(0); setEditingTeamName(teamName(0, 'Team 1')) }} className="ml-1 p-1 rounded-md hover:bg-white/5 flex-shrink-0"><Edit3 className="w-4 h-4 text-gray-300" /></button>}
                </h2>
              )}
            </div>
            <span className="text-gray-400 text-sm md:text-base ml-3 flex-shrink-0">{team1.length} {team1.length === 1 ? 'player' : 'players'}</span>
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
            {myTeam === 0 ? 'Current Team' : teamSwitchingLocked ? 'Teams Locked' : `Join ${teamName(0, 'Team 1')}`}
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
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              {editingTeamIndex === 1 ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    autoFocus
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 min-w-0 max-w-full px-3 py-1 rounded-lg bg-white/5 outline-none text-sm text-red-400 truncate"
                    value={editingTeamName}
                    onChange={(e) => setEditingTeamName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(1) }
                      else if (e.key === 'Escape') { setEditingTeamIndex(null); setEditingTeamName('') }
                    }}
                    placeholder="Team 2"
                  />
                  <button onClick={() => handleSaveEdit(1)} className="flex-shrink-0 px-3 py-1 glass-strong rounded-lg text-sm text-green-300">Save</button>
                  <button onClick={() => { setEditingTeamIndex(null); setEditingTeamName('') }} className="flex-shrink-0 px-3 py-1 glass rounded-lg text-sm text-gray-300">Cancel</button>
                </div>
              ) : (
                <h2 className="text-xl md:text-2xl font-bold text-red-400 flex items-center gap-2 min-w-0">
                  <span className="truncate">{teamName(1, 'Team 2')}</span>
                  {isAdmin && <button title="Edit team name" onClick={() => { setEditingTeamIndex(1); setEditingTeamName(teamName(1, 'Team 2')) }} className="ml-1 p-1 rounded-md hover:bg-white/5 flex-shrink-0"><Edit3 className="w-4 h-4 text-gray-300" /></button>}
                </h2>
              )}
            </div>
            <span className="text-gray-400 text-sm md:text-base ml-3 flex-shrink-0">{team2.length} {team2.length === 1 ? 'player' : 'players'}</span>
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
            {myTeam === 1 ? 'Current Team' : teamSwitchingLocked ? 'Teams Locked' : `Join ${teamName(1, 'Team 2')}`}
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
              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                {editingTeamIndex === 2 ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      autoFocus
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 min-w-0 max-w-full px-3 py-1 rounded-lg bg-white/5 outline-none text-sm text-green-400 truncate"
                      value={editingTeamName}
                      onChange={(e) => setEditingTeamName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(2) }
                        else if (e.key === 'Escape') { setEditingTeamIndex(null); setEditingTeamName('') }
                      }}
                      placeholder="Team 3"
                    />
                    <button onClick={() => handleSaveEdit(2)} className="flex-shrink-0 px-3 py-1 glass-strong rounded-lg text-sm text-green-300">Save</button>
                    <button onClick={() => { setEditingTeamIndex(null); setEditingTeamName('') }} className="flex-shrink-0 px-3 py-1 glass rounded-lg text-sm text-gray-300">Cancel</button>
                  </div>
                ) : (
                  <h2 className="text-xl md:text-2xl font-bold text-green-400 flex items-center gap-2 min-w-0">
                    <span className="truncate">{teamName(2, 'Team 3')}</span>
                    {isAdmin && <button title="Edit team name" onClick={() => { setEditingTeamIndex(2); setEditingTeamName(teamName(2, 'Team 3')) }} className="ml-1 p-1 rounded-md hover:bg-white/5 flex-shrink-0"><Edit3 className="w-4 h-4 text-gray-300" /></button>}
                  </h2>
                )}
              </div>
              <span className="text-gray-400 text-sm md:text-base ml-3 flex-shrink-0">{team3.length} {team3.length === 1 ? 'player' : 'players'}</span>
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
              {myTeam === 2 ? 'Current Team' : teamSwitchingLocked ? 'Teams Locked' : `Join ${teamName(2, 'Team 3')}`}
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

      {/* Captain selection modal (admin selects captains) */}
      {captainModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCaptainModalOpen(false)}>
          <div className="glass-strong rounded-2xl p-6 md:p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl md:text-2xl font-bold mb-4">Select Captains</h3>
            <p className="text-sm text-gray-400 mb-4">Click a player to assign them as captain for each team.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: lobbyTeamCount }).map((_, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5">
                  <div className="text-sm text-gray-300 mb-2">Team {idx + 1} Captain</div>
                  <div className="flex flex-wrap gap-2">
                    {players.map((p) => {
                      const alreadySelected = selectedCaptains.includes(p.id) && selectedCaptains[idx] !== p.id
                      return (
                        <button key={p.id} disabled={alreadySelected} onClick={() => setSelectedCaptains((prev) => {
                          const copy = [...(prev || Array(lobbyTeamCount).fill(null))]
                          copy[idx] = p.id
                          return copy
                        })} className={`px-3 py-1 rounded-lg ${selectedCaptains[idx] === p.id ? 'bg-yellow-500 text-black' : alreadySelected ? 'opacity-50 cursor-not-allowed glass' : 'glass'}`}>
                          {p.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setCaptainModalOpen(false)} className="flex-1 px-4 py-2 glass rounded-xl">Cancel</button>
              <button onClick={confirmCaptains} className="flex-1 px-4 py-2 bg-yellow-500 rounded-xl">Confirm Captains</button>
            </div>
          </div>
        </div>
      )}

      {/* Draft modal (active picking) */}
      {draftState && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDraftState(null)}>
          <div className="glass-strong rounded-2xl p-6 md:p-8 max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl md:text-2xl font-bold mb-4">Captain Draft</h3>
            {/* Captains + ready state / coin result */}
            {draftState?.captains && (
              <div className="mb-4 flex items-center gap-4">
                {draftState.captains.map((cid: string, i: number) => (
                  <div key={cid} className="p-2 rounded-md bg-white/5 flex-1">
                    <div className="text-sm text-gray-300">Team {i + 1} Captain</div>
                    <div className="font-semibold">{draftState.captainNames?.[i] || (players.find(p => p.id === cid)?.name) || '—'}</div>
                    <div className="text-xs text-gray-400 mt-1">{draftState.ready && draftState.ready[cid] ? 'Ready' : 'Not ready'}</div>
                    {socket?.id === cid && !draftState.ready?.[cid] && (
                      <button onClick={captainReady} className="mt-2 px-3 py-1 bg-blue-500 rounded-lg text-sm">Press Ready</button>
                    )}
                  </div>
                ))}
                <div className="p-2 rounded-md bg-white/5">
                  {draftState.coinFlipInProgress ? (
                    <div className="text-sm text-gray-300">Coin flipping...</div>
                  ) : draftState.coinResult !== undefined ? (
                    <div className="text-sm text-gray-300">Coin: {draftState.coinResult === 0 ? 'Blue' : 'Red'} — {`Team ${draftState.coinResult + 1}`} picks first</div>
                  ) : (
                    <div className="text-sm text-gray-300">Waiting for captains to ready...</div>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-400 mb-2">Teams</div>
                <div className="grid grid-cols-1 gap-2">
                  {draftState.teams?.map((t: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5">
                      <div className="text-sm text-gray-300">{teamName(i, `Team ${i + 1}`)}</div>
                      <div className="font-semibold mt-2">{t.players.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-80">
                <div className="text-sm text-gray-400 mb-2">Available Players</div>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {draftState.lastPlayerChoice ? (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="mb-2">You're the last unassigned player. Choose a team:</div>
                      <div className="flex gap-2">
                        {Array.from({ length: (lobbyTeamCount || 2) }).map((_, ti) => (
                          <button key={ti} onClick={() => chooseTeamAsLastPlayer(ti)} className="px-3 py-1 bg-blue-500 rounded-lg">Join Team {ti + 1}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    draftState.availablePlayers?.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <div>{p.name}</div>
                        {draftState.currentCaptainId === socket?.id ? (
                          <button onClick={() => pickPlayer(p.id)} className="px-3 py-1 bg-green-500 rounded-lg">Pick</button>
                        ) : (
                          <div className="text-xs text-gray-400">Waiting for captain</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-3">Current pick: {draftState.currentCaptainName}</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDraftState(null)} className="px-4 py-2 glass rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
