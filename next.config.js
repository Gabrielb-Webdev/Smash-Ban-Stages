/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./lib/version.js').APP_VERSION,
    NEXT_PUBLIC_VAPID_KEY: process.env.VAPID_PUBLIC_KEY || '',
  },
  reactStrictMode: true,
  // Force cache invalidation
  generateBuildId: async () => {
    return 'session-fix-final-' + Date.now();
  },
  // Disable cache for development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}

module.exports = nextConfig
