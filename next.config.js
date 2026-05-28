/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    // Exclude Supabase Edge Functions from Next.js build (they deploy separately)
    if (!isServer) {
      config.module.rules.push({
        test: /supabase\/functions/,
        use: "empty-loader",
      });
    }
    return config;
  },
};

module.exports = nextConfig;
