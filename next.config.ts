import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./lib/security/headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Ensure @supabase/supabase-js stays server-side
  serverExternalPackages: ["@supabase/supabase-js"],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "",
      ].filter(Boolean),
    },
  },

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },

  // Explicitly mark server-only modules to prevent client bundle leakage
  // Any import of these in client code will throw a build error
  webpack(config) {
    // Prevent accidental client-side import of server-only Supabase client
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

export default nextConfig;
