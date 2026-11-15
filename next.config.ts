import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  reactCompiler: true,
  serverExternalPackages: ["edge-tts-universal", "web-push"],
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
};

export default nextConfig;
