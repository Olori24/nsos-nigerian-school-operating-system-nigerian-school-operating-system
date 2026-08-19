import { describe, expect, it } from "vitest";
import { CLEAR_FORM_DESCRIPTION, CLEAR_FORM_TITLE } from "../client/src/components/ClearFormConfirmation";

describe("clear-form confirmation", () => {
  it("requires a destructive-action confirmation that names both entered values and the local draft", () => {
    expect(CLEAR_FORM_TITLE).toBe("Clear this biodata form?");
    expect(CLEAR_FORM_DESCRIPTION).toContain("every field you entered");
    expect(CLEAR_FORM_DESCRIPTION).toContain("saved draft from this browser");
    expect(CLEAR_FORM_DESCRIPTION).toContain("cannot be undone");
  });
});
