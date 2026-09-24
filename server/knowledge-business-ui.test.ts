import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../client/src/components/KnowledgeBusinessEngine.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("Knowledge-to-Business interface", () => {
  it("is an owner/admin-only command-center workspace with private text-first source boundaries", () => {
    expect(home).toContain('id: "knowledge-business", label: "Knowledge to business"');
    expect(home).toContain('role === "owner" || role === "admin" ? <KnowledgeBusinessEngine');
    expect(component).toContain("Knowledge-to-Business Engine");
    expect(component).toContain("Text-first by design");
    expect(component).toContain("Only add material you own or are authorised to use.");
    expect(component).toContain("student or guardian records");
  });

  it("keeps analysis and Builder handoff explicitly confirmed with no public, financial, academic, or automation effect", () => {
    expect(component).toContain("analysis is private planning only");
    expect(component).toContain("will not create or change a programme, learner, public page, price, campaign, payment, credential, or message");
    expect(component).toContain("Prepare a separate private Institution Builder blueprint");
    expect(component).toContain("does not apply a programme, save a website, set a price, create a campaign, lead, message, admission, enrolment, payment, assessment, result, completion, credential, portfolio, or public content");
    expect(component).toContain("It does not run in the background.");
    expect(component).toContain("Open protected workspaces—nothing is applied here");
    expect(component).toContain('onNavigate("learning")');
    expect(component).toContain('onNavigate("website")');
    expect(component).toContain('onNavigate("advertising")');
    expect(component).toContain('onNavigate("ai-tutors")');
    expect(component).toContain("They only navigate and never save, publish, create a campaign, spend, message, enrol, assess, grade, complete, or change learner records.");
  });

  it("lets an owner inspect and confirmed-delete their stored source and analyses", () => {
    expect(component).toContain("Inspect and delete stored material");
    expect(component).toContain("permanently deletes this private source, its analyses, and its lineage");
    expect(component).toContain("deleteSource.mutate({ schoolId, sourceId: selectedSource.id, confirmed: true })");
  });

  it("offers a clear owner-confirmed File-to-School path with honest supported-format and provenance boundaries", () => {
    expect(component).toContain("File-to-School private library");
    expect(component).toContain("Build from my knowledge file");
    expect(component).toContain("TXT · Markdown · small CSV");
    expect(component).toContain("Not parsed here: PDF, DOCX, PPTX, images, audio, video, or webpages");
    expect(component).toContain("uploadAndAnalyse.mutate");
    expect(component).toContain("Source lineage and review boundary");
    expect(component).toContain("No external research or verification was added in this analysis.");
    expect(component).toContain("private review cue, not an academic score, accreditation, or outcome claim");
    expect(component).toContain("Create a reviewed source revision");
    expect(component).toContain("revise.mutate({ schoolId, sourceId: source.id");
  });
});
