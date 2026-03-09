import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DeFiScope — DeFi Ecosystem Analytics',
  description:
    'Interactive 3D visualization of the DeFi ecosystem. Explore protocols, TVL, yields, and chain analytics powered by DeFiLlama.',
  keywords: ['DeFi', 'TVL', 'yields', 'protocols', 'blockchain', 'analytics', 'DeFiLlama'],
  authors: [{ name: 'DeFiScope' }],
  openGraph: {
    title: 'DeFiScope — DeFi Ecosystem Analytics',
    description:
      'Explore the entire DeFi ecosystem in 3D. TVL, yields, protocol rankings powered by DeFiLlama.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeFiScope',
    description: 'Interactive 3D DeFi ecosystem visualization',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
