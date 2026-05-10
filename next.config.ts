import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "esbuild"],
};

export default nextConfig;
