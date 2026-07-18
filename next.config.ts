import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/heavy Node deps must not be bundled by Turbopack/Webpack.
  serverExternalPackages: [
    "better-sqlite3",
    "playwright",
    "pino",
    "lighthouse",
    "axe-core",
    "@axe-core/playwright",
  ],
};

export default nextConfig;
