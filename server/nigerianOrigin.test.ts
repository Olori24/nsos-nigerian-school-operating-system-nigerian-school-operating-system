import { describe, expect, it } from "vitest";
import { listNigerianLgas, listNigerianOriginStates, normaliseNigerianOrigin } from "./nigerianOrigin";

describe("Nigerian origin normalization", () => {
  it("provides a stable nationwide State list and LGAs for a selected State", () => {
    const states = listNigerianOriginStates();
    expect(states).toContain("Lagos");
    expect(states).toContain("Federal Capital Territory");
    expect(new Set(states).size).toBe(states.length);
    expect(listNigerianLgas("Lagos").length).toBeGreaterThan(0);
  });

  it("normalizes a state and only accepts an LGA associated with that State", () => {
    const stateOfOrigin = "Lagos";
    const localGovernmentOfOrigin = listNigerianLgas(stateOfOrigin)[0];
    expect(normaliseNigerianOrigin({ stateOfOrigin: " lagos ", localGovernmentOfOrigin: localGovernmentOfOrigin.toUpperCase() })).toEqual({ stateOfOrigin, localGovernmentOfOrigin });
    expect(normaliseNigerianOrigin({ stateOfOrigin })).toEqual({ stateOfOrigin, localGovernmentOfOrigin: undefined });
    expect(() => normaliseNigerianOrigin({ localGovernmentOfOrigin })).toThrow("Select a State of Origin");
    expect(() => normaliseNigerianOrigin({ stateOfOrigin, localGovernmentOfOrigin: "Not a Lagos LGA" })).toThrow("belongs to the selected State");
  });
});
