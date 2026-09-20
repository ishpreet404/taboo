// Runs the authoritative game server inside the room creator's browser.
// Loaded lazily (dynamic import) so only hosts download the word database.

import Peer, { DataConnection } from 'peerjs'
import { attachGameServer } from '../game/gameCore'
import { HostIO, HostSocket, Deliver } from './hostIO'
import { encodeFrames, FrameDecoder, HOST_READY_EVENT, peerIdForRoom, peerOptions, sendFeedbackRows } from './shared'

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_CODE_ATTEMPTS = 5

// Events only the hosting tab itself may send
const LOCAL_ONLY_EVENTS = new Set(['create-room', 'disconnect', 'connection'])
// Far above any real party; stops a script from exhausting the host's browser
const MAX_REMOTE_PLAYERS = 40

// Host recovery: the room is mirrored to localStorage so a reloaded (or crashed and
// reopened) host tab can pick the game back up while players are still retrying.
const SNAPSHOT_KEY = 'taboo_p2p_host_snapshot'
const SNAPSHOT_MAX_AGE_MS = 3 * 60 * 1000
const SNAPSHOT_DEBOUNCE_MS = 500
// After a reload the broker can take a few seconds to release our old peer id
const RESUME_CLAIM_ATTEMPTS = 8
const RESUME_CLAIM_DELAY_MS = 1500

// gameCore keeps module-level state, so there is one io per page and every
// room hosted from this tab attaches to it.
let io: HostIO | null = null
let core: ReturnType<typeof attachGameServer> | null = null
let pendingRoomCode: string | null = null

function getIO(): HostIO {
  if (io) return io
  io = new HostIO()
  core = attachGameServer(io, {
    generateRoomCode: () => pendingRoomCode || randomRoomCode(),
    sendFeedback: (rows: any[]) => sendFeedbackRows('feedback', rows),
    sendSuggestions: (rows: any[]) => sendFeedbackRows('suggestions', rows),
  })
  return io
}

function randomRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  return code
}

// Claim a room code by registering it as our peer id on the signaling broker.
function openPeer(code: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(peerIdForRoom(code), peerOptions())
    peer.once('open', () => resolve(peer))
    peer.once('error', (err) => {
      peer.destroy()
      reject(err)
    })
  })
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

interface StoredSnapshot {
  roomCode: string
  savedAt: number
  room: string
}

function readSnapshot(): StoredSnapshot | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null') as StoredSnapshot | null
    if (!stored || typeof stored.roomCode !== 'string' || typeof stored.room !== 'string') return null
    if (Date.now() - stored.savedAt > SNAPSHOT_MAX_AGE_MS) {
      localStorage.removeItem(SNAPSHOT_KEY)
      return null
    }
    return stored
  } catch {
    return null
  }
}

function clearSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------

export interface HostedRoom {
  roomCode: string
  localSocket: HostSocket
  /** Ends the room for everyone (explicit leave). */
  close: (message?: string) => void
  /** Tab is going away: keep the snapshot so a reload can resume, drop the network. */
  suspend: () => void
}

function serveRoom(peer: Peer, roomCode: string, localId: string, deviceId: string, deliverLocal: Deliver): HostedRoom {
  const gameIO = getIO()
  const remoteIds = new Set<string>()
  let closed = false
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null

  const saveSnapshot = () => {
    snapshotTimer = null
    if (closed) return
    try {
      const room = core?.exportRoom(roomCode)
      if (!room) return clearSnapshot() // room ended inside the core
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ roomCode, savedAt: Date.now(), room } as StoredSnapshot))
    } catch {
      // storage full/unavailable: recovery is best-effort
    }
  }
  gameIO.onActivity = () => {
    if (!snapshotTimer) snapshotTimer = setTimeout(saveSnapshot, SNAPSHOT_DEBOUNCE_MS)
  }

  peer.on('connection', (conn: DataConnection) => {
    const clientId: string = conn.metadata?.clientId || conn.peer
    const clientDevice: string = conn.metadata?.deviceId || conn.peer
    // Nobody remote may speak as the host's own player
    if (clientId === localId || typeof clientId !== 'string' || clientId.length > 64 || typeof clientDevice !== 'string' || clientDevice.length > 80 || remoteIds.size >= MAX_REMOTE_PLAYERS) {
      conn.close()
      return
    }

    conn.on('open', () => {
      remoteIds.add(clientId)
      const socket = gameIO.addClient(clientId, clientDevice, (event, args) => {
        if (!conn.open) return
        encodeFrames({ e: event, a: args }).forEach((frame) => conn.send(frame))
      })
      const decoder = new FrameDecoder()
      conn.on('data', (raw) => {
        const msg = decoder.push(raw)
        if (!msg || LOCAL_ONLY_EVENTS.has(msg.e)) return
        socket._receive(msg.e, msg.a)
      })
      conn.on('close', () => {
        // A newer connection may have replaced this one under the same id
        if (gameIO.sockets.sockets.get(clientId) !== socket) return
        gameIO.removeClient(clientId)
        remoteIds.delete(clientId)
      })
      // Errors (e.g. one oversized message) are not a disconnect; 'close' is.
      conn.on('error', (err) => console.warn('[p2p host] connection error', err))
      conn.send({ e: HOST_READY_EVENT, a: [] })
    })
  })

  // Losing the broker doesn't drop existing players, but new ones can't find
  // us until we re-register.
  peer.on('disconnected', () => {
    if (!closed && !peer.destroyed) setTimeout(() => !closed && !peer.destroyed && peer.reconnect(), 2000)
  })
  peer.on('error', (err) => console.warn('[p2p host] peer error', err?.type || err))

  const localSocket = gameIO.addClient(localId, deviceId, deliverLocal)

  const stop = () => {
    closed = true
    if (snapshotTimer) clearTimeout(snapshotTimer)
    if (gameIO.onActivity) gameIO.onActivity = null
  }

  const close = (message = 'The host closed the room') => {
    if (closed) return
    stop()
    clearSnapshot()
    // Everyone except the host's own player, who already knows
    localSocket.to(roomCode).emit('host-left', { message })
    gameIO.removeClient(localId)
    // Give the farewell a moment to flush before tearing the channels down
    setTimeout(() => {
      remoteIds.forEach((id) => gameIO.removeClient(id))
      peer.destroy()
    }, 300)
  }

  const suspend = () => {
    if (closed) return
    saveSnapshot()
    stop()
    // Free the peer id right away so the reloaded tab can claim it again
    peer.destroy()
  }

  return { roomCode, localSocket, close, suspend }
}

export async function hostRoom(localId: string, deviceId: string, deliverLocal: Deliver): Promise<HostedRoom> {
  let peer: Peer | null = null
  let roomCode = ''
  let lastError: any = null

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !peer; attempt++) {
    roomCode = randomRoomCode()
    try {
      peer = await openPeer(roomCode)
    } catch (err: any) {
      lastError = err
      // Code already in use by another host: just roll a new one
      if (err?.type !== 'unavailable-id') break
    }
  }
  if (!peer) throw lastError || new Error('Could not reach the signaling server')

  clearSnapshot()
  getIO()
  // The core asks for a room code inside create-room; hand it the one we claimed.
  // The facade sends create-room right after this resolves.
  pendingRoomCode = roomCode
  return serveRoom(peer, roomCode, localId, deviceId, deliverLocal)
}

/** Called by the facade once the local create-room has been delivered. */
export function roomCodeConsumed() {
  pendingRoomCode = null
}

/** Re-host a room from the snapshot left by this browser's previous tab. */
export async function resumeRoom(roomCode: string, localId: string, deviceId: string, deliverLocal: Deliver): Promise<HostedRoom | null> {
  const snapshot = readSnapshot()
  if (!snapshot || snapshot.roomCode !== roomCode) return null

  let peer: Peer | null = null
  for (let attempt = 0; attempt < RESUME_CLAIM_ATTEMPTS && !peer; attempt++) {
    try {
      peer = await openPeer(roomCode)
    } catch (err: any) {
      if (err?.type !== 'unavailable-id') break
      await new Promise((r) => setTimeout(r, RESUME_CLAIM_DELAY_MS))
    }
  }
  if (!peer) return null

  const gameIO = getIO()
  let room: any
  try {
    room = core!.importRoom(snapshot.room)
  } catch {
    clearSnapshot()
    peer.destroy()
    return null
  }

  // Everyone in the snapshot is, right now, disconnected. Walk each player through
  // the core's own disconnect path so the normal 30 s grace period applies: whoever
  // reconnects is restored, whoever doesn't is removed exactly as on a real server.
  for (const player of room.players as Array<{ id: string }>) {
    gameIO.addClient(player.id, '', () => {})
    gameIO.removeClient(player.id)
  }

  return serveRoom(peer, roomCode, localId, deviceId, deliverLocal)
}
