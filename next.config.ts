import type { NextConfig } from 'next';

import path from 'node:path';

const nextConfig: NextConfig = {
  images: {
    /** Cloudinary delivery host; explicit pathname avoids optimizer rejections in some Next versions. */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
