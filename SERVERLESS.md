# Serverless (P2P) mode

In P2P mode there is **no backend to deploy**. Whoever creates a room hosts the
game inside their own browser tab, and the other players connect to that tab
directly over WebRTC. The site itself is just static files.

```
             (signaling only: "how do I reach room ABC123?")
                    ┌──────────────────────┐
                    │  PeerJS broker (free) │
                    └──────────┬───────────┘
                               │
┌───────────┐   WebRTC   ┌─────┴──────────────────────┐   WebRTC   ┌───────────┐
│ Player 2  │◀──────────▶│ Host's browser tab          │◀──────────▶│ Player 3  │
└───────────┘            │  gameCore.js (all rules)    │            └───────────┘
                         │  + the host's own player    │
                         └─────────────────────────────┘
```

## How it works

| Piece | File | Role |
| --- | --- | --- |
| Game rules | `frontend/lib/game/gameCore.js` | The old `server.js` logic, unchanged, but only talking to a Socket.IO-*shaped* `io` object |
| Host shim | `frontend/lib/p2p/hostIO.ts` | Implements the slice of the Socket.IO server API the core uses (`io.to().emit`, `socket.join`, ...) |
| Host transport | `frontend/lib/p2p/host.ts` | Claims the room code as a PeerJS id, feeds WebRTC messages into the shim |
| Framing | `frontend/lib/p2p/shared.ts` | Splits messages above PeerJS's ~16 KB limit into chunks and reassembles them |
| Client socket | `frontend/lib/p2p/p2pSocket.ts` | Looks like a `socket.io-client` socket to `GameContext` (`on`/`off`/`emit`) |
| Mode switch | `frontend/lib/gameMode.ts` | Picks `p2p` or `server` |

Because both modes run the same `gameCore.js`, `node server.js` (Render, a VPS,
a Raspberry Pi, your laptop) still works exactly as before.

## Choosing a mode

| `NEXT_PUBLIC_GAME_MODE` | Result |
| --- | --- |
| unset or `p2p` | Serverless (default) |
| `server` | Classic Socket.IO server at `NEXT_PUBLIC_SERVER_URL` |

Deploying this code is enough to go serverless; afterwards you can suspend the
Render service. **Rollback:** set `NEXT_PUBLIC_GAME_MODE=server` on the frontend
host and redeploy.

## Trade-offs to know about

- **The host's device is the server.** If the host *leaves* the room or closes the
  tab for good, the room ends for everyone ("host closed the room"). A host
  **reload or crash is survivable**: the room is mirrored to the host's
  localStorage, the reopened tab re-claims the room code and restores the game,
  and players (who keep retrying for ~30 s+) are reseated automatically. The
  screen is kept awake while in a room; on phones, avoid leaving the app for long.
- **Other players can drop and come back.** Reloads and network blips reconnect
  automatically within the normal 30 s grace period.
- **Words live on the host's device.** Only the host downloads the word
  database, but a host who opens dev tools could peek. Fine for friends.
- **Kick bans are per browser** (session id) instead of per IP.
- **Strict networks.** WebRTC needs STUN/TURN to cross NATs. PeerJS ships free
  defaults, which cover most home/mobile networks. If some players can't
  connect, add your own TURN server (Cloudflare Calls and metered.ca have free
  tiers):

  ```bash
  NEXT_PUBLIC_PEER_OPTIONS={"config":{"iceServers":[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:YOUR_TURN","username":"...","credential":"..."}]}}
  ```

  The same variable accepts `host` / `port` / `path` / `secure` if you ever want
  to run your own [PeerServer](https://github.com/peers/peerjs-server) instead
  of the public broker.
- **Word feedback / suggestions.** The Google service-account key can't be put
  in a browser. Set `NEXT_PUBLIC_FEEDBACK_URL` to a Google Apps Script web app
  (or any endpoint) and hosts will POST `{ kind, rows }` JSON there when a room
  closes. Unset = feedback is discarded in P2P mode.

## Testing locally

```bash
cd frontend
npm run dev
```

No backend needed. To simulate two devices in one browser, open
`http://localhost:3001` in one tab and `http://127.0.0.1:3001` in another (the
different origins give each tab its own saved session).

Shim + game core smoke test (no network):

```bash
node frontend/lib/p2p/hostIO.smoke.mjs
```
