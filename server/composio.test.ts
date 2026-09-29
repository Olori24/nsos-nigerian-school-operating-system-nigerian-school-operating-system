import { describe, expect, it } from "vitest";

import { buildComposioRequest } from "./composio";

describe("Composio action adapter", () => {
  it("builds a scoped execution request without touching Resend", () => {
    const request = buildComposioRequest({
      toolSlug: "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND",
      userId: "school-demo",
      connectedAccountId: "ca_demo",
      version: "20260901_00",
      arguments: {
        spreadsheetId: "sheet-id",
        range: "Audit!A:D",
        values: [["school-1", "school.created", "success", "demo"]],
        valueInputOption: "USER_ENTERED",
      },
    });

    expect(request.url).toContain(
      "/tools/execute/GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND",
    );
    expect(request.headers["x-api-key"]).toBe("");
    expect(request.body).toEqual({
      user_id: "school-demo",
      connected_account_id: "ca_demo",
      version: "20260901_00",
      arguments: {
        spreadsheetId: "sheet-id",
        range: "Audit!A:D",
        values: [["school-1", "school.created", "success", "demo"]],
        valueInputOption: "USER_ENTERED",
      },
    });
  });

  it("rejects an action without a tool slug", () => {
    expect(() => buildComposioRequest({ toolSlug: "" })).toThrow(
      "Composio tool slug is required.",
    );
  });
});
