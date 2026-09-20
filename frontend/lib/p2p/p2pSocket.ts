// Drop-in replacement for the socket.io-client socket used by GameContext,
// for serverless (P2P) mode.
//
// It looks like one always-connected socket, but routes by room:
//   - 'create-room'                     -> this browser becomes the game server
//   - 'join-room' / 'reconnect-session' -> WebRTC data channel to that room's host
//                                          (or, after a host reload, re-hosting it)
// Everything else is forwarded over whichever link is active.

import type { DataConnection, Peer } from 'peerjs'
import type { HostedRoom } from './host'
import { encodeFrames, FrameDecoder, HOST_READY_EVENT, peerIdForRoom, peerOptions } from './shared'

type Handler = (...args: any[]) => void

const CONNECT_TIMEOUT_MS = 15000
// A reloading host needs a few seconds to come back; keep knocking for a while
const RELINK_ATTEMPTS = 12
const RELINK_DELAY_MS = 2500
// Mirrors host.ts; read here without importing the (heavy) host module
const HOST_SNAPSHOT_KEY = 'taboo_p2p_host_snapshot'

type Link =
  | { kind: 'host'; roomCode: string; room: HostedRoom }
  | { kind: 'remote'; roomCode: string; peer: Peer; conn: DataConnection }

const normalizeCode = (code: unknown) => String(code || '').trim().toUpperCase()

function mayHaveHostSnapshot(code: string): boolean {
  try {
    return JSON.parse(localStorage.getItem(HOST_SNAPSHOT_KEY) || 'null')?.roomCode === code
  } catch {
    return false
  }
}

export class P2PSocket {
  id: string
  connected = false

  private deviceId: string
  private handlers = new Map<string, Set<Handler>>()
  private link: Link | null = null
  // Serialises link changes so a join can't race a previous teardown
  private linkQueue: Promise<void> = Promise.resolve()
  private closed = false

  constructor(deviceId: string) {
    this.deviceId = deviceId
    this.id = `p2p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    // There's no server to reach, so we're "connected" as soon as listeners are attached
    setTimeout(() => {
      if (this.closed) return
      this.connected = true
      this.dispatch('connect', [])
    }, 0)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.onBeforeUnload)
      window.addEventListener('pagehide', this.onPageHide)
    }
  }

  on(event: string, fn: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(fn)
    return this
  }

  off(event: string, fn?: Handler) {
    if (!fn) this.handlers.delete(event)
    else this.handlers.get(event)?.delete(fn)
    return this
  }

  emit(event: string, ...args: any[]) {
    if (this.closed) return this
    const code = normalizeCode(args[0]?.roomCode)

    if (event === 'create-room') {
      this.enqueue(() => this.startHosting(args))
    } else if (event === 'join-room' || event === 'reconnect-session') {
      this.enqueue(async () => {
        if (this.link?.roomCode !== code) await this.linkToRoom(code, event)
        if (this.link?.roomCode === code) this.send(event, args)
      })
    } else if (event === 'leave-game') {
      this.enqueue(async () => {
        // When the hosting tab leaves, the room can't outlive it: skip the core's
        // "hand host to the next player" path and close the room (sends 'host-left').
        if (this.link?.kind !== 'host') this.send(event, args)
        await this.unlink()
      })
    } else {
      this.send(event, args)
    }
    return this
  }

  close() {
    if (this.closed) return this
    this.closed = true
    this.connected = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.onBeforeUnload)
      window.removeEventListener('pagehide', this.onPageHide)
    }
    // Unmount/navigation, not an explicit leave: a host keeps its snapshot so the
    // room can be resumed (React StrictMode and reloads both come through here).
    const link = this.link
    this.link = null
    if (link?.kind === 'host') link.room.suspend()
    else this.teardown(link)
    this.handlers.clear()
    return this
  }

  disconnect() {
    return this.close()
  }

  // ---------------------------------------------------------------------

  private dispatch(event: string, args: any[]) {
    const list = this.handlers.get(event)
    if (!list) return
    Array.from(list).forEach((fn) => {
      try {
        fn(...args)
      } catch (e) {
        console.error(`[p2p] listener for "${event}" failed`, e)
      }
    })
  }

  private enqueue(task: () => Promise<void>) {
    this.linkQueue = this.linkQueue.then(task).catch((e) => console.error('[p2p] link task failed', e))
  }

  private send(event: string, args: any[]) {
    const link = this.link
    if (!link) return
    if (link.kind === 'host') {
      // Same JSON round-trip and async hop a network socket would have
      const payload = JSON.parse(JSON.stringify(args))
      queueMicrotask(() => link.room.localSocket._receive(event, payload))
    } else if (link.conn.open) {
      encodeFrames({ e: event, a: args }).forEach((frame) => link.conn.send(frame))
    }
  }

  private deliverLocal = (event: string, args: any[]) => queueMicrotask(() => this.dispatch(event, args))

  private async startHosting(createArgs: any[]) {
    await this.unlink()
    try {
      const { hostRoom, roomCodeConsumed } = await import('./host')
      const room = await hostRoom(this.id, this.deviceId, this.deliverLocal)
      if (this.closed) return room.close()
      this.link = { kind: 'host', roomCode: room.roomCode, room }
      this.send('create-room', createArgs)
      queueMicrotask(roomCodeConsumed)
    } catch (e: any) {
      console.error('[p2p] failed to host room', e)
      this.dispatch('error', [{ message: 'Could not create the room. Check your internet connection and try again.' }])
    }
  }

  private async linkToRoom(code: string, reason: 'join-room' | 'reconnect-session') {
    await this.unlink()

    // We were hosting this room a moment ago (reload/crash): become its host again
    if (reason === 'reconnect-session' && mayHaveHostSnapshot(code)) {
      try {
        const { resumeRoom } = await import('./host')
        const room = await resumeRoom(code, this.id, this.deviceId, this.deliverLocal)
        if (room) {
          if (this.closed) return room.suspend()
          this.link = { kind: 'host', roomCode: code, room }
          return
        }
      } catch (e) {
        console.warn('[p2p] could not resume hosted room', e)
      }
    }

    try {
      const link = await this.openRemoteLink(code)
      if (this.closed) return this.teardown(link)
      this.link = link
    } catch (e: any) {
      if (this.closed) return
      const notFound = e?.type === 'peer-unavailable'
      if (reason === 'reconnect-session') {
        this.dispatch('reconnect-failed', [{ message: 'Room no longer exists' }])
      } else {
        this.dispatch('error', [
          { message: notFound ? 'Room not found' : 'Could not connect to the room host. Please try again.' },
        ])
      }
    }
  }

  private async openRemoteLink(code: string): Promise<Link> {
    const { Peer } = await import('peerjs')
    const peer = new Peer(peerOptions())
    const decoder = new FrameDecoder()

    try {
      const conn = await new Promise<DataConnection>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), CONNECT_TIMEOUT_MS)
        const fail = (err: any) => {
          clearTimeout(timer)
          reject(err)
        }
        peer.once('error', fail)
        peer.once('open', () => {
          const c = peer.connect(peerIdForRoom(code), {
            reliable: true,
            serialization: 'json',
            metadata: { clientId: this.id, deviceId: this.deviceId },
          })
          // 'open' fires independently on each side, so the host may not be listening
          // yet. Wait for its hello before sending anything.
          const onHello = (raw: unknown) => {
            if (decoder.push(raw)?.e !== HOST_READY_EVENT) return
            c.off('data', onHello)
            clearTimeout(timer)
            peer.off('error', fail)
            resolve(c)
          }
          c.on('data', onHello)
          c.once('error', fail)
          c.once('close', () => fail(new Error('closed')))
        })
      })

      const link: Link = { kind: 'remote', roomCode: code, peer, conn }
      let hostSaidGoodbye = false

      conn.on('data', (raw) => {
        const msg = decoder.push(raw)
        if (!msg || msg.e === HOST_READY_EVENT) return
        if (msg.e === 'host-left') hostSaidGoodbye = true
        this.dispatch(msg.e, msg.a)
      })
      conn.on('close', () => {
        if (this.link !== link) return // we closed it ourselves
        this.link = null
        this.teardown(link)
        if (hostSaidGoodbye) return
        this.enqueue(() => this.relink(code))
      })
      // A failed send is not a lost link; 'close' is
      conn.on('error', (err) => console.warn('[p2p] connection error', err))
      // Signaling is only needed to set the channel up; losing it later is fine
      peer.on('error', () => {})

      return link
    } catch (e) {
      peer.destroy()
      throw e
    }
  }

  // The channel to the host dropped (sleeping phone, flaky wifi, host reload...)
  private async relink(code: string) {
    this.connected = false
    this.dispatch('disconnect', ['transport close'])

    for (let attempt = 0; attempt < RELINK_ATTEMPTS && !this.closed; attempt++) {
      await new Promise((r) => setTimeout(r, RELINK_DELAY_MS))
      if (this.closed || this.link) return
      try {
        const link = await this.openRemoteLink(code)
        if (this.closed) return this.teardown(link)
        this.link = link
        this.connected = true
        // GameContext answers 'connect' with reconnect-session, which restores our seat
        this.dispatch('connect', [])
        return
      } catch {
        // host still unreachable, keep trying
      }
    }

    if (this.closed) return
    this.connected = true
    this.dispatch('host-left', [{ message: 'Lost connection to the room host' }])
    this.dispatch('connect', [])
  }

  private async unlink() {
    const link = this.link
    if (!link) return
    this.link = null
    // Let a just-sent 'leave-game' reach the host before the channel closes
    await new Promise((r) => setTimeout(r, link.kind === 'remote' ? 250 : 0))
    this.teardown(link)
  }

  // Explicit end of a link: a hosted room is closed for everyone
  private teardown(link: Link | null) {
    if (!link) return
    if (link.kind === 'host') link.room.close()
    else link.peer.destroy()
  }

  private onBeforeUnload = (e: BeforeUnloadEvent) => {
    // The game lives in this tab: closing it interrupts the room for everyone
    if (this.link?.kind !== 'host') return
    e.preventDefault()
    e.returnValue = ''
  }

  private onPageHide = (e: PageTransitionEvent) => {
    if (e.persisted) return
    // Keep the snapshot (a reload resumes the room) and free our peer id now;
    // players keep retrying and get 'host-left' only if we never come back.
    if (this.link?.kind === 'host') this.link.room.suspend()
  }
}

export function createP2PSocket(deviceId: string): P2PSocket {
  return new P2PSocket(deviceId)
}
