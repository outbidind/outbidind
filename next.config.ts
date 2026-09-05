import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/business/:slug/:id",
        destination: "/business/:id",
      },
    ];
  },
};

export default nextConfig;
