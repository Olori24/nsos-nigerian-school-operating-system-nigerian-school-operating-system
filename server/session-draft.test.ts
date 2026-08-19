import { describe, expect, it } from "vitest";
import { readSessionDraft } from "../client/src/hooks/useSessionDraft";

describe("browser-session form drafts", () => {
  const fallback = { firstName: "", lastName: "", declarationAccepted: false };

  it("restores saved fields while retaining new fallback fields", () => {
    expect(readSessionDraft(JSON.stringify({ firstName: "Ada", declarationAccepted: true }), fallback)).toEqual({ value: { firstName: "Ada", lastName: "", declarationAccepted: true }, restored: true });
  });

  it("falls back safely when browser storage contains malformed or non-object data", () => {
    expect(readSessionDraft("{", fallback)).toEqual({ value: fallback, restored: false });
    expect(readSessionDraft(JSON.stringify(["Ada"]), fallback)).toEqual({ value: fallback, restored: false });
  });

  it("does not present an empty saved object as a recovered draft", () => {
    expect(readSessionDraft(JSON.stringify({ firstName: "", declarationAccepted: false }), fallback)).toEqual({ value: fallback, restored: false });
  });
});
