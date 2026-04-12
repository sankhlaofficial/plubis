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

export default function HomePage() {
  return (
    <>
      <Header />
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
