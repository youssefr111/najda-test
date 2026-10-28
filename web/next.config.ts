import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import * as fs from "fs";
import * as path from "path";

const mapLibreSrcDir = path.join(__dirname, "node_modules/maplibre-gl/dist");
const mapLibreDestDir = path.join(__dirname, "public/maplibre");

const filesToCopy = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

if (fs.existsSync(mapLibreSrcDir)) {
  fs.mkdirSync(mapLibreDestDir, { recursive: true });
  for (const file of filesToCopy) {
    fs.copyFileSync(
      path.join(mapLibreSrcDir, file),
      path.join(mapLibreDestDir, file)
    );
  }
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rnnhdvkbvqlvtcngrvzc.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        // Browser fallback when the app isn't installed. Query params are preserved.
        source: "/auth/action",
        destination: "/complete-signup",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);