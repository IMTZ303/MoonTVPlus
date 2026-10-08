/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,
  swcMinify: true,
  images: { unoptimized: true, remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }] },
  experimental: {
    cpus: 1,
    optimizePackageImports: ['@dnd-kit/core', '@dnd-kit/modifiers', '@dnd-kit/sortable', '@dnd-kit/utilities', '@heroicons/react', 'lucide-react', 'react-icons'],
  },
  webpack(config, { isServer }) {
    const fileLoaderRule = config.module.rules.find(rule => rule.test?.test?.('.svg'));
    if (fileLoaderRule) {
      config.module.rules.push({ ...fileLoaderRule, test: /\.svg$/i, resourceQuery: /url/ }, { test: /\.svg$/i, issuer: { not: /\.(css|scss|sass)$/ }, resourceQuery: { not: /url/ }, loader: '@svgr/webpack', options: { dimensions: false, titleProp: true } });
      fileLoaderRule.exclude = /\.svg$/i;
    }
    config.resolve.fallback = { ...config.resolve.fallback, net: false, tls: false, crypto: false };
    if (!isServer) config.resolve.alias = { ...config.resolve.alias, '@/lib/db': false };
    return config;
  },
};
