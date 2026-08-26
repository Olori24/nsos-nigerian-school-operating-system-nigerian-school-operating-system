import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const boundaryPath = path.resolve(process.cwd(), "client/src/components/ErrorBoundary.tsx");

describe("client error boundary", () => {
  it("does not expose JavaScript stacks in the recovery screen", () => {
    const source = fs.readFileSync(boundaryPath, "utf8");

    expect(source).not.toContain("error?.stack");
    expect(source).not.toContain("<pre");
    expect(source).toContain("Recovery reference:");
    expect(source).toContain("Your session and school records have not been changed by this screen.");
  });

  it("offers safe recovery without sending error data externally", () => {
    const source = fs.readFileSync(boundaryPath, "utf8");

    expect(source).toContain("resetBoundary");
    expect(source).toContain("NSOS home");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("navigator.sendBeacon");
  });
});
