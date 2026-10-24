import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OPAC ini sepenuhnya dinamis (data SQLite berubah setiap ada peminjaman),
  // sehingga model Cache Components tidak dipakai.
  cacheComponents: false,
  partialPrefetching: false,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
