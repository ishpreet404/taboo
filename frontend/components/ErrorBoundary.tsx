'use client'

import React from 'react'

// A rendering error (for example malformed game state from a broken or hostile host)
// must not leave players on a blank page: offer a way back instead.
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[ui] render failed', error)
  }

  private leaveRoom = () => {
    try {
      localStorage.removeItem('taboo_room_code')
      localStorage.removeItem('taboo_p2p_host_snapshot')
    } catch {
      // storage unavailable
    }
    window.location.href = '/'
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-strong rounded-2xl p-8 max-w-sm text-center border border-red-500/30">
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-300 mb-5">The game hit an unexpected problem. You can try to get back in, or leave the room.</p>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-medium">
              Reload
            </button>
            <button onClick={this.leaveRoom} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 font-semibold">
              Leave room
            </button>
          </div>
        </div>
      </main>
    )
  }
}
