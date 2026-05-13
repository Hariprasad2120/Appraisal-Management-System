import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/admin/tickets", destination: "/account/tickets", permanent: true },
      { source: "/admin/tickets/:path*", destination: "/account/tickets/:path*", permanent: true },
      { source: "/admin/passkeys", destination: "/account/passkeys", permanent: true },
      { source: "/admin/passkeys/:path*", destination: "/account/passkeys/:path*", permanent: true },
      { source: "/admin/notifications", destination: "/account/notifications", permanent: true },
      { source: "/admin/notifications/:path*", destination: "/account/notifications/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/Logo.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  experimental: {
    optimizePackageImports: ["motion", "lucide-react", "date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
