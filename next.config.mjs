import { NEXT_IMAGE_QUALITIES } from "./next-image-config.mjs";

const defaultMediaHost = "media.zendo.vn";
let mediaHost = defaultMediaHost;
try {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  if (raw) mediaHost = new URL(raw).hostname;
} catch {
  mediaHost = defaultMediaHost;
}
const imageRemotePatterns = [...new Set([mediaHost, defaultMediaHost])].map((hostname) => ({
  protocol: "https",
  hostname,
  pathname: "/**",
}));

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://analytics.tiktok.com https://sp.zalo.me https://www.clarity.ms",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://media.zendo.vn https://www.google-analytics.com https://www.googletagmanager.com https://stats.g.doubleclick.net https://www.facebook.com https://www.facebook.com.vn https://analytics.tiktok.com https://sp.zalo.me https://www.clarity.ms https://c.bing.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://graph.facebook.com https://www.facebook.com https://analytics.tiktok.com https://business-api.tiktok.com https://sp.zalo.me https://www.clarity.ms https://*.clarity.ms https://*.pusher.com wss://*.pusher.com https://*.pusherapp.com wss://*.pusherapp.com",
      "frame-src 'self' https://www.googletagmanager.com https://www.facebook.com https://m.me https://zalo.me https://sp.zalo.me https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://maps.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    qualities: NEXT_IMAGE_QUALITIES,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    remotePatterns: imageRemotePatterns,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  webpack: (config, { dev }) => {
    // Avoid noisy PackFileCacheStrategy ENOENT issues on Windows in dev.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
