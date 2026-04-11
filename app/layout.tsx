import type { Metadata } from 'next';
import { Fraunces, DM_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
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
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="bg-cream text-ink antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
