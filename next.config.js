/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/systemup',
  experimental: {
    serverComponentsExternalPackages: ['mongodb', 'ssh2', 'dockerode'],
  },
}

module.exports = nextConfig