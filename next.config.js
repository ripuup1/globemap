/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images
  images: {
    domains: [],
  },
  
  // Webpack configuration for Three.js and react-globe.gl (for webpack builds)
  webpack: (config, { isServer }) => {
    // Fix for Three.js and react-globe.gl
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    return config
  },
  
  // Turbopack configuration (Next.js 16+ default)
  turbopack: {
    // Turbopack handles Three.js and react-globe.gl automatically
  },
  
  // External packages for server components (moved from experimental in Next.js 16)
  serverExternalPackages: ['three', 'react-globe.gl'],
}

module.exports = nextConfig
