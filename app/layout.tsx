import type { Metadata } from 'next';
import { Fraunces, DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from '@/components/AuthProvider';
import { PostHogProvider } from '@/components/PostHogProvider';
import { BRAND_NAME, TAGLINE, DOMAIN } from '@/lib/brand';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['500', '600', '700'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${TAGLINE}`,
  description: TAGLINE,
  metadataBase: new URL(
    `https://${DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
  ),
  openGraph: {
    title: BRAND_NAME,
    description: TAGLINE,
    type: 'website',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="bg-cream text-ink antialiased">
        <PostHogProvider>
          <AuthProvider>{children}</AuthProvider>
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
