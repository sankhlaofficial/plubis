import { LoginButton } from '@/components/LoginButton';
import { BRAND_NAME } from '@/lib/brand';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
      <div className="text-center">
        <h1 className="text-4xl font-serif text-[#2C3E50] mb-4">{BRAND_NAME}</h1>
        <p className="text-[#5D6D7E] mb-8">Sign in to start making books.</p>
        <LoginButton />
      </div>
    </main>
  );
}
