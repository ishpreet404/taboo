import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { APP_NAME, APP_TAGLINE } from '@/lib/appConfig'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: `${APP_NAME} - Multiplayer Word Guessing Game`,
  description: `${APP_NAME}: ${APP_TAGLINE}. Play with friends online, no sign-up.`,
}

export const viewport = {
  width: 'device-width',
  initialScale: 0.9,
  maximumScale: 1.0,
  userScalable: true,
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
