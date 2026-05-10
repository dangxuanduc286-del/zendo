const defaultMediaHost = "media.zendo.vn";
const mediaHost = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL).hostname
  : defaultMediaHost;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [70, 80, 90],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: mediaHost,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: defaultMediaHost,
        pathname: "/**",
      },
    ],
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
