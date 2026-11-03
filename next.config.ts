import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OPAC ini sepenuhnya dinamis (data SQLite berubah setiap ada peminjaman),
  // sehingga model Cache Components tidak dipakai.
  cacheComponents: false,
  partialPrefetching: false,
  devIndicators: false,

  images: {
    // Sampul koleksi berasal dari server katalog lama.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "digilib.mercubuana.ac.id",
        pathname: "/manager/**",
      },
    ],
  },

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
