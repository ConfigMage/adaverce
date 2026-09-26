import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the series plan ships with the serverless function that reads it.
  outputFileTracingIncludes: {
    "/api/assist": ["./content/**/*"],
  },
};

export default nextConfig;
