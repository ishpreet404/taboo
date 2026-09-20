// Host identity for P2P rooms.
//
// A room code is just a public PeerJS id: while the real host is away (reload, crash)
// anyone could register it and pose as the host to players who are reconnecting. To
// stop that, every host has an ECDSA key pair. Joiners send a random nonce, the host
// signs it, and joiners pin the host's public key the first time they join a room
// (trust on first use). Afterwards only someone holding the private key - which
// never leaves the host's device - is accepted as host for that room.
//
// WebCrypto needs a secure context (https, localhost, the native apps). Where it is
// missing (plain-http LAN dev) rooms work without pinning.

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const
const SIGNATURE = { name: 'ECDSA', hash: 'SHA-256' } as const
const PIN_KEY = 'taboo_p2p_host_pin'

export interface HostIdentity {
  publicJwk: JsonWebKey
  privateJwk: JsonWebKey
}

export interface HostProof {
  pub: JsonWebKey
  sig: string
}

const subtle = () => (typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null)

const toBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

export function randomNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createHostIdentity(): Promise<HostIdentity | null> {
  const api = subtle()
  if (!api) return null
  try {
    const pair = await api.generateKey(ALGORITHM, true, ['sign', 'verify'])
    return {
      publicJwk: await api.exportKey('jwk', pair.publicKey),
      privateJwk: await api.exportKey('jwk', pair.privateKey),
    }
  } catch {
    return null
  }
}

export async function proveIdentity(identity: HostIdentity | null, nonce: unknown): Promise<HostProof | null> {
  const api = subtle()
  if (!api || !identity || typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 64) return null
  try {
    const key = await api.importKey('jwk', identity.privateJwk, ALGORITHM, false, ['sign'])
    const sig = await api.sign(SIGNATURE, key, new TextEncoder().encode(nonce))
    return { pub: identity.publicJwk, sig: toBase64(sig) }
  } catch {
    return null
  }
}

async function proofIsValid(proof: HostProof, nonce: string): Promise<boolean> {
  const api = subtle()
  if (!api) return false
  try {
    const key = await api.importKey('jwk', proof.pub, ALGORITHM, false, ['verify'])
    return await api.verify(SIGNATURE, key, fromBase64(proof.sig), new TextEncoder().encode(nonce))
  } catch {
    return false
  }
}

const sameKey = (a: JsonWebKey, b: JsonWebKey) => a.kty === b.kty && a.crv === b.crv && a.x === b.x && a.y === b.y

function readPin(): { roomCode: string; pub: JsonWebKey } | null {
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY) || 'null')
  } catch {
    return null
  }
}

/**
 * Decides whether whoever answered for `roomCode` is acceptable as its host.
 * First contact pins the key; later contacts must present the same key and a valid
 * signature over our fresh nonce.
 */
export async function acceptHost(roomCode: string, nonce: string, proof: unknown): Promise<boolean> {
  const candidate = proof as HostProof | null
  const hasProof = !!candidate && typeof candidate === 'object' && !!candidate.pub && typeof candidate.sig === 'string'
  const pin = readPin()
  const pinned = pin && pin.roomCode === roomCode ? pin.pub : null

  if (!hasProof) return !pinned // unsigned hosts are fine only if we never pinned one
  if (!(await proofIsValid(candidate!, nonce))) return false
  if (pinned) return sameKey(pinned, candidate!.pub)

  try {
    localStorage.setItem(PIN_KEY, JSON.stringify({ roomCode, pub: candidate!.pub }))
  } catch {
    // storage unavailable: still protected for this connection
  }
  return true
}

/** Forget the pinned host (explicit leave, or the room is gone for good). */
export function forgetHost(roomCode?: string) {
  try {
    const pin = readPin()
    if (!roomCode || pin?.roomCode === roomCode) localStorage.removeItem(PIN_KEY)
  } catch {
    // ignore
  }
}
