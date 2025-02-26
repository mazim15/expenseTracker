/** @type {import('next').NextConfig} */
const nextConfig = {
  // your existing config options here
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "undici": false,
    };
    return config;
  },
}

module.exports = nextConfig 