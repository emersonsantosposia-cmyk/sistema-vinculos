import type { NextConfig } from "next";
import packageJson from "./package.json";

const repoOwner = process.env.VERCEL_GIT_REPO_OWNER;
const repoSlug = process.env.VERCEL_GIT_REPO_SLUG;
const gitRef =
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "master";

const defaultChangelogUrl =
  "https://github.com/emersonsantosposia-cmyk/sistema-vinculos/blob/master/CHANGELOG.md";

const changelogUrl =
  process.env.NEXT_PUBLIC_APP_CHANGELOG_URL ||
  (repoOwner && repoSlug
    ? `https://github.com/${repoOwner}/${repoSlug}/blob/${gitRef}/CHANGELOG.md`
    : defaultChangelogUrl);

const nextConfig: NextConfig = {
  // Injetado no build a partir de package.json + metadados Vercel (quando houver).
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_APP_GIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    NEXT_PUBLIC_APP_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_CHANGELOG_URL: changelogUrl,
  },
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
