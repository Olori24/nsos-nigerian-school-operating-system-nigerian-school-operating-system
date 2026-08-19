export type CopilotShortcutEvent = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean };

export function isCopilotOpenShortcut(event: CopilotShortcutEvent) {
  return event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
}

export function getRecentSearchShortcut(event: CopilotShortcutEvent, input: { isEditable: boolean; recentCount: number; activeIndex: number }) {
  if (input.isEditable || input.recentCount < 1) return { type: "none" as const };
  if (event.key === "ArrowDown") return { type: "select" as const, index: Math.min(input.activeIndex + 1, input.recentCount - 1) };
  if (event.key === "ArrowUp") return { type: "select" as const, index: Math.max(input.activeIndex - 1, 0) };
  if (event.key === "Enter" && input.activeIndex >= 0) return { type: "repeat" as const, index: input.activeIndex };
  return { type: "none" as const };
}
