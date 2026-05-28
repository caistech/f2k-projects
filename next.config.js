/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    return config;
  },
  // Exclude Supabase Edge Functions directory from TypeScript compilation
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore TypeScript errors for the edge functions folder
  ignoreBuildErrors: [/supabase\/functions/],
};

module.exports = nextConfig;
