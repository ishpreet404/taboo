import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { APP_NAME, APP_TAGLINE } from '@/lib/appConfig'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: `${APP_NAME} - Multiplayer Word Guessing Game`,
  description: `${APP_NAME}: ${APP_TAGLINE}. Play with friends online, no sign-up.`,
}

// Fixed 1:1 viewport. The old 0.9 initial scale made phones (and the app's WebView)
// lay the page out wider than the screen and then rescale it, which is what caused
// the zooming/panning. Density on small screens is handled in globals.css instead.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  )
}
