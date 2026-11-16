import { readFileSync } from "node:fs";

const html = readFileSync("dist/public/index.html", "utf8");

if (!/<div\b(?=[^>]*\bid=["']root["'])[^>]*>/.test(html)) {
  throw new Error("Production HTML is missing the React root element.");
}

if (!/<script[^>]+type="module"[^>]+src=/.test(html)) {
  throw new Error("Production HTML is missing the Vite application entry point.");
}

console.log("Vercel production HTML check passed: React entry point present.");
