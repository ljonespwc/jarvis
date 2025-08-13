/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Electron - generate static files instead of SSR
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  
  // Use relative paths for assets
  trailingSlash: true,
  
  // Configure for Electron renderer process
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : ''
}

module.exports = nextConfig