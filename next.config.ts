import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    // Every page and route: no other site may show us in a frame (so nobody can trick people into
    // typing a password into a hidden copy of /login), browsers never guess a file's type, other
    // sites see only our address and never the path, and powerful browser features stay off.
    const everywhere = [
      {
        key: "Content-Security-Policy",
        value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
      },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
    ];
    // These addresses carry secrets, or exist only for setup, so they must not leak or be indexed.
    const privateHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex" },
    ];
    // A header set here wins over the same header set by a route, and when two entries match, the
    // later one wins. So the routes with stricter values of their own repeat them here, after
    // `everywhere`.
    return [
      { source: "/:path*", headers: everywhere },
      ...["/invite/:token", "/reset/:token", "/setup"].map((source) => ({
        source,
        headers: privateHeaders,
      })),
      {
        source: "/api/pictures/:id",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; sandbox; frame-ancestors 'none'",
          },
        ],
      },
      {
        source: "/api/attachments/:id",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
