// Bits shared by the P2P host and the P2P client socket.

export interface WireMessage {
  e: string // event name
  a: any[] // event args
}

// Transport-level hello from host to a new client: "my listeners are attached, go ahead"
export const HOST_READY_EVENT = '__p2p-host-ready'

// Namespaces our room codes on the (shared, public) PeerJS broker
const PEER_ID_PREFIX = 'taboo-inferno-room-'

export function peerIdForRoom(roomCode: string): string {
  return PEER_ID_PREFIX + roomCode.trim().toUpperCase()
}

// Optional JSON merged into the PeerJS options, e.g. to point at a self-hosted
// PeerServer or add your own TURN servers:
//   NEXT_PUBLIC_PEER_OPTIONS={"host":"peer.example.com","secure":true,"config":{"iceServers":[...]}}
// Left unset, PeerJS uses its free public broker plus default STUN/TURN.
export function peerOptions(): Record<string, any> {
  const raw = process.env.NEXT_PUBLIC_PEER_OPTIONS
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    console.warn('NEXT_PUBLIC_PEER_OPTIONS is not valid JSON, ignoring it')
    return {}
  }
}

// Word feedback/suggestions used to go to Google Sheets through the server's
// service account, which can't live in a browser. If NEXT_PUBLIC_FEEDBACK_URL
// is set (e.g. a Google Apps Script web app), rows are POSTed there instead.
export async function sendFeedbackRows(kind: 'feedback' | 'suggestions', rows: any[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_FEEDBACK_URL
  if (!url || !rows || rows.length === 0) return
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script doesn't answer CORS preflights
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ kind, rows }),
      keepalive: true,
    })
  } catch {
    // Feedback is best-effort
  }
}

// ---------------------------------------------------------------------------
// Framing
// ---------------------------------------------------------------------------
// PeerJS refuses JSON messages above ~16 KB, and game events that carry the
// room (reconnects, round history, game over) can exceed that. Large messages are
// split into chunk frames and reassembled; the channel is reliable and ordered.

// Characters per chunk. Worst case is 3 bytes/char (Devanagari packs) plus JSON
// escaping when PeerJS re-serialises the chunk, which stays well under the limit.
const CHUNK_CHARS = 3500
// Largest message a peer may send (a full custom pack is ~25 KB). Bounds the memory
// a malicious peer can make us hold while "assembling" a message that never ends.
const MAX_MESSAGE_CHARS = 256 * 1024
const MAX_CHUNKS = Math.ceil(MAX_MESSAGE_CHARS / CHUNK_CHARS)
const MAX_PARTIAL_MESSAGES = 4

interface ChunkFrame {
  k: string // message id
  i: number // chunk index
  n: number // chunk count
  d: string // slice of the JSON-encoded WireMessage
}

export type WireFrame = WireMessage | ChunkFrame

let nextMessageId = 0

export function encodeFrames(msg: WireMessage): WireFrame[] {
  const json = JSON.stringify(msg)
  if (json.length <= CHUNK_CHARS) return [msg]
  const k = `${Date.now().toString(36)}-${nextMessageId++}`
  const n = Math.ceil(json.length / CHUNK_CHARS)
  const frames: ChunkFrame[] = []
  for (let i = 0; i < n; i++) frames.push({ k, i, n, d: json.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS) })
  return frames
}

const isWireMessage = (m: any): m is WireMessage => !!m && typeof m.e === 'string' && Array.isArray(m.a)

export class FrameDecoder {
  private partial = new Map<string, string[]>()

  /** Returns a complete message, or null if more chunks are needed / the frame is junk. */
  push(raw: unknown): WireMessage | null {
    const frame = raw as any
    if (isWireMessage(frame)) return frame
    if (!frame || typeof frame.k !== 'string' || typeof frame.d !== 'string') return null
    if (!Number.isInteger(frame.i) || !Number.isInteger(frame.n) || frame.n < 1 || frame.n > MAX_CHUNKS || frame.d.length > CHUNK_CHARS || frame.i < 0 || frame.i >= frame.n) return null

    // Bound memory: a peer can't keep many half-sent messages open
    if (!this.partial.has(frame.k) && this.partial.size >= MAX_PARTIAL_MESSAGES) this.partial.clear()
    const parts = this.partial.get(frame.k) || []
    parts[frame.i] = frame.d
    this.partial.set(frame.k, parts)
    if (frame.i !== frame.n - 1) return null

    this.partial.delete(frame.k)
    for (let i = 0; i < frame.n; i++) if (typeof parts[i] !== 'string') return null
    try {
      const msg = JSON.parse(parts.join(''))
      return isWireMessage(msg) ? msg : null
    } catch {
      return null
    }
  }
}
