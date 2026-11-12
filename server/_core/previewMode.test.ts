import { describe, expect, it } from "vitest";
import { isStaticOnlyPreview } from "./previewMode";

describe("static-only preview mode", () => {
  it("is enabled only for a Vercel preview with no database URL", () => {
    expect(isStaticOnlyPreview({ vercel: "1", vercelEnv: "preview" })).toBe(true);
    expect(isStaticOnlyPreview({ vercel: "1", vercelEnv: "preview", databaseUrl: "mysql://staging" })).toBe(false);
    expect(isStaticOnlyPreview({ vercel: "1", vercelEnv: "production" })).toBe(false);
    expect(isStaticOnlyPreview({ vercel: "0", vercelEnv: "preview" })).toBe(false);
    expect(isStaticOnlyPreview({ vercelEnv: "preview" })).toBe(false);
  });
});
