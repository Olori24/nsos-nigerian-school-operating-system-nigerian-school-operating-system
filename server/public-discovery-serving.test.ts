import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(process.cwd());
const publicRoot = path.join(projectRoot, "client", "public");
const staticServerSource = readFileSync(
  path.join(projectRoot, "server", "_core", "vite.ts"),
  "utf8"
);
const serverEntrySource = readFileSync(
  path.join(projectRoot, "server", "_core", "index.ts"),
  "utf8"
);

const publicLandingPages = [
  "school-management-software-nigeria",
  "online-school-admissions-nigeria",
  "school-parent-portal-nigeria",
] as const;

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
      ...publicLandingPages.map(slug => `https://nsos.top/${slug}/`),
    ],
  },
  {
    name: "llms.txt",
    contentType: "text/plain",
    requiredContent: [
      "# NSOS — Nigerian School Operating System",
      "https://nsos.top/",
      ...publicLandingPages.map(slug => `https://nsos.top/${slug}/`),
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

  it.each(publicLandingPages)("ships an indexable %s landing page", slug => {
    const pagePath = path.join(publicRoot, slug, "index.html");
    expect(existsSync(pagePath)).toBe(true);

    const html = readFileSync(pagePath, "utf8");
    expect(html).toContain(`<link rel="canonical" href="https://nsos.top/${slug}/">`);
    expect(html).toContain('<meta name="robots" content="index,follow,max-image-preview:large">');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('https://nsos.top/nsos-social.svg');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('href="/start"');
  });

  it("ships a 1200x630 NSOS social preview image", () => {
    const imagePath = path.join(publicRoot, "nsos-social.svg");
    expect(existsSync(imagePath)).toBe(true);
    const svg = readFileSync(imagePath, "utf8");
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain("Nigerian School Operating System");
  });

  it("sends route-specific noindex headers before static serving", () => {
    expect(serverEntrySource).toContain('app.use(["/app", "/start"]');
    expect(serverEntrySource).toContain('response.setHeader("X-Robots-Tag", "noindex, nofollow")');
  });

  it("serves static assets before the SPA fallback", () => {
    const staticMiddleware = staticServerSource.indexOf("express.static(distPath");
    const spaFallback = staticServerSource.indexOf('app.use("*", (_req, res) =>');

    expect(staticMiddleware).toBeGreaterThanOrEqual(0);
    expect(spaFallback).toBeGreaterThan(staticMiddleware);
  });

  it("resolves the built static directory from the project root", () => {
    expect(staticServerSource).toContain('path.resolve(process.cwd(), "dist", "public")');
  });
});
