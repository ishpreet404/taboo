// In-app purchases through RevenueCat (Play Billing / StoreKit underneath, which is
// what both stores require for digital goods). Serverless: receipts are validated
// by RevenueCat, entitlements are cached locally so the app works offline.
//
// Convention: every product id has an entitlement with the SAME identifier.

import { Capacitor } from '@capacitor/core'
import { REVENUECAT, REWARDED_UNLOCK_MS } from '../appConfig'

/** Active entitlement identifiers (== product ids) */
export type Owned = string[]

export interface StoreProduct {
  id: string
  title: string
  price: string
}

export type PurchaseOutcome = { ok: true; owned: Owned } | { ok: false; cancelled: boolean; message: string }

const CACHE_KEY = 'iw_owned_products'
const TEMP_KEY = 'iw_temp_unlocks'

type RCModule = typeof import('@revenuecat/purchases-capacitor')
let rc: RCModule | null = null
let configured: Promise<boolean> | null = null
let storeProducts: any[] = []

export function purchasesAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return false
  return !!(Capacitor.getPlatform() === 'ios' ? REVENUECAT.iosKey : REVENUECAT.androidKey)
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full / private mode
  }
}

export function cachedOwned(): Owned {
  const owned = readJSON<unknown>(CACHE_KEY, [])
  return Array.isArray(owned) ? owned.filter((id): id is string => typeof id === 'string') : []
}

function fromCustomerInfo(info: any): Owned {
  const owned = Object.keys(info?.entitlements?.active || {})
  writeJSON(CACHE_KEY, owned)
  return owned
}

// --- Rewarded-ad unlocks (time-limited, device-local) -----------------------

export function activeTempUnlocks(): Record<string, number> {
  const all = readJSON<Record<string, number>>(TEMP_KEY, {})
  const now = Date.now()
  const active: Record<string, number> = {}
  for (const [id, expiry] of Object.entries(all)) if (typeof expiry === 'number' && expiry > now) active[id] = expiry
  return active
}

export function grantTempUnlock(productId: string): Record<string, number> {
  const unlocks = { ...activeTempUnlocks(), [productId]: Date.now() + REWARDED_UNLOCK_MS }
  writeJSON(TEMP_KEY, unlocks)
  return unlocks
}

// --- RevenueCat --------------------------------------------------------------

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

export async function refreshOwned(): Promise<Owned> {
  if (!(await ensureConfigured()) || !rc) return cachedOwned()
  try {
    const { customerInfo } = await rc.Purchases.getCustomerInfo()
    return fromCustomerInfo(customerInfo)
  } catch {
    return cachedOwned()
  }
}

export async function loadProducts(productIds: string[]): Promise<StoreProduct[]> {
  if (!(await ensureConfigured()) || !rc) return []
  try {
    const { products } = await rc.Purchases.getProducts({
      productIdentifiers: productIds,
      type: rc.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    })
    storeProducts = products
    return products.map((p) => ({ id: p.identifier, title: p.title, price: p.priceString }))
  } catch (e) {
    console.warn('[iap] loading products failed', e)
    return []
  }
}

export async function purchase(productId: string): Promise<PurchaseOutcome> {
  if (!(await ensureConfigured()) || !rc) return { ok: false, cancelled: false, message: 'Purchases are not available on this device.' }
  try {
    const product = storeProducts.find((p) => p.identifier === productId)
    if (!product) return { ok: false, cancelled: false, message: 'This item is not available right now. Please try again later.' }
    const { customerInfo } = await rc.Purchases.purchaseStoreProduct({ product })
    return { ok: true, owned: fromCustomerInfo(customerInfo) }
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
    return { ok: true, owned: fromCustomerInfo(customerInfo) }
  } catch {
    return { ok: false, cancelled: false, message: 'Could not restore purchases. Check your connection and try again.' }
  }
}
