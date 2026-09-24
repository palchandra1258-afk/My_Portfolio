import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Everything under /admin — the dashboard, the editor and the draft
        // preview — is per-user, authenticated content, and the preview in
        // particular renders projects that are not published.
        //
        // `force-dynamic` on those routes stops Next caching them, but it says
        // nothing to anything downstream: a CDN, a corporate proxy or the
        // browser's own back/forward cache could still hold a rendered draft
        // and hand it to someone else. `private` forbids shared caches from
        // storing it at all, `no-store` forbids any cache from storing it, and
        // `must-revalidate` closes the stale-response path.
        //
        // SECURITY_AND_QUALITY.md §12 (session security) and
        // CMS_SPECIFICATION.md §68 (preview security).
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          // Belt and braces alongside the per-route `robots` metadata: a header
          // applies to every response from this namespace, including ones that
          // never render a <head> (an error, a redirect, a 404).
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
