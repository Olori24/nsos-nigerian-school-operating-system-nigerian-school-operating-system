import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(process.cwd());
const publicRoot = path.join(projectRoot, "client", "public");
const staticServerSource = readFileSync(
  path.join(projectRoot, "server", "_core", "vite.ts"),
  "utf8"
);
const viteConfigSource = readFileSync(path.join(projectRoot, "vite.config.ts"), "utf8");
const vercelConfigSource = readFileSync(path.join(projectRoot, "vercel.json"), "utf8");

const discoveryFiles = [
  {
    name: "robots.txt",
    contentType: "text/plain",
    requiredContent: ["User-agent: *", "Sitemap: https://nsos.top/sitemap.xml"],
  },
  {
    name: "sitemap.xml",
    contentType: "application/xml",
    requiredContent: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "https://nsos.top/",
      "https://nsos.top/faq",
    ],
  },
  {
    name: "llms.txt",
    contentType: "text/plain",
    requiredContent: [
      "# NSOS — Nigerian School Operating System",
      "https://nsos.top/",
      "Do not infer customer counts",
    ],
  },
] as const;

describe("public discovery file serving", () => {
  it.each(discoveryFiles)("ships a valid $name static asset", file => {
    const assetPath = path.join(publicRoot, file.name);
    expect(existsSync(assetPath)).toBe(true);

    const content = readFileSync(assetPath, "utf8");
    expect(content.trim()).not.toContain("<!doctype html>");
    for (const requiredContent of file.requiredContent) {
      expect(content).toContain(requiredContent);
    }

    expect(file.contentType).toMatch(/^(text\/plain|application\/xml)$/);
  });

  it("builds assets into the Vercel CDN directory and bundles them for the Express SPA fallback", () => {
    expect(viteConfigSource).toContain('outDir: path.resolve(import.meta.dirname, "public")');
    expect(staticServerSource).toContain('path.resolve(process.cwd(), "public")');
    expect(vercelConfigSource).toContain('"includeFiles": "public/**"');
  });

  it("serves static assets before the SPA fallback", () => {
    const staticMiddleware = staticServerSource.indexOf("express.static(distPath");
    const spaFallback = staticServerSource.indexOf('app.use("*", (_req, res) =>');

    expect(staticMiddleware).toBeGreaterThanOrEqual(0);
    expect(spaFallback).toBeGreaterThan(staticMiddleware);
  });
});
