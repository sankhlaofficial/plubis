'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PricingModal from '@/components/PricingModal';

/**
 * Full-page pricing. Rendered when /api/book/create returns 402 (insufficient
 * credits) or when a visitor navigates to /pricing directly from a marketing
 * link. We reuse PricingModal in always-open mode so there is one source of
 * truth for pricing copy; closing the "modal" on this page sends the user
 * back to their library.
 */
export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <PricingModal open={true} onClose={() => router.push('/library')} />
      </main>
      <Footer />
    </div>
  );
}
