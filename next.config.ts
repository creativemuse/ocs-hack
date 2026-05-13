import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Prevent ESLint option incompatibilities from failing production builds
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Local asset server — development only
      ...(process.env.NODE_ENV !== 'production'
        ? [{ protocol: "http" as const, hostname: "localhost", port: "3845", pathname: "/assets/**" }]
        : []),
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "g2entgroup",

  project: "g2entgroup",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
