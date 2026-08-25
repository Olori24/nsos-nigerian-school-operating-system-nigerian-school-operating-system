import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dbSource = readFileSync(new URL("./db/core.ts", import.meta.url), "utf8");

describe("family portal announcement visibility", () => {
  it("limits family portal payloads to published messages for the relevant audience", () => {
    expect(dbSource).toContain("async function listFamilyPortalAnnouncements");
    expect(dbSource).toContain('eq(announcements.status, "published")');
    expect(dbSource).toContain('inArray(announcements.audience, ["everyone", audience])');
    expect(dbSource).toContain('listFamilyPortalAnnouncements(schoolId, "guardians")');
    expect(dbSource).toContain('listFamilyPortalAnnouncements(schoolId, "students")');
  });

  it("does not return school announcements when a portal identity is not linked", () => {
    expect(dbSource).toContain("announcements: []");
  });
});
