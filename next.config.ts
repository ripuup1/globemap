import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...(typeof config.optimization?.splitChunks === 'object'
              ? config.optimization.splitChunks.cacheGroups
              : {}),
            three: {
              test: /[\\/]node_modules[\\/](three|react-globe\.gl|three-globe)[\\/]/,
              name: 'three-globe',
              chunks: 'all' as const,
              priority: 10,
            },
          },
        },
      }
    }
    return config
  },
};

export default nextConfig;
