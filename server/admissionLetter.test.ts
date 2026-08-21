import { describe, expect, it } from "vitest";
import { buildAdmissionLetter } from "./admissionLetter";

describe("admission letter generation", () => {
  it("creates a branded, parent-addressed letter with the confirmed enrollment details", () => {
    const letter = buildAdmissionLetter({ schoolName: "Greener Future Academy", schoolAddress: "Abeokuta, Ogun State", guardianName: "Mrs. Okafor", studentName: "Amina Chiamaka Okafor", admissionNo: "GFA/2026/014", className: "Primary 1", sessionName: "2026/2027 Session", admittedOn: "2026-09-01" });
    expect(letter.subject).toContain("admission confirmation for Amina Chiamaka Okafor");
    expect(letter.text).toContain("Admission number: GFA/2026/014");
    expect(letter.text).toContain("Academic session: 2026/2027 Session");
    expect(letter.html).toContain("Greener Future Academy");
  });

  it("escapes unsafe markup from school-provided or applicant-provided letter content", () => {
    const letter = buildAdmissionLetter({ schoolName: "School <script>", guardianName: "Amina <img>", studentName: "Learner", admissionNo: "NSOS/1", className: "JSS 1", sessionName: "2026/2027", admittedOn: "2026-09-01" });
    expect(letter.html).not.toContain("<script>");
    expect(letter.html).not.toContain("<img>");
  });
});
