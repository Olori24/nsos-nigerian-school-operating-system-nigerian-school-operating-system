const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

export const config = {
  functions: {
    "index.ts": {
      // The Express SPA fallback reads the generated HTML from this directory.
      // Vercel also serves the same public directory directly through its CDN.
      includeFiles: "public/**",
    },
  },
  headers: [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate",
        },
      ],
    },
    ...(isPreviewDeployment
      ? [
          {
            source: "/(.*)",
            headers: [
              {
                key: "X-Robots-Tag",
                value: "noindex, nofollow",
              },
            ],
          },
        ]
      : []),
  ],
};
