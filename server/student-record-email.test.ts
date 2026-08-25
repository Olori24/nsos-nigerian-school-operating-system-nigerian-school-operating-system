import { describe, expect, it } from "vitest";
import { resolveStudentRecordEmailRecipient, studentRecordEmailRecipients } from "./studentRecordEmail";

describe("protected student record email recipients", () => {
  const record = {
    student: { id: 7, firstName: "Amina", lastName: "Okafor", admissionNo: "NSOS/2026/014", email: "amina@example.test" },
    guardians: [{ id: 12, firstName: "Ngozi", lastName: "Okafor", relationship: "Parent", email: "ngozi@example.test", isPrimary: true }],
    enrollments: [{ id: 91, className: "JSS 1", sessionName: "2026/2027", status: "active", enrolledOn: "2026-08-25" }],
  };

  it("offers only masked registered student and linked guardian recipients", () => {
    const recipients = studentRecordEmailRecipients(record);
    expect(recipients).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "student", maskedEmail: expect.stringContaining("@example.test") }), expect.objectContaining({ kind: "guardian", guardianId: 12, maskedEmail: expect.stringContaining("@example.test") })]));
    expect(JSON.stringify(recipients)).not.toContain("amina@example.test");
    expect(JSON.stringify(recipients)).not.toContain("ngozi@example.test");
  });

  it("refuses an unlinked guardian recipient", () => {
    expect(() => resolveStudentRecordEmailRecipient(record, { kind: "guardian", guardianId: 99 })).toThrow(/registered email address/i);
  });
});
