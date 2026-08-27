import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("platform owner control visibility", () => {
  it("uses the server-confirmed owner-access result rather than the broad global-admin UI role", () => {
    expect(home).toContain("trpc.nsos.platform.ownerAccess.useQuery");
    expect(home).toContain("const platformAdmin = platformOwnerQuery.data?.isPlatformOwner === true;");
    expect(home).not.toContain("const platformAdmin = user.role === \"admin\";");
  });

  it("keeps the affiliate control nested within the server-confirmed platform-owner visibility condition", () => {
    expect(home).toContain("{platformAdmin && <><button onClick={() => setAffiliatePilotOpen(true)}");
    expect(home).toContain("{platformAdmin && <AffiliatePilotConsole");
  });
});
