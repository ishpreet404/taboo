# Android & iOS apps ("Inferno Words")

The apps are the same Next.js frontend, statically exported and wrapped with
[Capacitor 8](https://capacitorjs.com). They always run in serverless P2P mode
(see `SERVERLESS.md`), so there is still nothing to host.

```
frontend/
  capacitor.config.ts     app id / name
  scripts/build-mobile.mjs  static export + cap sync (forces P2P + store name)
  android/                native Android project (targetSdk 36)
  ios/                    native iOS project (iOS 15+, Swift Package Manager)
  lib/appConfig.ts        name, premium packs, product ids, ad units
  lib/native/             ads.ts, purchases.ts, device.ts
```

## Build

```bash
cd frontend
npm run build:mobile
```

Then open the native project: `npx cap open android` (Android Studio, **JDK 21**)
or, on a Mac, `npx cap open ios` (Xcode 16+). iOS cannot be built on Windows;
the GitHub Actions workflow (`.github/workflows/ci.yml`) compiles both platforms
on every push and uploads a debug APK you can sideload.

## What makes money

| Feature | Where | Notes |
| --- | --- | --- |
| Banner ad | Home + lobby only | Never during a game |
| Interstitial | When a game ends | Max one per 3 min |
| **Rewarded ad** | Tap any locked pack | Opt-in: unlocks that pack for 24 h. The free way in, and the best-paying ad format |
| **Individual packs** (one-time IAP) | Store, lock icons on packs | One product per collection: `pack_bollywood`, `pack_cricket`, `pack_movies`, `pack_music`, `pack_sports`, `pack_science`, `pack_travel`, `pack_office`, `pack_festive`, `pack_hindi` (all Hindi variants), `pack_hardcore` (Difficult/Intense/Insane) |
| **All Access** bundle (`premium_packs`) | Store | Every pack incl. future ones + custom packs + premium themes |
| **Custom Packs** (`custom_packs`) | Lobby > word pack > Custom Pack | Host writes their own words (20-600) |
| **Remove Ads** (`remove_ads`) | Store | Turns banner + interstitial off |
| Premium themes | Home screen swatches | Ocean, Forest, Sunset, Candy come with All Access |

Only the **host** needs to own a pack, which is a natural selling point for whoever
organises game night. Free forever: Standard/Easy/Medium/Hard, Food & Drink, Kids & Family,
three themes, all game modes.

Where things are defined:

- Packs, which product unlocks each, game modes: `frontend/lib/game/packCatalog.js`
- Themed word lists: `frontend/lib/game/themedWords.json` (add `<theme>_easy|medium|hard` groups + a catalog entry = new pack, nothing else to touch)
- Product ids, ad units, cooldowns, 24 h unlock length: `frontend/lib/appConfig.ts`

Purchases go through RevenueCat (free until $2.5k/month revenue, no server of yours).
**Convention: every product id has a RevenueCat entitlement with the same identifier.**
With no keys configured the Store says "unavailable", **nothing is locked**, and ads are
Google TEST ads, so an unconfigured build can never cost users money or generate
invalid traffic. On the website nothing is locked unless you set
`NEXT_PUBLIC_LOCK_PREMIUM_ON_WEB=true` (then locked items say "available in the apps").

Growth loops built in: invite links + native share sheet, a shareable **results card**
(image with scores, MVP and your URL) on the game-over screen, and the native
**store-rating prompt** after a win (2+ games played, at most every 60 days).

## Before you can publish: things only you can do

1. **Accounts**: Google Play Console ($25 once), Apple Developer ($99/yr), AdMob, RevenueCat.
2. **AdMob**: create an Android app + iOS app, a banner and an interstitial unit for each.
   - Put the *app ids* in `android/app/src/main/res/values/strings.xml` (`admob_app_id`) and `ios/App/App/Info.plist` (`GADApplicationIdentifier`).
   - Create a **rewarded** unit per platform too. Put the *unit ids* in the `NEXT_PUBLIC_ADMOB_*` env vars (see `.env.example`) when running `build:mobile`.
   - In AdMob > Privacy & messaging, create the **GDPR** and **US states** messages (the app already shows Google's consent form when required) and, for iOS, the **IDFA explainer**.
   - Paste Google's full `SKAdNetworkItems` list into `Info.plist`.
3. **RevenueCat**: create every product id from the table above (non-consumable / one-time) in both stores, attach each to an entitlement with the *same identifier*, set `NEXT_PUBLIC_RC_ANDROID_KEY` / `NEXT_PUBLIC_RC_IOS_KEY`.
4. **Identity**: set `NEXT_PUBLIC_SUPPORT_EMAIL` on the website deployment (it appears on `/privacy` and `/terms`; a placeholder is shown until you do). If you want a different bundle id than `com.infernowords.app`, change `capacitor.config.ts`, `android/app/build.gradle` (`applicationId`, `namespace`) and the Xcode target **before the first upload** - it is permanent afterwards.
5. **Icons & splash**: put a 1024x1024 `assets/icon.png` (no transparency for iOS) and run `npx @capacitor/assets generate`.
6. **Signing**: create an upload keystore in Android Studio (Build > Generate Signed Bundle) and use Play App Signing; on iOS use Xcode automatic signing. Never commit keystores or passwords.
7. **Invite links (optional)**: to make `https://<site>/?room=CODE` open the app, host `/.well-known/assetlinks.json` (Android, needs your signing SHA-256) and `/.well-known/apple-app-site-association` (iOS, plus the Associated Domains capability). Until then links simply open the website, which works too.

## Store policy checklist

Built in:

- [x] No trademarked name in the app: store builds are "Inferno Words", packs are brand-neutral. **Do not use the word "Taboo" in the store title, icon, screenshots or keywords.** Describe it as "a forbidden-words party game".
- [x] Privacy Policy (`/privacy`) and Terms (`/terms`), linked in-app (home footer + Store). Use `https://<site>/privacy` as the policy URL in both consoles.
- [x] Digital goods sold only via Play Billing / StoreKit (RevenueCat); **Restore purchases** button (App Store 3.1.1).
- [x] Ad consent: Google UMP form before any ad request; "Ad privacy choices" entry point; iOS ATT prompt with a usage string; ads not child-directed, content rating capped at Teen.
- [x] Ads never interrupt gameplay, no ads on exit, interstitial cooldown (Play "disruptive ads" policy). Rewarded ads are strictly opt-in and clearly state the reward.
- [x] Custom packs are user-generated content: covered by the zero-tolerance terms, visible only inside the private room, host-controlled.
- [x] User-generated content (nicknames, suggestions): zero-tolerance terms, hosts can kick + ban, abuse-report contact (App Store 1.2).
- [x] No accounts, so no account-deletion flow is required. `android:allowBackup="false"`.
- [x] Android targetSdk 36; only INTERNET, WAKE_LOCK and AD_ID permissions. iOS: no camera/mic/location usage, `ITSAppUsesNonExemptEncryption=false` (standard TLS/DTLS only).
- [x] Real native value beyond a web view (App Store 4.2): native share sheet, haptics-ready, keep-awake, IAP, offline-capable shell, host recovery.

You must fill in the consoles truthfully:

- [ ] **Play Data safety / App Store privacy labels**: Device or other IDs + approximate location (from IP) + app interactions + diagnostics, collected by AdMob for advertising/analytics; purchase history (RevenueCat). "Data is not sold". Nickname is processed ephemerally and not collected by you.
- [ ] **Advertising ID declaration** (Play): yes, for advertising.
- [ ] **Content rating questionnaires**: users can interact (shared nicknames/text). Expect Teen / 12+. Target audience 13+; do **not** opt into Designed for Families / Kids category.
- [ ] Play requires a **closed test with 12 testers for 14 days** for new personal developer accounts before production access.
- [ ] Have the privacy policy and terms reviewed; they are a good-faith template, not legal advice.

## Scaling

There is no per-room cost: each room's CPU, memory and bandwidth belong to its
host, so 10 rooms and 10,000 rooms cost you the same (static hosting). The one
shared dependency is WebRTC **signaling/TURN** - by default PeerJS's free public
broker. For a serious launch, run your own
[PeerServer](https://github.com/peers/peerjs-server) (tiny; fits free tiers such
as Fly.io/Railway/Oracle, it only brokers connection setup) plus a TURN service
(Cloudflare Calls has a free tier) and point `NEXT_PUBLIC_PEER_OPTIONS` at them.
No game code changes.
