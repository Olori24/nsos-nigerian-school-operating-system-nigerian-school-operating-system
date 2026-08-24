import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const builder = readFileSync(resolve(root, "client/src/components/InstitutionBuilder.tsx"), "utf8");

describe("Institution Builder interface", () => {
  it("mounts the School Builder as the primary owner/admin overview while retaining the protected Automation Desk", () => {
    expect(home).toContain('id: "institution-builder", label: "Create with AI"');
    expect(home).toContain('view === "institution-builder"');
    expect(home).toContain('<InstitutionBuilder schoolId={schoolId} onNavigate={onNavigate} />');
    expect(home).toContain("BuilderFirstOwnerOverview");
    expect(home).toContain("Run your institution");
    expect(home).toContain('roles: ["owner", "admin"]');
    expect(home).toContain('id: "automation", label: "Automation Desk"');
  });

  it("presents a one-prompt private blueprint, truthful preparation stages, and no sensitive-data instruction", () => {
    expect(builder).toContain("Create my institution with AI");
    expect(builder).toContain("What do you want to build?");
    expect(builder).toContain("Build my institution");
    expect(builder).toContain("Start from a template");
    expect(builder).toContain("AI Academy");
    expect(builder).toContain("Refine without replacing this version");
    expect(builder).toContain("Prepare new version");
    expect(builder).toContain("Owner-requested private refinement");
    expect(builder).toContain("Understanding your idea");
    expect(builder).toContain("Preparing your review blueprint");
    expect(builder).toContain("Do not include passwords, bank details, provider keys, learner records, staff identities");
    expect(builder).toContain("Your full prompt is used to prepare this private blueprint and is not retained in the operational audit record.");
  });

  it("replaces a raw non-JSON parsing failure with a safe mobile recovery state", () => {
    expect(builder).toContain("formatInstitutionBuilderError");
    expect(builder).toContain('role="alert"');
    expect(builder).toContain("Your private blueprint was not created");
    expect(builder).toContain("Your idea was not applied, published, or added to an operational audit record.");
    expect(builder).toContain("Reload NSOS and try again");
  });

  it("requires visible confirmation for private edits and the limited learning-foundation application", () => {
    expect(builder).toContain("Edit your private blueprint");
    expect(builder).toContain("Saving them does not publish or activate anything.");
    expect(builder).toContain("Save private blueprint edits");
    expect(builder).toContain("Save only the unpublished website draft");
    expect(builder).toContain("I approve saving this unpublished website draft only.");
    expect(builder).toContain("Save unpublished website draft");
    expect(builder).toContain("saveWebsiteDraft.mutate({ schoolId, blueprintId: activeId, confirmed: true })");
    expect(builder).toContain("I approve this private internal learning-draft application only.");
    expect(builder).toContain("Approve internal learning foundation");
    expect(builder).toContain("apply.mutate({ schoolId, blueprintId: activeId, confirmed: true })");
  });

  it("keeps admissions, pricing, website, communications, and tutor work as direct protected handoffs rather than hidden autonomous actions", () => {
    expect(builder).toContain("Direct next steps—not hidden automation");
    expect(builder).toContain("onNavigate(handoff.destination)");
    expect(builder).toContain('type Destination = "learning" | "website" | "admissions" | "finance" | "communications" | "advertising" | "ai-tutors"');
    expect(builder).toContain("lifecycleHandoffs.map");
  });

  it("states that a blueprint cannot publish, create people, enrol learners, send messages, collect payment, award credentials, grade, complete, or change provider/domain settings", () => {
    expect(builder).toContain("never publishes, creates people, admits or enrols learners, sends messages, activates fees, collects payments, awards certificates, grades work, or changes providers or domains");
    expect(builder).toContain("It does not create a brand asset, website, admissions, people, fees, payments, campaigns, messages, certificates, grades, completion, public content, or provider settings.");
    expect(builder).toContain("not a public website, active programme, price, admission flow, or student experience");
    expect(builder).toContain("Meaningful private learning plan");
    expect(builder).toContain("Quality and launch readiness");
  });

  it("shows private brand and growth planning without representing assets, pricing, campaigns, leads, or automation as live", () => {
    expect(builder).toContain("Private brand and logo direction");
    expect(builder).toContain("Private offer and growth foundation");
    expect(builder).toContain("{brandKit.assetBoundary}");
    expect(builder).toContain("{growthPlan.boundary}");
    expect(builder).toContain("No price or payment created");
  });
});
