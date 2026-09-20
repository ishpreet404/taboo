# Architecture

One codebase, three ways to run it: the **website**, the **Android/iOS apps**, and an
optional **Node server** kept as a rollback. All game rules live in a single file that
only talks to a Socket.IO-*shaped* interface, so the same rules run on a server or
inside a player's device.

```
                 ┌─────────────────────────────────────┐
                 │  frontend/lib/game/gameCore.js      │
                 │  rooms, teams, words, turns,        │
                 │  scoring, kicks, reconnects         │
                 └──────────────┬──────────────────────┘
                                │ talks to an "io" object
             ┌──────────────────┴───────────────────┐
   P2P MODE (default)                     SERVER MODE (rollback)
   io = lib/p2p/hostIO.ts                 io = real Socket.IO (server.js)
   in the HOST'S browser/app
             │                                      │
   WebRTC data channels (PeerJS)               WebSockets
             │                                      │
     other players' devices                 all players' devices
```

Switch with `NEXT_PUBLIC_GAME_MODE=server` (default is P2P). See `SERVERLESS.md`.

## Layers

| Layer | Where | What it does |
| --- | --- | --- |
| Game core | `frontend/lib/game/gameCore.js` | Authoritative rules. Validates every event (sender, team, dealt words, points), rate-limits sockets, never throws on bad input |
| Catalog | `frontend/lib/game/packCatalog.js` | Word pack + game mode metadata shared by core and UI (no words) |
| Words | `frontend/lib/game/wordDatabase.json`, `themedWords.json` | Loaded only where the core runs (host device / server) |
| P2P host | `frontend/lib/p2p/hostIO.ts`, `host.ts` | Socket.IO-server stand-in over WebRTC; room snapshots for host recovery |
| P2P client | `frontend/lib/p2p/p2pSocket.ts`, `shared.ts` | Looks like a `socket.io-client` socket to the UI; chunked framing, reconnects |
| UI | `frontend/app`, `frontend/components` | Next.js + React + Tailwind. `GameContext.tsx` turns socket events into state |
| Native | `frontend/lib/native`, `frontend/android`, `frontend/ios` | Capacitor shell: share sheet, keep-awake, invite links, rating prompt |
| Node server | `server.js` | Express + Socket.IO + Google Sheets feedback, delegates to the core |

## What stays private

The room object is broadcast often, so `room.toJSON()` strips everything a client must
not see: upcoming words, word pools, custom pack contents, ban lists and players'
session ids (which prove seat ownership). Clients only ever receive the words in play.

## Deployment

```
git push main
   ├─ Vercel            -> website (static pages, no backend)
   └─ GitHub Actions    -> type-check, P2P smoke test, web build,
                           Android APK (published as the "latest-apk" release),
                           iOS compile check
```

Third parties: Vercel (static hosting) and the PeerJS broker/TURN (connection setup
only). No ads, analytics or payment SDKs. Rooms cost nothing to run: the host's device
provides the compute and bandwidth.
