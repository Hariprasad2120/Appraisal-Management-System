import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    optimizePackageImports: ["motion", "lucide-react", "date-fns"],
  },
};

export default nextConfig;
