import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
