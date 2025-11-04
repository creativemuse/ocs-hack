import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3845",
        pathname: "/assets/**",
      },
      // Add your production asset domain here
      // Example for CDN:
      {
         protocol: "https",
         hostname: "beatme.creativeplatform.xyz",
         pathname: "/assets/**",
      },
      // Example for custom asset server:
      // {
      //   protocol: "https", 
      //   hostname: "your-asset-server.com",
      //   pathname: "/assets/**",
      // },
    ],
  },
  // Turbopack configuration for Next.js 16
  turbopack: {},
  transpilePackages: ['spacetimedb'],
  // Optimize bundle size
  serverExternalPackages: ['@spacetimedb/client'],
  // Exclude music files and other large assets from serverless function bundles
  // Moved from experimental.outputFileTracingExcludes to top-level (Next.js 16+)
  outputFileTracingExcludes: {
    '*': [
      'public/music/**/*',
      'public/music',
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/esbuild-linux-64',
      'node_modules/webpack',
      '.git/**',
    ],
  },
  // Exclude large directories from build
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'lib/chainlink': 'commonjs lib/chainlink',
      });
    }
    
    // Optimize for production builds
    if (!dev) {
      // Enable tree shaking
      config.optimization = config.optimization || {};
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
