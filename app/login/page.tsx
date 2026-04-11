import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';
import { LoginButton } from '@/components/LoginButton';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="bg-cream min-h-[calc(100vh-80px)] flex items-center justify-center relative overflow-hidden">
        <DecorativeShape
          kind="cloud"
          size={72}
          className="absolute top-12 left-[8%] animate-float-slow"
        />
        <DecorativeShape
          kind="star"
          size={28}
          className="absolute top-20 right-[12%] animate-twinkle"
        />
        <DecorativeShape
          kind="sparkle"
          size={24}
          className="absolute bottom-16 left-[14%] animate-twinkle"
        />
        <DecorativeShape
          kind="balloon"
          size={56}
          className="absolute bottom-20 right-[10%] animate-float-slow"
        />

        <div className="relative z-10 w-full max-w-md px-6">
          <div className="rounded-[28px] bg-white border-2 border-outline p-10 md:p-12 shadow-[0_16px_40px_rgba(15,23,42,0.08)] text-center">
            <div className="flex justify-center mb-5">
              <PillLabel color="yellow">Welcome back</PillLabel>
            </div>
            <h1 className="text-4xl md:text-5xl mb-3">Sign in to Plubis</h1>
            <p className="text-ink-soft mb-8">
              One click with Google. We&apos;ll keep your books safe in your library.
            </p>
            <div className="flex justify-center">
              <LoginButton />
            </div>
            <p className="text-xs text-ink-soft mt-6">
              By signing in, you agree that we store your email and book history to let you come back to your library.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
