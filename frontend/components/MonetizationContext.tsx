'use client'

import { LOCK_PREMIUM_ON_WEB, PRODUCTS } from '@/lib/appConfig'
import { CUSTOM_PACK_PRODUCT, getPack, isCustomPackKey, PACKS } from '@/lib/game/packCatalog'
import { hideBanner, maybeShowInterstitial, setAdsDisabled, showBanner, showRewardedAd } from '@/lib/native/ads'
import { isNative } from '@/lib/native/device'
import {
  activeTempUnlocks,
  cachedOwned,
  grantTempUnlock,
  loadProducts,
  purchase,
  purchasesAvailable,
  PurchaseOutcome,
  refreshOwned,
  restore,
  StoreProduct,
} from '@/lib/native/purchases'
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from '@/lib/themes'
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Every product the store can sell: the two fixed ones, custom packs, and one per
// distinct pack product in the catalog
export const PACK_PRODUCT_IDS: string[] = Array.from(new Set(PACKS.map((p) => p.product).filter((id): id is string => !!id)))
const ALL_PRODUCT_IDS = [PRODUCTS.allAccess, PRODUCTS.removeAds, CUSTOM_PACK_PRODUCT, ...PACK_PRODUCT_IDS]

interface MonetizationValue {
  native: boolean
  storeAvailable: boolean
  products: StoreProduct[]
  adsRemoved: boolean
  /** Permanently owned (purchase or All Access) */
  ownsProduct: (productId: string) => boolean
  /** Owned, or unlocked for now by a rewarded ad */
  hasAccess: (productId: string | null) => boolean
  tempUnlockExpiry: (productId: string) => number | null
  isPackLocked: (packKey: string) => boolean
  customPacksLocked: boolean
  buy: (productId: string) => Promise<PurchaseOutcome>
  restorePurchases: () => Promise<PurchaseOutcome>
  /** Rewarded ad -> 24 h access to one pack product. Resolves true if granted. */
  unlockWithAd: (productId: string) => Promise<boolean>
  storeOpen: boolean
  /** Product the user was trying to use when the store opened, if any */
  storeFocus: string | null
  openStore: (focusProductId?: string | null) => void
  closeStore: () => void
  // Ads: screens say what they want, the context applies entitlements
  setBannerWanted: (wanted: boolean) => void
  bannerActive: boolean
  showInterstitial: () => Promise<void>
  // Themes
  theme: string
  setTheme: (key: string) => void
  isThemeLocked: (key: string) => boolean
}

const MonetizationContext = createContext<MonetizationValue | undefined>(undefined)

export function MonetizationProvider({ children }: { children: ReactNode }) {
  // Resolved after mount so the static HTML is identical on web and native
  const [native, setNative] = useState(false)
  const [storeAvailable, setStoreAvailable] = useState(false)
  const [owned, setOwned] = useState<string[]>([])
  const [tempUnlocks, setTempUnlocks] = useState<Record<string, number>>({})
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [storeOpen, setStoreOpen] = useState(false)
  const [storeFocus, setStoreFocus] = useState<string | null>(null)
  const [bannerWanted, setBannerWanted] = useState(false)
  const [theme, setThemeState] = useState(DEFAULT_THEME)

  useEffect(() => {
    const onNative = isNative()
    setNative(onNative)
    setStoreAvailable(purchasesAvailable())
    setTempUnlocks(activeTempUnlocks())
    try {
      setThemeState(localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME)
    } catch {
      // storage unavailable
    }
    if (!onNative) return
    // Cached first (instant, works offline), then the store's truth
    setOwned(cachedOwned())
    refreshOwned().then(setOwned)
    loadProducts(ALL_PRODUCT_IDS).then(setProducts)
  }, [])

  // Where can things be locked at all? Only where the player can do something about it.
  const lockingActive = native ? storeAvailable : LOCK_PREMIUM_ON_WEB

  const ownsProduct = useCallback(
    (productId: string) => owned.includes(productId) || (productId !== PRODUCTS.removeAds && owned.includes(PRODUCTS.allAccess)),
    [owned],
  )
  const tempUnlockExpiry = useCallback(
    (productId: string) => (tempUnlocks[productId] > Date.now() ? tempUnlocks[productId] : null),
    [tempUnlocks],
  )
  const hasAccess = useCallback(
    (productId: string | null) => !productId || !lockingActive || ownsProduct(productId) || tempUnlockExpiry(productId) !== null,
    [lockingActive, ownsProduct, tempUnlockExpiry],
  )

  const adsRemoved = owned.includes(PRODUCTS.removeAds)
  const bannerActive = native && bannerWanted && !adsRemoved

  useEffect(() => {
    if (native) void setAdsDisabled(adsRemoved)
  }, [native, adsRemoved])

  useEffect(() => {
    if (native) void (bannerActive ? showBanner() : hideBanner())
  }, [native, bannerActive])

  const isThemeLocked = useCallback(
    (key: string) => !!THEMES.find((t) => t.key === key)?.premium && !hasAccess(PRODUCTS.allAccess),
    [hasAccess],
  )

  // Apply the theme (falling back if a premium theme is no longer available)
  useEffect(() => {
    const effective = THEMES.some((t) => t.key === theme) && !isThemeLocked(theme) ? theme : DEFAULT_THEME
    document.documentElement.dataset.theme = effective
  }, [theme, isThemeLocked])

  const applyOutcome = useCallback((outcome: PurchaseOutcome) => {
    if (outcome.ok) setOwned(outcome.owned)
    return outcome
  }, [])

  const value = useMemo<MonetizationValue>(
    () => ({
      native,
      storeAvailable,
      products,
      adsRemoved,
      ownsProduct,
      hasAccess,
      tempUnlockExpiry,
      isPackLocked: (packKey: string) => {
        const product = isCustomPackKey(packKey) ? CUSTOM_PACK_PRODUCT : getPack(packKey)?.product || null
        return !hasAccess(product)
      },
      customPacksLocked: !hasAccess(CUSTOM_PACK_PRODUCT),
      buy: (productId) => purchase(productId).then(applyOutcome),
      restorePurchases: () => restore().then(applyOutcome),
      unlockWithAd: async (productId) => {
        if (!native || !PACK_PRODUCT_IDS.includes(productId)) return false
        if (!(await showRewardedAd())) return false
        setTempUnlocks(grantTempUnlock(productId))
        return true
      },
      storeOpen,
      storeFocus,
      openStore: (focusProductId = null) => {
        setStoreFocus(focusProductId)
        setStoreOpen(true)
      },
      closeStore: () => setStoreOpen(false),
      setBannerWanted,
      bannerActive,
      showInterstitial: () => (native && !adsRemoved ? maybeShowInterstitial() : Promise.resolve()),
      theme,
      setTheme: (key: string) => {
        setThemeState(key)
        try {
          localStorage.setItem(THEME_STORAGE_KEY, key)
        } catch {
          // storage unavailable
        }
      },
      isThemeLocked,
    }),
    [native, storeAvailable, products, adsRemoved, ownsProduct, hasAccess, tempUnlockExpiry, applyOutcome, storeOpen, storeFocus, bannerActive, theme, isThemeLocked],
  )

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>
}

export function useMonetization() {
  const ctx = useContext(MonetizationContext)
  if (!ctx) throw new Error('useMonetization must be used within MonetizationProvider')
  return ctx
}
