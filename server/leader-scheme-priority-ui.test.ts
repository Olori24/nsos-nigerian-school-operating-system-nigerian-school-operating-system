import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const controls = readFileSync(resolve(root, "client/src/components/SchemeRevisionPriorityControls.tsx"), "utf8");

describe("school leader revision priority controls", () => {
  it("uses management-only alert contracts and gives leaders explicit recommend and clear actions", () => {
    expect(controls).toContain("schemeRevisionNotificationsForManagement.useQuery");
    expect(controls).toContain("setSchemeRevisionNotificationRecommended.useMutation");
    expect(controls).toContain("Recommend priority");
    expect(controls).toContain("Clear priority");
  });

  it("explains that recommendations do not replace a teacher’s personal pin", () => {
    expect(controls).toContain("does not publish, approve, or replace a teacher’s personal pin");
  });

  it("offers an optional local-time expiry and explains the automatic clearing behavior", () => {
    expect(controls).toContain("Optional priority expiry");
    expect(controls).toContain('type="datetime-local"');
    expect(controls).toContain("a future expiry clears it automatically");
    expect(controls).toContain("Auto-clears");
  });
});
