import type { NextConfig } from "next";
// POD Magic is a standalone application in the parent MyFounderHQ repository.
// Keep Turbopack and its special entrypoint discovery inside this app directory.
const nextConfig:NextConfig={turbopack:{root:process.cwd()},outputFileTracingRoot:process.cwd()};
export default nextConfig;
