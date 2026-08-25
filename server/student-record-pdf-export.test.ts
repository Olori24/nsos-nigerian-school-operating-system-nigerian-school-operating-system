import { describe, expect, it } from "vitest";
import { studentRecordPdfFields, studentRecordPdfFilename } from "../client/src/lib/studentRecordPdf";

describe("student record PDF export helpers", () => {
  const record = {
    student: { firstName: "Amina", middleName: "B.", lastName: "Okafor", admissionNo: "NSOS/2026/014", status: "active" },
    guardians: [{ firstName: "Ngozi", lastName: "Okafor", relationship: "Parent", isPrimary: true }],
    enrollment: { id: 91, className: "JSS 1", sessionName: "2026/2027", status: "active", enrolledOn: "2026-08-25T00:00:00.000Z" },
  };

  it("formats only the loaded student, guardian, and exact enrollment fields for export", () => {
    const fields = studentRecordPdfFields(record);
    expect(fields).toContainEqual({ label: "Student", value: "Amina B. Okafor" });
    expect(fields).toContainEqual({ label: "Admission number", value: "NSOS/2026/014" });
    expect(fields).toContainEqual({ label: "Primary guardian", value: "Ngozi Okafor" });
    expect(fields).toContainEqual({ label: "Enrollment ID", value: "91" });
    expect(fields).toContainEqual({ label: "Class", value: "JSS 1" });
  });

  it("creates a safe filename from the already authorized admission number", () => {
    expect(studentRecordPdfFilename("NSOS/2026/014")).toMatch(/^nsos-2026-014-student-enrollment-record-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
