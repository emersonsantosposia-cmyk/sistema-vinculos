import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/locais",
        destination: "/enderecos",
        permanent: true,
      },
      {
        source: "/locais/novo",
        destination: "/enderecos/novo",
        permanent: true,
      },
      {
        source: "/locais/:id",
        destination: "/enderecos/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
