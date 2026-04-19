/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ankanowfwxpeuovwnjai.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'pub-a686c541783847b9ab052f08c5f39208.r2.dev',
      },
    ],
  },
}

module.exports = nextConfig
