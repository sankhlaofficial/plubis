import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import HowItWorks from '@/components/HowItWorks';
import WhatYouGet from '@/components/WhatYouGet';
import ExampleBook from '@/components/ExampleBook';
import BlogGuides from '@/components/BlogGuides';
import EmailCapture from '@/components/EmailCapture';
import Testimonial from '@/components/Testimonial';
import CloudDivider from '@/components/CloudDivider';
import { BRAND_NAME, TAGLINE } from '@/lib/brand';

const BASE_URL = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'plubis.vercel.app'}`;

const homeSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/icon-512.png`,
    description: 'AI-generated picture books for children facing specific emotional situations. A book for the hard things to explain.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Plubis Picture Book',
    description: TAGLINE,
    brand: { '@type': 'Organization', name: BRAND_NAME },
    offers: {
      '@type': 'Offer',
      price: '5.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      {homeSchema.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
      <main>
        <HeroSection />
        <CloudDivider topColor="#FFCC4D" bottomColor="#FBF8F1" />
        <HowItWorks />
        <CloudDivider topColor="#FBF8F1" bottomColor="#D4F0E0" />
        <WhatYouGet />
        <CloudDivider topColor="#D4F0E0" bottomColor="#FCE4EC" />
        <ExampleBook />
        <CloudDivider topColor="#FCE4EC" bottomColor="#FBF8F1" />
        <BlogGuides />
        <CloudDivider topColor="#FBF8F1" bottomColor="#FFCC4D" />
        <EmailCapture />
        <CloudDivider topColor="#FFCC4D" bottomColor="#FBF8F1" />
        <Testimonial />
      </main>
      <Footer />
    </>
  );
}
