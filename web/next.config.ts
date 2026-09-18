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
};

export default withNextIntl(nextConfig);
