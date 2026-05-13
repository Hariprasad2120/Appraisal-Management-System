import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async redirects() {
    return [
      // Legacy paths — redirect to account-level pages
      { source: "/admin/tickets", destination: "/account/tickets", permanent: true },
      { source: "/admin/tickets/:path*", destination: "/account/tickets/:path*", permanent: true },
      { source: "/admin/passkeys", destination: "/account/passkeys", permanent: true },
      { source: "/admin/passkeys/:path*", destination: "/account/passkeys/:path*", permanent: true },
      { source: "/admin/notifications", destination: "/account/notifications", permanent: true },
      { source: "/admin/notifications/:path*", destination: "/account/notifications/:path*", permanent: true },
      // AMS paths — same redirects under new /ams/admin/ prefix
      { source: "/ams/admin/tickets", destination: "/account/tickets", permanent: false },
      { source: "/ams/admin/tickets/:path*", destination: "/account/tickets/:path*", permanent: false },
      { source: "/ams/admin/passkeys", destination: "/account/passkeys", permanent: false },
      { source: "/ams/admin/passkeys/:path*", destination: "/account/passkeys/:path*", permanent: false },
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
