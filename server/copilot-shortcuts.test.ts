import { describe, expect, it } from "vitest";
import { getRecentSearchShortcut, isCopilotOpenShortcut } from "../client/src/lib/copilotShortcuts";

describe("Copilot keyboard shortcuts", () => {
  it("opens only for Control or Command K without competing modifier combinations", () => {
    expect(isCopilotOpenShortcut({ key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe(true);
    expect(isCopilotOpenShortcut({ key: "K", ctrlKey: false, metaKey: true, altKey: false, shiftKey: false })).toBe(true);
    expect(isCopilotOpenShortcut({ key: "k", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe(false);
    expect(isCopilotOpenShortcut({ key: "k", ctrlKey: true, metaKey: false, altKey: true, shiftKey: false })).toBe(false);
  });

  it("moves through and repeats recent searches only outside editable fields", () => {
    expect(getRecentSearchShortcut({ key: "ArrowDown", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, { isEditable: false, recentCount: 3, activeIndex: 0 })).toEqual({ type: "select", index: 1 });
    expect(getRecentSearchShortcut({ key: "ArrowUp", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, { isEditable: false, recentCount: 3, activeIndex: 0 })).toEqual({ type: "select", index: 0 });
    expect(getRecentSearchShortcut({ key: "Enter", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, { isEditable: false, recentCount: 3, activeIndex: 2 })).toEqual({ type: "repeat", index: 2 });
    expect(getRecentSearchShortcut({ key: "ArrowDown", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, { isEditable: true, recentCount: 3, activeIndex: 0 })).toEqual({ type: "none" });
  });
});
