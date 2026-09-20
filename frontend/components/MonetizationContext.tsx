'use client'

import { LOCK_PREMIUM_ON_WEB, PREMIUM_PACKS } from '@/lib/appConfig'
import { hideBanner, maybeShowInterstitial, setAdsDisabled, showBanner } from '@/lib/native/ads'
import { isNative } from '@/lib/native/device'
import {
  cachedEntitlements,
  Entitlements,
  loadProducts,
  ProductKey,
  purchase,
  purchasesAvailable,
  PurchaseOutcome,
  refreshEntitlements,
  restore,
  StoreProduct,
} from '@/lib/native/purchases'
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

interface MonetizationValue {
  native: boolean
  storeAvailable: boolean
  entitlements: Entitlements
  products: StoreProduct[]
  isPackLocked: (packKey: string) => boolean
  buy: (key: ProductKey) => Promise<PurchaseOutcome>
  restorePurchases: () => Promise<PurchaseOutcome>
  storeOpen: boolean
  openStore: () => void
  closeStore: () => void
  // Ads: screens say what they want, the context applies entitlements
  setBannerWanted: (wanted: boolean) => void
  bannerActive: boolean
  showInterstitial: () => Promise<void>
}

const MonetizationContext = createContext<MonetizationValue | undefined>(undefined)

export function MonetizationProvider({ children }: { children: ReactNode }) {
  // Resolved after mount so the static HTML is identical on web and native
  const [native, setNative] = useState(false)
  const [storeAvailable, setStoreAvailable] = useState(false)
  const [entitlements, setEntitlements] = useState<Entitlements>({ removeAds: false, premiumPacks: false })
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [storeOpen, setStoreOpen] = useState(false)
  const [bannerWanted, setBannerWanted] = useState(false)

  useEffect(() => {
    const onNative = isNative()
    setNative(onNative)
    setStoreAvailable(purchasesAvailable())
    if (!onNative) return
    // Cached first (instant, works offline), then the store's truth
    setEntitlements(cachedEntitlements())
    refreshEntitlements().then(setEntitlements)
    loadProducts().then(setProducts)
  }, [])

  const bannerActive = native && bannerWanted && !entitlements.removeAds

  useEffect(() => {
    if (!native) return
    void setAdsDisabled(entitlements.removeAds)
  }, [native, entitlements.removeAds])

  useEffect(() => {
    if (!native) return
    void (bannerActive ? showBanner() : hideBanner())
  }, [native, bannerActive])

  const applyOutcome = useCallback((outcome: PurchaseOutcome) => {
    if (outcome.ok) setEntitlements(outcome.entitlements)
    return outcome
  }, [])

  const value = useMemo<MonetizationValue>(
    () => ({
      native,
      storeAvailable,
      entitlements,
      products,
      isPackLocked: (packKey: string) => {
        if (!PREMIUM_PACKS.includes(packKey) || entitlements.premiumPacks) return false
        // Lock only where the player can actually do something about it
        return native ? storeAvailable : LOCK_PREMIUM_ON_WEB
      },
      buy: (key) => purchase(key).then(applyOutcome),
      restorePurchases: () => restore().then(applyOutcome),
      storeOpen,
      openStore: () => setStoreOpen(true),
      closeStore: () => setStoreOpen(false),
      setBannerWanted,
      bannerActive,
      showInterstitial: () => (native && !entitlements.removeAds ? maybeShowInterstitial() : Promise.resolve()),
    }),
    [native, storeAvailable, entitlements, products, storeOpen, bannerActive, applyOutcome],
  )

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>
}

export function useMonetization() {
  const ctx = useContext(MonetizationContext)
  if (!ctx) throw new Error('useMonetization must be used within MonetizationProvider')
  return ctx
}
