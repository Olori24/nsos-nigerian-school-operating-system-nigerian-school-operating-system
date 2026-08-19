import { describe, expect, it } from "vitest";
import { normalisePublicHeaderLogoUrl, publicAdmissionTemplate } from "./db";

describe("public document-template header", () => {
  it("permits only HTTPS logo URLs in the public admissions projection", () => {
    expect(normalisePublicHeaderLogoUrl("https://cdn.example.ng/logo.png")).toBe("https://cdn.example.ng/logo.png");
    expect(normalisePublicHeaderLogoUrl("http://cdn.example.ng/logo.png")).toBeNull();
    expect(normalisePublicHeaderLogoUrl("javascript:alert(1)")).toBeNull();
    expect(normalisePublicHeaderLogoUrl("not a url")).toBeNull();
  });

  it("returns the approved public letterhead text while suppressing an invalid logo", () => {
    const template = publicAdmissionTemplate({ admissionTitle: "School admission form", headerTagline: "Learning with purpose", headerLogoUrl: "http://example.ng/logo.png", headerAddressLine: "Sample campus address", headerContactLine: "0800 000 0000", admissionFields: ["dateOfBirth"], declarationText: "I confirm.", requireDeclaration: true });
    expect(template).toMatchObject({ headerLogoUrl: null, headerAddressLine: "Sample campus address", headerContactLine: "0800 000 0000", admissionFields: ["dateOfBirth"] });
  });
});
