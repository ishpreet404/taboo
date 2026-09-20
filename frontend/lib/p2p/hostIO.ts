// Minimal in-browser stand-in for the Socket.IO *server* API.
//
// gameCore.js only uses a small slice of Socket.IO (io.on/to/emit,
// socket.on/emit/join/leave/to, io.sockets.*). This file implements exactly
// that slice on top of any transport that can deliver (event, args) to a
// client - WebRTC data channels for remote players, a direct function call
// for the host's own player. It has no imports so it also runs under plain Node
// for tests.

type Handler = (...args: any[]) => void
export type Deliver = (event: string, args: any[]) => void

// Socket.IO JSON-serialises every payload, and the game core relies on that
// (rooms hold Sets, Maps and timer handles that must not reach clients as
// live references). Do the same here, including for the local host player.
const wireClone = (args: any[]): any[] => JSON.parse(JSON.stringify(args))

class RoomEmitter {
  private io: HostIO
  private room: string
  private exceptId: string | null

  constructor(io: HostIO, room: string, exceptId: string | null) {
    this.io = io
    this.room = room
    this.exceptId = exceptId
  }

  emit(event: string, ...args: any[]) {
    const members = this.io.sockets.adapter.rooms.get(this.room)
    if (!members) return true
    const payload = wireClone(args)
    // Copy: a delivery can synchronously cause joins/leaves
    Array.from(members).forEach((id) => {
      if (id === this.exceptId) return
      this.io.sockets.sockets.get(id)?._deliver(event, payload)
    })
    return true
  }
}

export class HostSocket {
  // gameCore hangs ad-hoc properties (e.g. playerName) on sockets
  [key: string]: any

  id: string
  // deviceId stands in for the client IP, so kick bans still stick to a device
  handshake: { headers: Record<string, string>; address: string }
  rooms = new Set<string>()
  connected = true

  private io: HostIO
  private deliver: Deliver
  private handlers = new Map<string, Handler[]>()

  constructor(io: HostIO, id: string, deviceId: string, deliver: Deliver) {
    this.io = io
    this.id = id
    this.deliver = deliver
    this.handshake = { headers: {}, address: deviceId }
  }

  on(event: string, fn: Handler) {
    const list = this.handlers.get(event) || []
    list.push(fn)
    this.handlers.set(event, list)
    return this
  }

  emit(event: string, ...args: any[]) {
    this._deliver(event, wireClone(args))
    return true
  }

  join(room: string) {
    this.rooms.add(room)
    const rooms = this.io.sockets.adapter.rooms
    if (!rooms.has(room)) rooms.set(room, new Set())
    rooms.get(room)!.add(this.id)
  }

  leave(room: string) {
    this.rooms.delete(room)
    const rooms = this.io.sockets.adapter.rooms
    const members = rooms.get(room)
    if (!members) return
    members.delete(this.id)
    if (members.size === 0) rooms.delete(room)
  }

  to(room: string) {
    return new RoomEmitter(this.io, room, this.id)
  }

  _deliver(event: string, args: any[]) {
    if (!this.connected) return
    try {
      this.deliver(event, args)
    } catch {
      // A dead channel must not break the game loop for everyone else
    }
  }

  // Called by the transport when a message arrives from this client
  _receive(event: string, args: any[]) {
    if (!this.connected) return
    const list = this.handlers.get(event)
    if (!list) return
    this.io.onActivity?.()
    list.slice().forEach((fn) => {
      try {
        fn(...args)
      } catch (e) {
        // Mirror a Node server: one bad packet shouldn't kill the room
        if (typeof globalThis.console !== 'undefined') globalThis.console.error(`[host] handler "${event}" failed`, e)
      }
    })
  }

  _close() {
    if (!this.connected) return
    this.connected = false
    this._receiveDisconnect()
    Array.from(this.rooms).forEach((room) => this.leave(room))
    this.io.sockets.sockets.delete(this.id)
  }

  private _receiveDisconnect() {
    const list = this.handlers.get('disconnect')
    if (!list) return
    list.slice().forEach((fn) => {
      try {
        fn('transport close')
      } catch (e) {
        if (typeof globalThis.console !== 'undefined') globalThis.console.error('[host] disconnect handler failed', e)
      }
    })
  }
}

export class HostIO {
  sockets = {
    sockets: new Map<string, HostSocket>(),
    adapter: { rooms: new Map<string, Set<string>>() },
  }

  // Called whenever a client event is about to change game state (used for snapshots)
  onActivity: (() => void) | null = null

  private connectionHandlers: Array<(socket: HostSocket) => void> = []

  on(event: string, fn: (socket: HostSocket) => void) {
    if (event === 'connection') this.connectionHandlers.push(fn)
    return this
  }

  to(room: string) {
    return new RoomEmitter(this, room, null)
  }

  emit(event: string, ...args: any[]) {
    const payload = wireClone(args)
    this.sockets.sockets.forEach((s) => s._deliver(event, payload))
    return true
  }

  // Transport entry points -------------------------------------------------

  addClient(id: string, deviceId: string, deliver: Deliver): HostSocket {
    this.sockets.sockets.get(id)?._close()
    const socket = new HostSocket(this, id, deviceId, deliver)
    this.sockets.sockets.set(id, socket)
    // Socket.IO puts every socket in a room named after its id; the core relies on
    // that for one-to-one messages (io.to(socketId).emit)
    socket.join(id)
    this.connectionHandlers.forEach((fn) => fn(socket))
    return socket
  }

  removeClient(id: string) {
    this.sockets.sockets.get(id)?._close()
  }
}
