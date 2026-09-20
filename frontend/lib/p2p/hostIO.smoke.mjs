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
assert.equal(last('host', 'room-created').data.room.bannedIPs, undefined, 'ban list stays on the host')
assert.deepEqual(last('host', 'room-created').data.room.bannedPlayers, {})

const players = ['a', 'b', 'c'].map(client)
players.forEach((p, i) => p.send('join-room', { roomCode: 'TEST42', playerName: `P${i}`, sessionId: `s-${p.id}` }))
assert.ok(last('a', 'room-joined') || last('a', 'player-joined'), 'joiner got a join event')
assert.ok(last('host', 'player-joined'), 'host saw the join broadcast')

// --- Security regressions ----------------------------------------------------
// Session ids never reach other players
assert.ok(!JSON.stringify(inbox.a).includes('s-host') && !JSON.stringify(inbox.host).includes('s-a'), 'session ids stay private')
// Knowing a name is not enough to take a seat (join or reconnect)
const thief = client('thief')
thief.send('join-room', { roomCode: 'TEST42', playerName: 'Hosty', sessionId: 'stolen' })
assert.match(last('thief', 'error')?.data.message || '', /already taken/)
thief.send('reconnect-session', { roomCode: 'TEST42', playerName: 'Hosty', sessionId: 'stolen' })
assert.ok(last('thief', 'reconnect-failed'), 'reconnect with a foreign session is refused')
assert.equal(core.gameRooms.get('TEST42').host, 'host', 'host seat was not hijacked')
// Malformed payloads are ignored instead of throwing
for (const bad of [undefined, null, 'x', 42, []]) thief.send('join-team', bad)
thief.send('start-game', undefined)
// Names are cleaned and capped
const longName = client('long')
longName.send('join-room', { roomCode: 'test42 ', playerName: '  <b>Very</b>   Long Name That Keeps Going  ', sessionId: 's-long' })
assert.equal(core.gameRooms.get('TEST42').players.find((p) => p.id === 'long')?.name, 'bVery/b Long Name Th')
io.removeClient('long'); io.removeClient('thief')
core.gameRooms.get('TEST42').players = core.gameRooms.get('TEST42').players.filter((p) => p.id !== 'long')

const missing = client('lost')
missing.send('join-room', { roomCode: 'NOPE00', playerName: 'X' })
assert.equal(last('lost', 'error')?.data.message, 'Room not found')

// Themed packs come from the shared catalog
host.send('change-word-pack', { roomCode: 'TEST42', wordPack: 'bollywood' })
assert.equal(last('a', 'word-pack-changed')?.data.wordPack, 'bollywood')
// Another room's custom pack can't be selected
host.send('change-word-pack', { roomCode: 'TEST42', wordPack: 'custom:OTHER1' })
assert.equal(last('a', 'word-pack-changed')?.data.wordPack, 'bollywood')
// Custom packs: too small is rejected, non-admins are ignored, valid one is applied
host.send('set-custom-pack', { roomCode: 'TEST42', name: 'Tiny', words: ['one', 'two'] })
assert.ok(last('host', 'custom-pack-rejected'))
const myWords = Array.from({ length: 40 }, (_, i) => `inside joke ${i}`)
players[0].send('set-custom-pack', { roomCode: 'TEST42', name: 'Hax', words: myWords })
assert.equal(last('a', 'word-pack-changed')?.data.wordPack, 'bollywood')
host.send('set-custom-pack', { roomCode: 'TEST42', name: '  Our   Jokes ', words: [...myWords, 'INSIDE JOKE 1', 42, '  '] })
assert.deepEqual(last('a', 'word-pack-changed')?.data, { wordPack: 'custom:TEST42', customPackName: 'Our Jokes', wordCount: 40 })

host.send('join-team', { roomCode: 'TEST42', teamIndex: 0 })
players[0].send('join-team', { roomCode: 'TEST42', teamIndex: 0 })
players[1].send('join-team', { roomCode: 'TEST42', teamIndex: 1 })
players[2].send('join-team', { roomCode: 'TEST42', teamIndex: 1 })
host.send('start-game', { roomCode: 'TEST42', gameState: { teamCount: 2, maxRounds: 1, mode: 'sprint', turnTime: 999, teams: [{ name: 'Team 1', players: ['Hosty', 'P0'], score: 0 }, { name: 'Team 2', players: ['P1', 'P2'], score: 0 }] } })
const started = last('c', 'game-started')
assert.ok(started, 'game-started reached a remote player')

// Regression: after a turn starts, events carrying the room must stay small
// (the whole word pack used to be serialised into every broadcast: ~300 KB)
host.send('start-turn', { roomCode: 'TEST42' })
const turn = last('a', 'turn-started')?.data
assert.ok(turn, 'turn-started reached a remote player')
// Mode is enforced by the core (client asked for turnTime 999) and words come from the custom pack
assert.equal(turn.gameState.turnTime, 45)
assert.equal(turn.words.length, 8)
assert.ok(turn.words.every((w) => w.word.startsWith('INSIDE JOKE')))
// maxRounds 1 => this is the final round: sprint doubles it
assert.equal(turn.gameState.activeMultiplier, 2)
assert.ok(!JSON.stringify(core.gameRooms.get('TEST42')).includes('INSIDE JOKE 39') || turn.words.some((w) => w.word === 'INSIDE JOKE 39'), 'custom word list is not broadcast')
const roomBytes = JSON.stringify(core.gameRooms.get('TEST42')).length
assert.ok(roomBytes < 8000, `room payload too large: ${roomBytes} bytes`)

// Guesses are validated by the core, not trusted from the client
const dealtWord = turn.words[0]
players[1].send('word-guessed', { roomCode: 'TEST42', word: dealtWord.word, wordObj: dealtWord, guesser: 'Hosty', points: 99999 })
assert.equal(core.gameRooms.get('TEST42').gameState.teams[0].score, 0, 'the other team cannot score for us')
players[0].send('word-guessed', { roomCode: 'TEST42', word: 'NOT A DEALT WORD', guesser: 'P0', points: 50 })
assert.equal(core.gameRooms.get('TEST42').gameState.teams[0].score, 0, 'undealt words are ignored')
players[0].send('word-guessed', { roomCode: 'TEST42', word: dealtWord.word, wordObj: dealtWord, guesser: 'Somebody Else', points: 99999 })
assert.equal(core.gameRooms.get('TEST42').gameState.teams[0].score, dealtWord.points, 'points are capped at the dealt value')
assert.equal(core.gameRooms.get('TEST42').gameState.guessedByPlayer[0].guesser, 'P0', 'guesser is the sender, not a claimed name')
// Flooding is dropped after the per-second budget
const before = inbox.a.length
for (let i = 0; i < 500; i++) players[2].send('timer-update', { roomCode: 'TEST42', timeRemaining: 10 })
assert.ok(inbox.a.length - before <= 45, 'flood was rate limited')

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
assert.equal(restored.customPack.words.length, 40)
assert.ok(!Object.keys(restored).includes('customPack'))
host.send('sync-game-state', { roomCode: 'TEST42' })

// Dropping a client fires the core's disconnect handling (grace period)
io.removeClient('c')
assert.ok(!io.sockets.sockets.has('c'))
assert.ok(!io.sockets.adapter.rooms.get('TEST42').has('c'))

console.log('room payload bytes:', roomBytes)
console.log('ok - events seen by host:', [...new Set(inbox.host.map((m) => m.event))].join(', '))
process.exit(0) // grace-period timers are still pending
