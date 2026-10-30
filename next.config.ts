import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Brand artwork and product photos. Any query string is allowed: saved photos carry a ?v= cache buster.
    localPatterns: [{ pathname: "/brands/**" }],
    qualities: [75],
    // Photos only change under a new ?v= URL, so optimized copies can be kept for a month.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
