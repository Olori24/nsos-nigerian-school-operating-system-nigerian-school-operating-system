import { describe, expect, it } from "vitest";
import { extractInstitutionKnowledgeUploadText } from "./db";

describe("File-to-School supported text extraction", () => {
  it("extracts bounded UTF-8 markdown and normalises small CSV without attempting unsupported media parsing", () => {
    expect(extractInstitutionKnowledgeUploadText({ base64: Buffer.from("# Topic\nA practical learning outcome.", "utf8").toString("base64"), fileName: "curriculum.md", mimeType: "text/markdown" })).toContain("A practical learning outcome.");
    expect(extractInstitutionKnowledgeUploadText({ base64: Buffer.from("topic,outcome\nBudgeting,Create a budget", "utf8").toString("base64"), fileName: "curriculum.csv", mimeType: "text/csv" })).toContain("topic | outcome");
    expect(() => extractInstitutionKnowledgeUploadText({ base64: "JVBERi0=", fileName: "syllabus.pdf", mimeType: "application/pdf" })).toThrow("TXT, Markdown, and CSV");
    expect(() => extractInstitutionKnowledgeUploadText({ base64: Buffer.from("not really markdown", "utf8").toString("base64"), fileName: "curriculum.pdf", mimeType: "text/markdown" })).toThrow("filename and selected text type");
    expect(() => extractInstitutionKnowledgeUploadText({ base64: Buffer.from("text\u0000binary", "utf8").toString("base64"), fileName: "curriculum.txt", mimeType: "text/plain" })).toThrow("null-byte");
  });
});
