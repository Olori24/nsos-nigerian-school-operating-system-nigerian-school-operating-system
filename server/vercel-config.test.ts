import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function loadVercelConfig(vercelEnv: "preview" | "production") {
  const script = [
    'import { pathToFileURL } from "node:url";',
    'const { config } = await import(pathToFileURL(process.cwd() + "/vercel.mjs"));',
    "process.stdout.write(JSON.stringify(config));",
  ].join("\n");
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    env: { ...process.env, VERCEL_ENV: vercelEnv },
  });
  return JSON.parse(output.toString()) as {
    functions: Record<string, { includeFiles: string }>;
    headers: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
  };
}

describe("Vercel deployment headers", () => {
  it("bundles generated public HTML for the Express SPA fallback", () => {
    const config = loadVercelConfig("production");
    expect(config.functions["index.ts"].includeFiles).toBe("public/**");
  });

  it("adds noindex to every preview response without noindexing production", () => {
    const preview = loadVercelConfig("preview");
    const production = loadVercelConfig("production");
    const previewRobots = preview.headers.find(header => header.source === "/(.*)");
    const productionRobots = production.headers.find(header => header.source === "/(.*)");

    expect(previewRobots?.headers).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow",
    });
    expect(productionRobots).toBeUndefined();
  });

  it("keeps the service worker out of browser and CDN caches", () => {
    for (const environment of ["preview", "production"] as const) {
      const serviceWorker = loadVercelConfig(environment).headers.find(
        header => header.source === "/sw.js",
      );
      expect(serviceWorker?.headers).toContainEqual({
        key: "Cache-Control",
        value: "no-store, no-cache, must-revalidate",
      });
    }
  });
});
