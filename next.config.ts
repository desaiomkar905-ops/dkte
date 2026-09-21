import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root is the project folder itself; prevents Turbopack from
  // picking up a stray parent package-lock.json outside the repository.
  turbopack: {
    root: __dirname,
  },
  // firebase-admin must stay external in serverless bundles: it resolves
  // modules dynamically at runtime (google-auth-library, websockets, etc.),
  // which webpack breaks when it inlines the package. Without this the
  // /api/auth/google route crashes with a 500 on every request.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
