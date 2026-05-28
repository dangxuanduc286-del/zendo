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

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
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
