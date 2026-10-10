import { describe, expect, it } from "vitest";
import { parseConfiguredPort } from "./port";

describe("configured server port", () => {
  it("defaults only when PORT is absent and accepts valid TCP ports", () => {
    expect(parseConfiguredPort(undefined)).toBe(3000);
    expect(parseConfiguredPort("3000")).toBe(3000);
    expect(parseConfiguredPort("65535")).toBe(65535);
    expect(parseConfiguredPort(" 8080 ")).toBe(8080);
  });

  it.each(["", " ", "0", "-1", "65536", "3000abc", "1.5", "1e3"])(
    "rejects invalid PORT value %j",
    value => {
      expect(() => parseConfiguredPort(value)).toThrow(/valid TCP port/);
    }
  );
});
