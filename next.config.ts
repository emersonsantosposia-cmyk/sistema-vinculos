import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser interno do Cursor às vezes usa 127.0.0.1 em vez de localhost.
  // Sem isso, o Next bloqueia HMR/assets e a página pode quebrar/mostrar 404.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
      {
        source: "/locais/:id/editar",
        destination: "/enderecos/:id/editar",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
