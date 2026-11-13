import { readFileSync } from "node:fs";

const html = readFileSync("dist/public/index.html", "utf8");

if (!html.includes('<div id="root"></div>')) {
  throw new Error("Production HTML is missing the React root element.");
}

if (!/<script[^>]+type="module"[^>]+src=/.test(html)) {
  throw new Error("Production HTML is missing the Vite application entry point.");
}

if (/manus-runtime|__manus__\/debug-collector/i.test(html)) {
  throw new Error("Production HTML unexpectedly contains Manus runtime/debug scripts.");
}

console.log("Vercel production HTML check passed: React entry point present; Manus scripts absent.");
