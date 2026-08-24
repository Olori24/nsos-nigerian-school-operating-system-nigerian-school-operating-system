import { describe, expect, it } from "vitest";
import { DEFAULT_OPERATIONAL_LIST_LIMIT, MAX_OPERATIONAL_LIST_LIMIT, boundedOperationalListLimit } from "./db";

describe("operational list limits", () => {
  it("uses a conservative default and never permits an unbounded or oversized dashboard list", () => {
    expect(boundedOperationalListLimit(undefined)).toBe(DEFAULT_OPERATIONAL_LIST_LIMIT);
    expect(boundedOperationalListLimit(12)).toBe(12);
    expect(boundedOperationalListLimit(10_000)).toBe(MAX_OPERATIONAL_LIST_LIMIT);
    expect(boundedOperationalListLimit(0)).toBe(1);
  });
});
