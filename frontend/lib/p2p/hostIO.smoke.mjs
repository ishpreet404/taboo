// Smoke test: run the real game core on the in-browser io shim, no network.
//   node frontend/lib/p2p/hostIO.smoke.mjs
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { HostIO } from './hostIO.ts'
import { encodeFrames, FrameDecoder } from './shared.ts'

const require = createRequire(import.meta.url)
const { attachGameServer } = require('../game/gameCore.js')

const io = new HostIO()
const core = attachGameServer(io, { generateRoomCode: () => 'TEST42' })

const inbox = {}
const client = (id) => {
	inbox[id] = []
	const socket = io.addClient(id, `device-${id}`, (event, args) => inbox[id].push({ event, data: args[0] }))
	return { id, send: (event, data) => socket._receive(event, [data]) }
}
const last = (id, event) => inbox[id].filter((m) => m.event === event).pop()

const host = client('host')
host.send('create-room', { playerName: 'Hosty', sessionId: 's-host', wordPack: 'standard' })
assert.equal(last('host', 'room-created')?.data.roomCode, 'TEST42')
// Sets/Maps on the room must be flattened exactly like Socket.IO would
assert.deepEqual(last('host', 'room-created').data.room.bannedIPs, {})

const players = ['a', 'b', 'c'].map(client)
players.forEach((p, i) => p.send('join-room', { roomCode: 'TEST42', playerName: `P${i}`, sessionId: `s-${p.id}` }))
assert.ok(last('a', 'room-joined') || last('a', 'player-joined'), 'joiner got a join event')
assert.ok(last('host', 'player-joined'), 'host saw the join broadcast')

const missing = client('lost')
missing.send('join-room', { roomCode: 'NOPE00', playerName: 'X' })
assert.equal(last('lost', 'error')?.data.message, 'Room not found')

host.send('join-team', { roomCode: 'TEST42', teamIndex: 0 })
players[0].send('join-team', { roomCode: 'TEST42', teamIndex: 0 })
players[1].send('join-team', { roomCode: 'TEST42', teamIndex: 1 })
players[2].send('join-team', { roomCode: 'TEST42', teamIndex: 1 })
host.send('start-game', { roomCode: 'TEST42', gameState: { teamCount: 2, maxRounds: 4, turnTime: 60, teams: [{ name: 'Team 1', players: ['Hosty', 'P0'], score: 0 }, { name: 'Team 2', players: ['P1', 'P2'], score: 0 }] } })
const started = last('c', 'game-started')
assert.ok(started, 'game-started reached a remote player')

// Regression: after a turn starts, events carrying the room must stay small
// (the whole word pack used to be serialised into every broadcast: ~300 KB)
host.send('start-turn', { roomCode: 'TEST42' })
assert.ok(last('a', 'turn-started'), 'turn-started reached a remote player')
const roomBytes = JSON.stringify(core.gameRooms.get('TEST42')).length
assert.ok(roomBytes < 60000, `room payload too large: ${roomBytes} bytes`)

// One-to-one messages rely on every socket sitting in a room named after its id
io.to('b').emit('direct-test', { ok: true })
assert.ok(last('b', 'direct-test') && !last('a', 'direct-test'), 'io.to(socketId) reaches only that socket')

// Large payloads survive chunking, including multi-byte text
const big = { e: 'big', a: [{ text: 'शब्द "quoted" '.repeat(5000) }] }
const frames = encodeFrames(big)
assert.ok(frames.length > 1 && frames.every((fr) => new TextEncoder().encode(JSON.stringify(fr)).length < 16000))
const decoder = new FrameDecoder()
assert.deepEqual(frames.map((fr) => decoder.push(fr)).pop(), big)

// Host recovery: snapshot -> wipe -> restore keeps Sets/Maps and the hidden pack
const snapshot = core.exportRoom('TEST42')
core.gameRooms.delete('TEST42')
const restored = core.importRoom(snapshot)
assert.ok(restored.usedWordIndices instanceof Set && restored.disconnectedPlayers instanceof Map)
assert.ok(restored.wordPools._packDatabase.length > 0 && !Object.keys(restored.wordPools).includes('_packDatabase'))
assert.equal(restored.players.length, 4)
host.send('sync-game-state', { roomCode: 'TEST42' })

// Dropping a client fires the core's disconnect handling (grace period)
io.removeClient('c')
assert.ok(!io.sockets.sockets.has('c'))
assert.ok(!io.sockets.adapter.rooms.get('TEST42').has('c'))

console.log('room payload bytes:', roomBytes)
console.log('ok - events seen by host:', [...new Set(inbox.host.map((m) => m.event))].join(', '))
process.exit(0) // grace-period timers are still pending
