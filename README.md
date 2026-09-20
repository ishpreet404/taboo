# Taboo - Multiplayer Word Guessing Game

A free, real-time party game for the browser and for Android/iOS. Describe the word
without saying it; your team types guesses against the clock.

**Serverless by design:** whoever creates a room hosts the game on their own device and
everyone else connects to it directly over WebRTC. There is no backend to run or pay
for. No ads, no purchases, no tracking - the project is supported by voluntary
donations (button on the website).

- Play: https://taboo-inferno.vercel.app
- Android test build: see the **Releases** section of this repo (`latest-apk`)

## Features

- Rooms with 6-character codes and invite links (`/?room=CODE`), 2 or 3 teams, captain
  draft or random teams, co-admins, kick/ban
- 22 word packs: classic difficulty tiers, Hindi, and 11 themed packs (Bollywood,
  Cricket, Movies & TV, Music, Sports, Science & Tech, Travel, Office, Festive, Food,
  Kids & Family) - plus **custom packs** the host writes themselves
- 5 game modes: Classic, Blitz, Marathon, Showdown, Sprint Finish
- Optional taboo reporting/voting, bonus words for hot streaks, per-player stats
- Drop-proof: players reconnect automatically; even the **host can reload** and the
  room resumes
- 7 colour themes, shareable results card, installable mobile apps

## Run it locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001. That is all - no backend needed. To try multiplayer on one
machine, use `http://localhost:3001` in one tab and `http://127.0.0.1:3001` in another
(different origins behave like different devices).

```bash
npm run test:p2p      # game core + P2P shim + security regression tests
npm run build         # production web build
npm run build:mobile  # static export + sync into the Android/iOS projects
```

## Deploy

Push to `main`. Vercel (root directory `frontend`) serves the site; nothing else is
required. Configuration is optional, see `.env.example`.

## Documentation

| File | Contents |
| --- | --- |
| `ARCHITECTURE.md` | How the pieces fit together |
| `SERVERLESS.md` | P2P mode, trade-offs, TURN/PeerServer options, rollback to server mode |
| `MOBILE.md` | Building and publishing the Android/iOS apps, store policy checklist |
| `ADMIN_FEATURES.md` | Host and co-admin controls |
| `WORD_FEEDBACK_SETUP.md` | Google Sheets word feedback (server mode only) |

## Adding words

- Classic/Hindi words: `frontend/lib/game/wordDatabase.json`
- Themed packs: add `<theme>_easy|medium|hard` lists to
  `frontend/lib/game/themedWords.json` and one entry to
  `frontend/lib/game/packCatalog.js`. Nothing else to touch.

## Optional: classic server mode

The old Socket.IO backend still works and runs the exact same game core:

```bash
npm install
npm start          # server.js on :3000
```

Set `NEXT_PUBLIC_GAME_MODE=server` and `NEXT_PUBLIC_SERVER_URL` on the frontend, and
`ALLOWED_ORIGINS` (comma-separated) on the server if you use your own domain.

## License

MIT
