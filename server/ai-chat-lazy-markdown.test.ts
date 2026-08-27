import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chatSource = readFileSync(
  resolve(import.meta.dirname, "../client/src/components/AIChatBox.tsx"),
  "utf8"
);

describe("AI chat deferred rich rendering", () => {
  it("loads Streamdown only when an assistant reply needs rich rendering", () => {
    expect(chatSource).toContain(
      'const Streamdown = lazy(() => import("streamdown").then(module => ({ default: module.Streamdown })));'
    );
    expect(chatSource).toContain(
      "<AssistantMessageRenderBoundary content={message.content}>"
    );
    expect(chatSource).toContain("<Streamdown>{message.content}</Streamdown>");
  });

  it("keeps deferred loading and rendering failures accessible without exposing implementation details", () => {
    expect(chatSource).toContain("Formatting assistant reply…");
    expect(chatSource).toContain('role="status"');
    expect(chatSource).toContain("Formatted presentation unavailable.");
    expect(chatSource).not.toContain("error.message");
  });
});
