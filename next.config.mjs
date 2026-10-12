/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional local verification mode for memory-constrained Windows machines.
  ...(process.env.ZOCLIP_LOW_MEMORY === '1' && { experimental: { cpus: 1 } }),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
