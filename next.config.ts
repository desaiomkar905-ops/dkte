import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root is the project folder itself; prevents Turbopack from
  // picking up a stray parent package-lock.json outside the repository.
  turbopack: {
    root: __dirname,
  },
  // Removed serverExternalPackages: ["firebase-admin"] to allow native bundling
};

export default nextConfig;
