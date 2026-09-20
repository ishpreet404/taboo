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

## Google Play compliance

Verified against the published release APK (`aapt2 dump`), 2026-09:

| Policy area | Status | Notes |
| --- | --- | --- |
| Target API level | OK | targetSdk 36 / compileSdk 36 (Play requires recent API levels; re-check each August) |
| 16 KB page size | OK | No native `.so` libraries in the app |
| Permissions | OK | INTERNET, WAKE_LOCK, VIBRATE only. No sensitive or runtime permissions |
| Debuggable / cleartext / backup | OK | Release is non-debuggable, HTTPS only, `allowBackup=false`, FileProvider limited to the cache dir |
| Ads | OK | None. Declare "No ads" |
| Payments | OK | Nothing is sold. The UPI donate dialog exists on the website only and is never shown in the app |
| Data safety | OK | No analytics/ads SDKs, no accounts. See the form answers below |
| Privacy policy | **Action** | `/privacy` is live, but the contact address is a placeholder until you set `NEXT_PUBLIC_SUPPORT_EMAIL` |
| User-generated content | OK | Nicknames + custom packs: terms with zero tolerance, in-app **Report a player or content**, host kick + ban, leave any time |
| Intellectual property | OK in-app | Store build shows "Inferno Words" and says "Foul" for rule breaks; no trademarked word in UI. **Do not use "Taboo" in the listing title, description, screenshots or keywords.** The default site URL still contains it: set `NEXT_PUBLIC_WEB_URL` to a neutral domain before launch |
| In-app review | OK | Uses the current `com.google.android.play:review` library |
| App icon / listing assets | **Action** | Still the default Capacitor icon. Provide your own 512px icon, feature graphic and screenshots |
| Signing | **Action** | Add the keystore secrets (above) so the AAB is signed with your upload key |
| Minimum functionality | OK | Bundled offline shell, native share, results card, keep-awake, host recovery: not a bare website wrapper |

### Play Console forms (answer truthfully)

- **Data safety**: "Does your app collect or share any required user data types?" -> **No**
  for collection by you. Nicknames and gameplay go device-to-device and are not stored;
  mention peer-to-peer play in the policy (done). If you later enable word feedback
  (`NEXT_PUBLIC_FEEDBACK_URL`) declare "Other user-generated content", collected,
  optional, for app functionality.
- **Ads**: No. **In-app purchases**: No. **App access**: all functionality available
  without login.
- **Content rating (IARC)**: users can interact and share text -> expect Teen / 12+.
- **Target audience**: 13+. Do **not** include under-13s (that triggers the Families
  policy).
- **News / Government / Financial / Health**: No.
- New personal developer accounts: closed test with **12 testers for 14 days** before
  production, and developer identity verification.

## App Store notes

Same build, same answers: no tracking (no ATT prompt needed), no purchases, UGC covered by
terms + report + kick (guideline 1.2), `ITSAppUsesNonExemptEncryption=false`. Requires an
Apple Developer account and a Mac (or a signing setup in CI).

## Scaling

No per-room cost: each room's CPU, memory and bandwidth belong to its host. The one
shared dependency is WebRTC signaling/TURN (PeerJS's free public broker by default).
For a serious launch run your own [PeerServer](https://github.com/peers/peerjs-server)
and a TURN service, and point `NEXT_PUBLIC_PEER_OPTIONS` at them. No code changes.
