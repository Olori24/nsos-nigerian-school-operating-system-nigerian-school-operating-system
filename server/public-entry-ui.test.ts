import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const installPromptSource = readFileSync(new URL("../client/src/components/InstallNSOSPrompt.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");

describe("public NSOS entry presentation", () => {
  it("keeps every supported learning-institution type visible without inventing user outcomes", () => {
    expect(homeSource).toContain("For every learning institution");
    expect(homeSource).toContain("Built for schools, vocational centres, coaching programmes, online providers and corporate academies.");
    expect(homeSource).toContain("Create a secure workspace");
    expect(homeSource).toContain("Connect the work that matters");
    expect(homeSource).toContain("Grow with a clear record");
  });

  it("offers only Google and email-link public sign-in choices", () => {
    expect(homeSource).toContain("Continue with Google");
    expect(homeSource).toContain("Email me a sign-in link");
    expect(homeSource).toContain("Sign in to your NSOS workspace.");
    expect(homeSource).not.toContain("Existing Manus account? Continue with Manus");
    expect(homeSource).not.toContain("startLogin()");
  });

  it("delays the optional install card so it does not compete with initial sign-in", () => {
    expect(installPromptSource).toContain("INSTALL_PROMPT_DELAY_MS = 15_000");
    expect(installPromptSource).toContain("!readyToOffer");
  });

  it("keeps nonessential fixed overlays out of the unauthenticated NSOS entry", () => {
    expect(appSource).toContain("function EntryOverlayLayer()");
    expect(appSource).toContain("if (isPublicEntry && !user) return null;");
    expect(appSource).toContain("<InstallNSOSPrompt />");
    expect(appSource).toContain("<BiodataThemeToggle />");
  });
});
