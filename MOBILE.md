# Android & iOS apps ("Inferno Words")

The apps are the same Next.js frontend, statically exported and wrapped with
[Capacitor 8](https://capacitorjs.com). They always run in serverless P2P mode
(see `SERVERLESS.md`), so there is nothing to host. **No ads, no purchases, no
tracking SDKs**: everything in the game is free.

```
frontend/
  capacitor.config.ts       app id / name, zoom disabled
  scripts/build-mobile.mjs  static export + cap sync (forces P2P + store name)
  android/                  native Android project (targetSdk 36)
  ios/                      native iOS project (iOS 15+, Swift Package Manager)
  lib/native/               device.ts (share, keep-awake, invite links),
                            resultsCard.ts, review.ts
```

## Build

```bash
cd frontend
npm run build:mobile
```

Then `npx cap open android` (Android Studio, **JDK 21**) or, on a Mac,
`npx cap open ios` (Xcode 16+).

Every push to `main` builds the **production (release) APK and AAB** in GitHub Actions
and publishes them to the repo's Releases (no login needed):
`https://github.com/<owner>/<repo>/releases/download/latest-apk/inferno-words.apk`

**Signing.** Until you add a keystore, release builds are signed with a throwaway debug
key: installable by anyone, but not accepted by Google Play, and each new build must be
installed after uninstalling the previous one (the key changes per build). To sign
properly, create an upload keystore once (Android Studio > Build > Generate Signed
Bundle, or `keytool`), then add these repository secrets
(GitHub > Settings > Secrets and variables > Actions):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 your-upload-key.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |

From then on the published APK updates in place and the `.aab` can be uploaded to Play.
Keep the keystore file and passwords backed up and out of the repo.

## Donations and the stores

The website has a "Donate" button (UPI). **The apps deliberately do not show it**:
Apple requires tips to the developer to go through In-App Purchase, and Google Play
restricts external payment prompts too, so an in-app UPI link risks rejection. If you
later want in-app support, do it with a consumable "Tip" IAP.

## Before you can publish

1. **Accounts**: Google Play Console ($25 once), Apple Developer ($99/yr).
2. **Identity**: set `NEXT_PUBLIC_SUPPORT_EMAIL` on the website (shown on `/privacy`
   and `/terms`). To change the bundle id `com.infernowords.app`, edit
   `capacitor.config.ts`, `android/app/build.gradle` and the Xcode target **before the
   first upload** - it is permanent afterwards.
3. **Icons & splash**: add a 1024x1024 `assets/icon.png` and run `npx @capacitor/assets generate`.
4. **Signing**: create an upload keystore in Android Studio and use Play App Signing;
   Xcode automatic signing on iOS. Never commit keystores or passwords.
5. **Invite links (optional)**: host `/.well-known/assetlinks.json` (Android) and
   `/.well-known/apple-app-site-association` (iOS) so `https://<site>/?room=CODE` opens
   the app. Until then the links open the website, which works too.

## Store policy checklist

- [x] No trademarked name: store builds are "Inferno Words". **Do not use the word
      "Taboo" in the store title, icon, screenshots or keywords.**
- [x] Privacy Policy (`/privacy`) and Terms (`/terms`), linked from the home screen.
- [x] No ads, no analytics, no advertising id, no purchases: the simplest possible
      Data safety / privacy label ("no data collected" apart from what peer-to-peer
      play inherently shares between players, described in the policy).
- [x] User-generated content (nicknames, custom packs): zero-tolerance terms, hosts can
      kick + ban, abuse-report contact (App Store 1.2).
- [x] Permissions: INTERNET and WAKE_LOCK only. `allowBackup=false`.
      `ITSAppUsesNonExemptEncryption=false` (standard TLS/DTLS only).
- [x] Native value beyond a web view (App Store 4.2): share sheet, results card,
      keep-awake, rating prompt, offline shell, host recovery.
- [ ] Content rating questionnaires: users can interact. Expect Teen / 12+; do not opt
      into the Kids/Families programmes.
- [ ] New personal Play accounts need a closed test with 12 testers for 14 days.
- [ ] Have the privacy policy and terms reviewed; they are a good-faith template.

## Scaling

No per-room cost: each room's CPU, memory and bandwidth belong to its host. The one
shared dependency is WebRTC signaling/TURN (PeerJS's free public broker by default).
For a serious launch run your own [PeerServer](https://github.com/peers/peerjs-server)
and a TURN service, and point `NEXT_PUBLIC_PEER_OPTIONS` at them. No code changes.
