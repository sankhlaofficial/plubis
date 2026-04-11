import type { Metadata } from 'next';
import { Fraunces, Lora } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import { BRAND_NAME, TAGLINE } from '@/lib/brand';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display' });
const body = Lora({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-[#FAF7F2] text-[#2C3E50] font-serif">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
