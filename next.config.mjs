/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This is our "Official VIP Pass".
  // It authorizes our Next.js server to act as a proxy for images from this domain.
  images: {
    remotePatterns: [
      {
        protocol: 'https'
        ,
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

