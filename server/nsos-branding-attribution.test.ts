import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoot = resolve(import.meta.dirname, "../client/src");

function visibleSource(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return visibleSource(path);
    return /\.(tsx|ts|css|html)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}

describe("NSOS interface branding", () => {
  it("uses the supplied NSOS Digital School Operations artwork in the app brand", () => {
    const homeSource = readFileSync(resolve(clientRoot, "pages/Home.tsx"), "utf8");
    expect(homeSource).toContain(
      'src="/manus-storage/1000033458_785cbbbc.png"',
    );
    expect(homeSource).toContain("Digital School Operations");
  });

  it("does not include third-party made-by or powered-by attribution text in the managed interface", () => {
    const source = visibleSource(clientRoot).join("\n");
    expect(source).not.toMatch(/made by\s+manus/i);
    expect(source).not.toMatch(/powered by\s+manus/i);
  });
});
