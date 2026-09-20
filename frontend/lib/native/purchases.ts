// In-app purchases through RevenueCat (Play Billing / StoreKit underneath, which is
// what both stores require for digital goods). Serverless: receipts are validated
// by RevenueCat, entitlements are cached locally so the app works offline.

import { Capacitor } from '@capacitor/core'
import { REVENUECAT } from '../appConfig'

export interface Entitlements {
  removeAds: boolean
  premiumPacks: boolean
}

export type ProductKey = keyof typeof REVENUECAT.products

export interface StoreProduct {
  key: ProductKey
  id: string
  title: string
  price: string
}

export type PurchaseOutcome =
  | { ok: true; entitlements: Entitlements }
  | { ok: false; cancelled: boolean; message: string }

const CACHE_KEY = 'iw_entitlements'
const NONE: Entitlements = { removeAds: false, premiumPacks: false }

type RCModule = typeof import('@revenuecat/purchases-capacitor')
let rc: RCModule | null = null
let configured: Promise<boolean> | null = null
let storeProducts: any[] = []

export function purchasesAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return false
  return !!(Capacitor.getPlatform() === 'ios' ? REVENUECAT.iosKey : REVENUECAT.androidKey)
}

export function cachedEntitlements(): Entitlements {
  try {
    return { ...NONE, ...JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') }
  } catch {
    return NONE
  }
}

function fromCustomerInfo(info: any): Entitlements {
  const active = info?.entitlements?.active || {}
  const result = {
    removeAds: !!active[REVENUECAT.entitlements.removeAds],
    premiumPacks: !!active[REVENUECAT.entitlements.premiumPacks],
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result))
  } catch {
    // storage full / private mode
  }
  return result
}

async function configure(): Promise<boolean> {
  if (!purchasesAvailable()) return false
  try {
    rc = await import('@revenuecat/purchases-capacitor')
    const apiKey = Capacitor.getPlatform() === 'ios' ? REVENUECAT.iosKey : REVENUECAT.androidKey
    // Anonymous app user id: no accounts, nothing personal leaves the device
    await rc.Purchases.configure({ apiKey })
    return true
  } catch (e) {
    console.warn('[iap] configure failed', e)
    return false
  }
}

const ensureConfigured = () => (configured ??= configure())

export async function refreshEntitlements(): Promise<Entitlements> {
  if (!(await ensureConfigured()) || !rc) return cachedEntitlements()
  try {
    const { customerInfo } = await rc.Purchases.getCustomerInfo()
    return fromCustomerInfo(customerInfo)
  } catch {
    return cachedEntitlements()
  }
}

export async function loadProducts(): Promise<StoreProduct[]> {
  if (!(await ensureConfigured()) || !rc) return []
  try {
    const ids = Object.values(REVENUECAT.products)
    const { products } = await rc.Purchases.getProducts({
      productIdentifiers: ids,
      type: rc.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    })
    storeProducts = products
    return (Object.keys(REVENUECAT.products) as ProductKey[])
      .map((key) => {
        const p = products.find((x) => x.identifier === REVENUECAT.products[key])
        return p ? { key, id: p.identifier, title: p.title, price: p.priceString } : null
      })
      .filter((p): p is StoreProduct => p !== null)
  } catch (e) {
    console.warn('[iap] loading products failed', e)
    return []
  }
}

export async function purchase(key: ProductKey): Promise<PurchaseOutcome> {
  if (!(await ensureConfigured()) || !rc) return { ok: false, cancelled: false, message: 'Purchases are not available on this device.' }
  try {
    if (!storeProducts.length) await loadProducts()
    const product = storeProducts.find((p) => p.identifier === REVENUECAT.products[key])
    if (!product) return { ok: false, cancelled: false, message: 'This item is not available right now. Please try again later.' }
    const { customerInfo } = await rc.Purchases.purchaseStoreProduct({ product })
    return { ok: true, entitlements: fromCustomerInfo(customerInfo) }
  } catch (e: any) {
    const cancelled = !!e?.userCancelled || e?.code === '1'
    return { ok: false, cancelled, message: cancelled ? 'Purchase cancelled.' : 'The purchase could not be completed. You have not been charged.' }
  }
}

// Required by App Store guideline 3.1.1: previous purchases must be restorable.
export async function restore(): Promise<PurchaseOutcome> {
  if (!(await ensureConfigured()) || !rc) return { ok: false, cancelled: false, message: 'Purchases are not available on this device.' }
  try {
    const { customerInfo } = await rc.Purchases.restorePurchases()
    return { ok: true, entitlements: fromCustomerInfo(customerInfo) }
  } catch {
    return { ok: false, cancelled: false, message: 'Could not restore purchases. Check your connection and try again.' }
  }
}
