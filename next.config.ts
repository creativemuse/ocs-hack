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
  turbopack: {
    rules: {
      '*.js': {
        loaders: ['swc-loader'],
        as: '*.js',
      },
    },
  },
  // Webpack configuration (fallback for compatibility)
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Handle SpaceTimeDB compilation issues
    config.resolve.alias = {
      ...config.resolve.alias,
      'spacetimedb/src/lib/algebraic_type': false,
    };
    
    return config;
  },
  transpilePackages: ['spacetimedb'],
};

export default nextConfig;
