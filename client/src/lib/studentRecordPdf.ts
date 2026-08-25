export type StudentRecordPdfInput = {
  student: { firstName: string; middleName?: string | null; lastName: string; admissionNo: string; status: string };
  guardians: Array<{ firstName: string; lastName: string; relationship?: string | null; isPrimary?: boolean | null }>;
  enrollment: { id: number; className?: string | null; sessionName?: string | null; status?: string | null; enrolledOn?: string | number | Date | null };
};

export type StudentRecordPdfField = { label: string; value: string };

const present = (value?: string | number | null, fallback = "Not recorded") => String(value ?? "").trim() || fallback;

export function studentRecordPdfFilename(admissionNo: string) {
  const stem = admissionNo.toLocaleLowerCase("en-NG").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student-record";
  return `${stem}-student-enrollment-record-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export function studentRecordPdfFields(input: StudentRecordPdfInput): StudentRecordPdfField[] {
  const studentName = [input.student.firstName, input.student.middleName, input.student.lastName].filter(Boolean).join(" ");
  const primaryGuardian = input.guardians.find(guardian => guardian.isPrimary) ?? input.guardians[0];
  const enrolledOn = input.enrollment.enrolledOn ? new Date(input.enrollment.enrolledOn).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "Not recorded";
  return [
    { label: "Student", value: present(studentName) },
    { label: "Admission number", value: present(input.student.admissionNo) },
    { label: "Student status", value: present(input.student.status) },
    { label: "Primary guardian", value: primaryGuardian ? `${present(primaryGuardian.firstName)} ${present(primaryGuardian.lastName)}`.trim() : "Not linked" },
    { label: "Guardian relationship", value: present(primaryGuardian?.relationship) },
    { label: "Enrollment ID", value: String(input.enrollment.id) },
    { label: "Class", value: present(input.enrollment.className) },
    { label: "Session", value: present(input.enrollment.sessionName) },
    { label: "Enrollment status", value: present(input.enrollment.status) },
    { label: "Enrolled on", value: enrolledOn },
  ];
}

export async function exportStudentRecordPdf(input: StudentRecordPdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 42;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 54;
  const ensureSpace = (needed = 26) => { if (y + needed > pageHeight - 48) { doc.addPage(); y = 50; } };
  const write = (text: string, options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    ensureSpace(lines.length * (size + 4) + 4);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? [47, 71, 59]));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + (options.gap ?? 7);
  };

  doc.setFillColor(15, 92, 79);
  doc.rect(0, 0, pageWidth, 116, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text("NSOS", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 239, 225);
  doc.text("NIGERIAN SCHOOL OPERATING SYSTEM", margin, 57);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Student profile & enrollment record", margin, 84);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 239, 225);
  doc.text(`Exported ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, margin, 101);
  y = 146;
  write("This PDF contains only the tenant-scoped student and enrollment information currently authorized in NSOS.", { size: 9, color: [102, 120, 109], gap: 13 });
  studentRecordPdfFields(input).forEach(field => {
    write(field.label, { size: 9, bold: true, color: [20, 74, 59], gap: 1 });
    write(field.value, { size: 10, gap: 9 });
  });
  doc.setDrawColor(220, 230, 222);
  ensureSpace(18);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;
  write("This export is a protected record view. It does not create or change an enrollment, admission decision, payment, receipt, certificate, or communication.", { size: 8, color: [102, 120, 109], gap: 0 });
  doc.save(studentRecordPdfFilename(input.student.admissionNo));
}
