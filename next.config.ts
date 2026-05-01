import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["motion", "lucide-react", "date-fns"],
  },
};

export default nextConfig;
