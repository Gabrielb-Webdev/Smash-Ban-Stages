/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Force cache invalidation
  generateBuildId: async () => {
    return 'websocket-fix-' + Date.now();
  },
  // Disable cache for development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}

module.exports = nextConfig
