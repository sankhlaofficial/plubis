import type { NextConfig } from "next";

// CSP for Plubis:
// - Google Identity (Firebase Auth popup)
// - Firebase REST + realtime websocket
// - PostHog analytics
// - Vercel Analytics + Speed Insights
// - Dodo Payments checkout
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://us-assets.i.posthog.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.firebasestorage.app https://*.googleusercontent.com https://lh3.googleusercontent.com",
  "connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://securetoken.googleapis.com https://us.i.posthog.com https://us-assets.i.posthog.com https://va.vercel-scripts.com",
  "frame-src 'self' https://storybook-saas-prod.firebaseapp.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://app.dodopayments.com https://checkout.dodopayments.com https://live.dodopayments.com",
].join("; ");

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
