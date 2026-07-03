/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sidesteps a Next.js 14.2.x bug where the legacy pages-router /404 and
  // /500 fallback shim fails to export ("<Html> should not be imported
  // outside of pages/_document") in App-Router-only projects — standalone
  // output uses a different manifest path that doesn't hit it. Also the
  // right output mode for a containerized Railway/Docker deploy regardless.
  output: "standalone",
};

export default nextConfig;
