import { describe, expect, it } from "vitest";
import { suggestedFieldKeys } from "../client/src/components/AiAppliedFieldCue";

describe("AI-applied biodata field cues", () => {
  it("marks only non-empty approved suggestions for review", () => {
    const fields = suggestedFieldKeys({ firstName: "Ada", guardianPhone: "08031234567", priorSchool: "   ", ignored: 4 });
    expect(Array.from(fields)).toEqual(["firstName", "guardianPhone"]);
  });
});
