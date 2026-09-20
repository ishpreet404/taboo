// How players reach the game logic:
//   'p2p'    - serverless (default): the room creator's device hosts the game over WebRTC
//   'server' - classic: everyone connects to the Socket.IO server at NEXT_PUBLIC_SERVER_URL
// Server mode is opt-in (NEXT_PUBLIC_GAME_MODE=server) so that simply deploying this
// code moves the site off the paid/limited backend; it doubles as the rollback switch.
export type GameMode = 'p2p' | 'server'

export function getGameMode(): GameMode {
  return (process.env.NEXT_PUBLIC_GAME_MODE || '').toLowerCase() === 'server' ? 'server' : 'p2p'
}
