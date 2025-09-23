
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // This regex matches all font file extensions.
        source: '/:path*(.woff|.woff2|.ttf|.eot)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            // This allows all origins to access the fonts.
            // For production, you might want to restrict this to your domain.
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
