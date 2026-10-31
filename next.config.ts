import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Tailwind is processed by postcss.config.mjs for both Turbopack (dev) and webpack (build).
};

export default nextConfig;
