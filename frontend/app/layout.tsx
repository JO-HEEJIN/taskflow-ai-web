import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#c084fc',
}

export const metadata: Metadata = {
  title: 'TaskFlow AI - AI-Powered Task Management',
  description: 'TaskFlow AI is a productivity application that helps users overcome task overwhelm through intelligent AI-powered task decomposition. Break down complex tasks into small, actionable 2-10 minute subtasks. Features include smart scheduling with Google Calendar integration, immersive focus mode, and cross-device synchronization.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TaskFlow AI',
  },
  verification: {
    google: 'zcObuid-d5GUc0SwsRV7iy3cPxI6JJYQEo3IugruhKI',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
