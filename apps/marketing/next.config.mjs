/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    // Real facility photography doesn't exist yet (see CLAUDE.md §5/§11).
    // Lorem Picsum is a real, stable, long-running free stock-photo
    // placeholder service (not guessed/hotlinked one-off URLs) — swap these
    // out for actual facility photos once a shoot happens.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
