// One place for everything brand-, store- and money-related.
// Values with a NEXT_PUBLIC_* override are baked in at build time.

const env = (value: string | undefined, fallback: string) => (value && value.trim() ? value.trim() : fallback)

// "Taboo" is a Hasbro trademark: the store builds (npm run build:mobile) must not
// ship it as the product name. The website keeps whatever NEXT_PUBLIC_APP_NAME says.
export const APP_NAME = env(process.env.NEXT_PUBLIC_APP_NAME, 'Taboo')
// The legal pages are the ones linked from the store listings, so they always carry
// the store name, whatever the website calls itself.
export const LEGAL_APP_NAME = env(process.env.NEXT_PUBLIC_LEGAL_APP_NAME, 'Inferno Words')
export const APP_TAGLINE = 'The forbidden-words party game'

// Shown on the privacy/terms pages and used for abuse reports. Set before publishing.
export const SUPPORT_EMAIL = env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, 'support@example.com')
export const PUBLISHER_NAME = env(process.env.NEXT_PUBLIC_PUBLISHER_NAME, 'Ishpreet')

// Public website. Native apps use it for invite links and legal pages.
export const WEB_URL = env(process.env.NEXT_PUBLIC_WEB_URL, 'https://taboo-inferno.vercel.app').replace(/\/$/, '')

// Pack names come from the game core as "Taboo - Standard"; show them brand-neutral.
export const displayPackName = (name: string | undefined | null) => (name || '').replace(/^Taboo\s*-\s*/i, '')

// ---------------------------------------------------------------------------
// Monetization
// ---------------------------------------------------------------------------
// WHICH packs are paid, and which product unlocks each, lives in
// lib/game/packCatalog.js (pack.product). Only the HOST needs to own a pack: it is
// picked by whoever creates/administers the room.

// The website has no way to sell anything, so by default paid packs stay free
// there. Flip to 'true' to show them as "unlock in the app" on the web instead.
export const LOCK_PREMIUM_ON_WEB = process.env.NEXT_PUBLIC_LOCK_PREMIUM_ON_WEB === 'true'

// RevenueCat (https://app.revenuecat.com). For EVERY product id below create a
// non-consumable product in both stores and an entitlement with the SAME identifier.
// Public SDK keys are safe to ship.
export const REVENUECAT = {
  androidKey: env(process.env.NEXT_PUBLIC_RC_ANDROID_KEY, ''),
  iosKey: env(process.env.NEXT_PUBLIC_RC_IOS_KEY, ''),
}

export const PRODUCTS = {
  removeAds: 'remove_ads',
  // The bundle: every pack (current and future), custom packs and premium themes
  allAccess: 'premium_packs',
}

// A rewarded ad unlocks one pack product for this long (never the bundle/custom packs)
export const REWARDED_UNLOCK_MS = 24 * 60 * 60 * 1000

// AdMob ad units. The fallbacks are Google's official TEST units, so a build with
// no configuration can never generate invalid traffic on a real account.
const TEST_UNITS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
}

export const ADMOB = {
  android: {
    banner: env(process.env.NEXT_PUBLIC_ADMOB_ANDROID_BANNER, TEST_UNITS.android.banner),
    interstitial: env(process.env.NEXT_PUBLIC_ADMOB_ANDROID_INTERSTITIAL, TEST_UNITS.android.interstitial),
    rewarded: env(process.env.NEXT_PUBLIC_ADMOB_ANDROID_REWARDED, TEST_UNITS.android.rewarded),
  },
  ios: {
    banner: env(process.env.NEXT_PUBLIC_ADMOB_IOS_BANNER, TEST_UNITS.ios.banner),
    interstitial: env(process.env.NEXT_PUBLIC_ADMOB_IOS_INTERSTITIAL, TEST_UNITS.ios.interstitial),
    rewarded: env(process.env.NEXT_PUBLIC_ADMOB_IOS_REWARDED, TEST_UNITS.ios.rewarded),
  },
  // True until real unit ids are configured; also forces test ads in the SDK
  usingTestUnits: !process.env.NEXT_PUBLIC_ADMOB_ANDROID_BANNER && !process.env.NEXT_PUBLIC_ADMOB_IOS_BANNER,
  // Never more than one interstitial in this window, and never during a turn
  interstitialCooldownMs: 3 * 60 * 1000,
}
