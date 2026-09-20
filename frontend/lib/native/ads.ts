// AdMob for the native apps. No-ops on the web.
//
// Policy notes baked into this file:
//  - Consent first: Google's UMP form (GDPR/UK/CH + US states) runs before any ad
//    request, and ads are only requested when UMP says canRequestAds.
//  - iOS App Tracking Transparency prompt is shown before initialising the SDK.
//  - Not child-directed, ad content capped at "Teen".
//  - Banners only on menu/lobby screens; interstitials only between games, with
//    a cooldown. Nothing ever covers or interrupts an active turn.

import { Capacitor } from '@capacitor/core'
import { ADMOB } from '../appConfig'

type AdMobModule = typeof import('@capacitor-community/admob')

let admob: AdMobModule | null = null
let ready: Promise<boolean> | null = null
let adsDisabled = false
let bannerVisible = false
let bannerWanted = false
let interstitialLoaded = false
let lastInterstitialAt = 0

const units = () => (Capacitor.getPlatform() === 'ios' ? ADMOB.ios : ADMOB.android)

async function init(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    admob = await import('@capacitor-community/admob')
    const { AdMob, MaxAdContentRating } = admob

    // 1. Consent (UMP). If the form is required, show it.
    let canRequestAds = true
    try {
      let consent = await AdMob.requestConsentInfo()
      if (consent.isConsentFormAvailable && consent.status === admob.AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm()
      }
      canRequestAds = consent.canRequestAds
    } catch {
      // No UMP message configured yet / offline: fall through, the SDK serves
      // non-personalised or no ads as appropriate.
    }
    if (!canRequestAds) return false

    // 2. iOS ATT prompt (no-op on Android)
    try {
      const { status } = await AdMob.trackingAuthorizationStatus()
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization()
    } catch {
      // older iOS / Android
    }

    // 3. SDK
    await AdMob.initialize({
      initializeForTesting: ADMOB.usingTestUnits,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: MaxAdContentRating.Teen,
    })
    return true
  } catch (e) {
    console.warn('[ads] init failed', e)
    return false
  }
}

const ensureReady = () => (ready ??= init())

async function preloadInterstitial() {
  if (!admob || interstitialLoaded || adsDisabled) return
  try {
    await admob.AdMob.prepareInterstitial({ adId: units().interstitial, isTesting: ADMOB.usingTestUnits })
    interstitialLoaded = true
  } catch {
    // no fill; try again next time
  }
}

/** Called when the remove-ads entitlement changes. */
export async function setAdsDisabled(disabled: boolean) {
  adsDisabled = disabled
  if (disabled) await hideBanner()
  else if (bannerWanted) await showBanner()
}

export async function showBanner() {
  bannerWanted = true
  if (adsDisabled || !(await ensureReady()) || !admob) return
  // State may have changed while we awaited consent/init
  if (!bannerWanted || adsDisabled || bannerVisible) return
  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = admob
    await AdMob.showBanner({
      adId: units().banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: ADMOB.usingTestUnits,
    })
    bannerVisible = true
    void preloadInterstitial()
  } catch {
    // no fill
  }
}

export async function hideBanner() {
  bannerWanted = false
  if (!admob || !bannerVisible) return
  bannerVisible = false
  try {
    await admob.AdMob.removeBanner()
  } catch {
    // already gone
  }
}

/** Between games only. Resolves once the ad is dismissed (or immediately if none is shown). */
export async function maybeShowInterstitial() {
  if (adsDisabled || !(await ensureReady()) || !admob) return
  const now = Date.now()
  if (now - lastInterstitialAt < ADMOB.interstitialCooldownMs) return
  if (!interstitialLoaded) {
    void preloadInterstitial()
    return
  }
  try {
    interstitialLoaded = false
    lastInterstitialAt = now
    await admob.AdMob.showInterstitial()
  } catch {
    // ignore
  } finally {
    void preloadInterstitial()
  }
}

/** Lets users revisit their ad-privacy choices (required where UMP says so). */
export async function openAdPrivacyOptions(): Promise<boolean> {
  if (!(await ensureReady()) || !admob) return false
  try {
    await admob.AdMob.showPrivacyOptionsForm()
    return true
  } catch {
    return false
  }
}

/**
 * Opt-in rewarded ad. Resolves true only if the user earned the reward.
 * Available even with "Remove Ads": it is the user's choice, not an interruption.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!(await ensureReady()) || !admob) return false
  try {
    await admob.AdMob.prepareRewardVideoAd({ adId: units().rewarded, isTesting: ADMOB.usingTestUnits })
    const reward = await admob.AdMob.showRewardVideoAd()
    return !!reward
  } catch {
    return false
  }
}
