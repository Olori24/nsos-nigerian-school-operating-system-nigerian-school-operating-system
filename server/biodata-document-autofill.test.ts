import { beforeEach, describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => llm);

import { extractBiodataFromDocument } from "./db";

describe("biodata document auto-fill extraction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns sanitized suggestions for review without retaining the document", async () => {
    llm.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ firstName: " Ada ", lastName: "Okafor", dateOfBirth: "2014-03-10", gender: "female", residentialAddress: "12 School Road", priorSchool: "Bright Start", guardianName: "Ifeoma Okafor", guardianPhone: "08031234567", guardianEmail: "ifeoma@example.ng", stateOfOrigin: "Lagos", localGovernmentOfOrigin: "Ikeja", confidence: "medium" }) } }] });
    await expect(extractBiodataFromDocument({ base64: Buffer.from("document").toString("base64"), fileName: "id.png", mimeType: "image/png" })).resolves.toEqual(expect.objectContaining({ requiresConfirmation: true, documentStored: false, proposal: expect.objectContaining({ firstName: "Ada", dateOfBirth: "2014-03-10", confidence: "medium" }) }));
    expect(llm.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3-flash-preview", outputSchema: expect.any(Object) }));
    expect(llm.invokeLLM.mock.calls[0][0].messages[0].content).toContain("Do not return passport");
  });

  it("rejects unsupported or oversized uploads before the model is called", async () => {
    await expect(extractBiodataFromDocument({ base64: "aGVsbG8=", fileName: "id.gif", mimeType: "image/gif" as any })).rejects.toThrow("Upload a JPG, PNG, WEBP, or PDF document.");
    await expect(extractBiodataFromDocument({ base64: Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64"), fileName: "large.pdf", mimeType: "application/pdf" })).rejects.toThrow("4 MB");
    expect(llm.invokeLLM).not.toHaveBeenCalled();
  });
});
