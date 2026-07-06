/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sidesteps a Next.js 14.2.x bug where the legacy pages-router /404 and
  // /500 fallback shim fails to export ("<Html> should not be imported
  // outside of pages/_document") in App-Router-only projects — standalone
  // output uses a different manifest path that doesn't hit it. Also the
  // right output mode for a containerized Railway/Docker deploy regardless.
  output: "standalone",
  experimental: {
    // Server Actions default to a 1MB request body limit — way under a real
    // phone photo (routinely 3-15MB), which crashed the "Site Photos" upload
    // with a generic "server error" before the request ever reached apps/api.
    // Matches apps/api/src/routes/site-images.ts's own 20MB multipart limit.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
