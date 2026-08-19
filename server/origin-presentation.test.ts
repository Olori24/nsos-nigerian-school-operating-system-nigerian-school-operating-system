import { describe, expect, it } from "vitest";
import { originLgaLoadPresentation } from "../client/src/lib/originPresentation";

describe("LGA origin loading presentation", () => {
  it("guides the user to select a State before LGA options can be loaded", () => {
    expect(originLgaLoadPresentation({ stateOfOrigin: "", isLoading: false, isError: false })).toEqual({ state: "choose-state", selectPlaceholder: "Select State of Origin first", message: null });
  });

  it("shows a state-specific loading announcement while LGA options are requested", () => {
    expect(originLgaLoadPresentation({ stateOfOrigin: "Lagos", isLoading: true, isError: false })).toEqual({ state: "loading", selectPlaceholder: "Loading Local Government Areas…", message: "Loading Local Government Areas for Lagos…" });
  });

  it("provides clear, non-technical recovery guidance when the LGA request fails", () => {
    expect(originLgaLoadPresentation({ stateOfOrigin: "Ogun", isLoading: false, isError: true })).toEqual({ state: "error", selectPlaceholder: "LGA options are unavailable", message: "We could not load Local Government Areas for Ogun. Check your connection and try again." });
  });
});
