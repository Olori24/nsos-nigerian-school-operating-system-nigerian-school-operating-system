import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const workspace = readFileSync(resolve(root, "client/src/components/LearningOperationsWorkspace.tsx"), "utf8");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

describe("Learning operations workspace interface", () => {
  it("exposes programme operations only through the owner/admin navigation route", () => {
    expect(home).toContain('{ id: "learning", label: "Programmes"');
    expect(home).toContain('role === "owner" || role === "admin" ? <LearningOperationsWorkspace');
  });

  it("keeps programme actions draft-first and confirmation-gated", () => {
    expect(workspace).toContain("Create programme draft");
    expect(workspace).toContain("Activate internally");
    expect(workspace).toContain("confirmed: true");
    expect(workspace).toContain("Create planning cohort");
    expect(workspace).toContain("Assign instructor");
    expect(workspace).toContain("Save learner enrolment");
    expect(workspace).toContain("Confirm completion");
  });

  it("provides separate confirmed programme attendance and fee-structure controls without presenting them as invoicing or payment collection", () => {
    const participation = readFileSync(resolve(root, "client/src/components/ProgramParticipationAndFees.tsx"), "utf8");
    expect(participation).toContain("Save programme attendance");
    expect(participation).toContain("Create programme fee draft");
    expect(participation).toContain("Activate internally");
    expect(participation).toContain("Invoices, payment collection, and receipt approval stay in the existing finance workflow.");
    expect(participation).toContain("confirmed: true");
  });

  it("gives a linked learner only a read-only view of their own programme progress", () => {
    const progress = readFileSync(resolve(root, "client/src/components/LearnerProgramProgress.tsx"), "utf8");
    expect(progress).toContain("My programmes");
    expect(progress).toContain("This view shows only your own enrolments and reviewed curriculum progress.");
    expect(progress).toContain("does not create a certificate or verify a credential");
    expect(home).toContain('role === "student" && <LearnerProgramProgress');
  });

  it("lets a new owner choose a real operating type during first setup without implying automatic records", () => {
    expect(home).toContain("School or organisation name");
    expect(home).toContain("Operating type");
    expect(home).toContain('value="vocational_institute"');
    expect(home).toContain('value="coaching_centre"');
    expect(home).toContain('value="online_training_provider"');
    expect(home).toContain("No staff, learners, fees, contacts, courses, or certificates are created automatically.");
  });

  it("states the hard safety boundaries for accounts, invitations, payments, public courses, and credentials", () => {
    expect(workspace).toContain("does not publish a course, collect payment, create a learner or staff account, send an invitation, issue a certificate");
    expect(workspace).toContain("No account or invitation was created.");
    expect(workspace).toContain("NSOS has not issued or verified a credential.");
  });
});
