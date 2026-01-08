const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hikeupdatastorage.s3-us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
  // Enable instrumentation for cron jobs
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
