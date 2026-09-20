// Small native niceties. Every function degrades gracefully on the web.

import { Capacitor } from '@capacitor/core'
import { APP_NAME, WEB_URL } from '../appConfig'

export const isNative = () => Capacitor.isNativePlatform()

// While a phone is in a room its screen must not sleep: a sleeping host freezes
// the game for everyone, a sleeping guest drops out.
export async function setKeepAwake(on: boolean) {
  try {
    if (isNative()) {
      const { KeepAwake } = await import('@capacitor-community/keep-awake')
      await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep())
    } else if ('wakeLock' in navigator) {
      await setWebWakeLock(on)
    }
  } catch {
    // best effort
  }
}

let webLock: any = null
async function setWebWakeLock(on: boolean) {
  if (on && !webLock) {
    webLock = await (navigator as any).wakeLock.request('screen')
    webLock.addEventListener?.('release', () => (webLock = null))
  } else if (!on && webLock) {
    await webLock.release()
    webLock = null
  }
}

export const inviteUrl = (roomCode: string) => `${WEB_URL}/?room=${encodeURIComponent(roomCode)}`

/** Returns 'shared', 'copied' or 'failed'. */
export async function shareInvite(roomCode: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = inviteUrl(roomCode)
  const text = `Join my ${APP_NAME} room! Code: ${roomCode}`
  try {
    if (isNative()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: APP_NAME, text, url, dialogTitle: 'Invite friends' })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title: APP_NAME, text, url })
      return 'shared'
    }
    await navigator.clipboard.writeText(`${text}\n${url}`)
    return 'copied'
  } catch (e: any) {
    // User closing the share sheet is not an error
    return e?.name === 'AbortError' ? 'shared' : 'failed'
  }
}

export async function hapticTap() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // no haptics hardware
  }
}

/** Room code from an invite link (?room=ABC123), if any. */
export function roomCodeFromUrl(url: string = typeof window !== 'undefined' ? window.location.href : ''): string {
  try {
    const code = new URL(url).searchParams.get('room') || ''
    return /^[A-Za-z0-9]{4,8}$/.test(code) ? code.toUpperCase() : ''
  } catch {
    return ''
  }
}

/** Native only: invite links opened while the app is installed (App Links / Universal Links). */
export async function onInviteLink(handler: (roomCode: string) => void): Promise<() => void> {
  if (!isNative()) return () => {}
  const { App } = await import('@capacitor/app')
  const sub = await App.addListener('appUrlOpen', ({ url }) => {
    const code = roomCodeFromUrl(url)
    if (code) handler(code)
  })
  return () => void sub.remove()
}

/** Native only: fires when the app returns to the foreground. */
export async function onAppResume(handler: () => void): Promise<() => void> {
  if (!isNative()) return () => {}
  const { App } = await import('@capacitor/app')
  const sub = await App.addListener('resume', handler)
  return () => void sub.remove()
}
