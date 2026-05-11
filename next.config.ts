import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: false,
      hmrRefreshes: false,
    },
  },
};

export default nextConfig;
