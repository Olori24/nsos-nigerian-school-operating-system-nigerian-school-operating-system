export type AdmissionLetterInput = {
  schoolName: string;
  schoolAddress?: string | null;
  guardianName: string;
  studentName: string;
  admissionNo: string;
  className: string;
  sessionName: string;
  admittedOn: string;
};

function clean(value: string | null | undefined, limit: number) {
  return value?.replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || "";
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function letterDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(date);
}

export function buildAdmissionLetter(input: AdmissionLetterInput) {
  const schoolName = clean(input.schoolName, 255);
  const schoolAddress = clean(input.schoolAddress, 255);
  const guardianName = clean(input.guardianName, 255);
  const studentName = clean(input.studentName, 255);
  const admissionNo = clean(input.admissionNo, 64);
  const className = clean(input.className, 120);
  const sessionName = clean(input.sessionName, 120);
  const admittedOn = letterDate(input.admittedOn);
  const subject = `${schoolName}: admission confirmation for ${studentName}`;
  const text = `${schoolName}\n${schoolAddress ? `${schoolAddress}\n` : ""}\n${admittedOn}\n\nDear ${guardianName},\n\nWe are pleased to confirm ${studentName}'s admission to ${schoolName}.\n\nAdmission number: ${admissionNo}\nFirst class: ${className}\nAcademic session: ${sessionName}\nAdmission date: ${admittedOn}\n\nPlease contact the school if any approved admission detail needs correction.\n\nYours faithfully,\n${schoolName}`;
  const html = `<main style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;color:#24352d;line-height:1.55"><header style="border-bottom:3px solid #0f5c4f;padding:24px 0 16px"><h1 style="margin:0;color:#0f5c4f;font-size:24px">${escapeHtml(schoolName)}</h1>${schoolAddress ? `<p style="margin:6px 0 0;color:#617168;font-size:13px">${escapeHtml(schoolAddress)}</p>` : ""}</header><p style="margin-top:26px">${escapeHtml(admittedOn)}</p><p>Dear ${escapeHtml(guardianName)},</p><p>We are pleased to confirm <strong>${escapeHtml(studentName)}</strong>'s admission to ${escapeHtml(schoolName)}.</p><section style="margin:22px 0;padding:18px;border:1px solid #d8e4da;border-radius:10px;background:#f7fbf7"><p style="margin:0 0 8px"><strong>Admission number:</strong> ${escapeHtml(admissionNo)}</p><p style="margin:0 0 8px"><strong>First class:</strong> ${escapeHtml(className)}</p><p style="margin:0"><strong>Academic session:</strong> ${escapeHtml(sessionName)}</p></section><p>Please contact the school if any approved admission detail needs correction.</p><p>Yours faithfully,<br/><strong>${escapeHtml(schoolName)}</strong></p></main>`;
  return { subject, text, html };
}
