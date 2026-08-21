import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../client/public/manifest.webmanifest", import.meta.url), "utf8");
const worker = readFileSync(new URL("../client/public/sw.js", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../client/src/main.tsx", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../client/src/components/InstallNSOSPrompt.tsx", import.meta.url), "utf8");

describe("NSOS installable web app", () => {
  it("exposes standalone app metadata and the original app icon", () => {
    expect(html).toContain('rel="manifest"');
    expect(manifest).toContain('"display": "standalone"');
    expect(manifest).toContain('"short_name": "NSOS"');
    expect(manifest).toContain("nsos-app-icon_63fa3e89.png");
  });

  it("registers a service worker only in the production build", () => {
    expect(bootstrap).toContain('"serviceWorker" in navigator');
    expect(bootstrap).toContain("import.meta.env.PROD");
    expect(bootstrap).toContain('register("/sw.js")');
  });

  it("uses an offline shell without caching NSOS API responses", () => {
    expect(worker).toContain('"/offline.html"');
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).toContain("request.mode === \"navigate\"");
  });

  it("shows an install control only after a browser-supported install event", () => {
    expect(prompt).toContain('"beforeinstallprompt"');
    expect(prompt).toContain("event.preventDefault()");
    expect(prompt).toContain("deferredPrompt.prompt()");
    expect(prompt).toContain("nsos:pwa-install-dismissed");
  });
});
