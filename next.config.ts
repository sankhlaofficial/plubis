import type { NextConfig } from "next";

// Tight CSP for the Plubis surface area:
// - script-src includes Google Identity (gstatic + apis.google.com) for Firebase Auth popup
// - connect-src includes Firebase REST endpoints and the realtime websocket
// - img-src includes Firebase Storage signed URLs and Google avatar URLs
// - frame-src allows the Google sign-in popup origin
// - default-src is self only — anything not whitelisted is denied
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.firebasestorage.app https://*.googleusercontent.com https://lh3.googleusercontent.com",
  "connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://securetoken.googleapis.com",
  "frame-src 'self' https://storybook-saas-prod.firebaseapp.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://app.dodopayments.com https://checkout.dodopayments.com",
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
