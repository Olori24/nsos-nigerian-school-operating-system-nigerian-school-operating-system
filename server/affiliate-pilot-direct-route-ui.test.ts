import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
describe("affiliate pilot direct owner route", () => {
  it("registers an authenticated direct route with a protected owner-access check", () => {
    expect(app).toContain('path="/platform/affiliate-pilot"');
    expect(app).toContain("trpc.nsos.platform.ownerAccess.useQuery");
    expect(app).toContain("Platform owner access required");
    expect(app).toContain("<AffiliatePilotConsole open");
  });

  it("keeps the route inside the NSOS platform-host router rather than the tenant-domain resolver", () => {
    expect(app).toContain("if (typeof window !== \"undefined\" && !isNsosPlatformHost(window.location.hostname)) return <DomainSchoolWebsite />;");
    expect(app).toContain('<Route path="/platform/affiliate-pilot" component={AffiliatePilotRoute} />');
  });
});
