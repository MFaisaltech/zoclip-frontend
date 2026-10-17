import {validateStagingConfig} from './scripts/check-staging-config.mjs'

const staging = process.env.NEXT_PUBLIC_PRIVATE_STAGING === 'true'
const stagingConfig = staging ? validateStagingConfig(process.env) : null
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional local verification mode for memory-constrained Windows machines.
  ...(process.env.ZOCLIP_LOW_MEMORY === '1' && { experimental: { cpus: 1, webpackMemoryOptimizations: true } }),
  async headers() {
    if (!stagingConfig) return []
    const api = stagingConfig.apiOrigin
    return [{source: '/:path*', headers: [
      {key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive'},
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'X-Frame-Options', value: 'DENY'},
      {key: 'Referrer-Policy', value: 'no-referrer'},
      {key: 'Strict-Transport-Security', value: 'max-age=31536000'},
      {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()'},
      {key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: ${api}; connect-src 'self' ${api}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`},
    ]}]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
