export type BiodataPreviewField = { label: string; value?: string | null };
export type BiodataPdfHeader = { organizationName?: string; tagline?: string; logoUrl?: string; completionTimestamp?: string };

export function completedBiodataFields(fields: BiodataPreviewField[]) {
  return fields.filter(field => Boolean(field.value?.trim())).map(field => ({ ...field, value: field.value!.trim() }));
}

export function biodataPdfFilename(title: string) {
  const stem = title.toLocaleLowerCase("en-NG").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "biodata-preview";
  return `${stem}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export function isHttpsLogoUrl(value?: string) {
  if (!value?.trim()) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function biodataPdfHeaderDefaults(input: BiodataPdfHeader) {
  const logoUrl = input.logoUrl?.trim();
  return {
    organizationName: input.organizationName?.trim() || "NSOS",
    tagline: input.tagline?.trim() || "NIGERIAN SCHOOL OPERATING SYSTEM",
    logoUrl: isHttpsLogoUrl(logoUrl) ? logoUrl : undefined,
  };
}

export function formatCompletionTimestamp(value?: string) {
  const timestamp = value ? new Date(value) : new Date();
  return timestamp.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

async function loadLogoData(url?: string): Promise<{ data: string; format: "PNG" | "JPEG" | "WEBP" } | null> {
  if (!url || !isHttpsLogoUrl(url)) return null;
  try {
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const format = blob.type === "image/png" ? "PNG" : blob.type === "image/webp" ? "WEBP" : blob.type === "image/jpeg" ? "JPEG" : null;
    if (!format) return null;
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
    return { data, format };
  } catch { return null; }
}

export async function exportBiodataPdf(input: { title: string; subtitle?: string; fields: BiodataPreviewField[]; header?: BiodataPdfHeader }) {
  const fields = completedBiodataFields(input.fields);
  if (!fields.length) throw new Error("Complete at least one biodata field before exporting a PDF.");
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 42;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 50;
  const ensureSpace = (needed = 22) => { if (y + needed > pageHeight - 44) { doc.addPage(); y = 48; } };
  const write = (text: string, options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    ensureSpace(lines.length * (size + 4) + 4);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? [47, 71, 59]));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + (options.gap ?? 6);
  };
  const rule = () => { ensureSpace(12); doc.setDrawColor(220, 230, 222); doc.line(margin, y, pageWidth - margin, y); y += 14; };
  const header = input.header ?? {};
  const organizationName = header.organizationName?.trim() || "NSOS";
  const logo = await loadLogoData(header.logoUrl);

  doc.setFillColor(15, 92, 79); doc.rect(0, 0, pageWidth, 116, "F");
  if (logo) doc.addImage(logo.data, logo.format, margin, 24, 50, 50);
  else { doc.setFillColor(220, 239, 225); doc.roundedRect(margin, 24, 50, 50, 10, 10, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(18, 59, 49); doc.text(organizationName.slice(0, 1).toUpperCase(), margin + 17, 56); }
  const headerX = margin + 64;
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255, 255, 255); doc.text(organizationName, headerX, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(220, 239, 225); doc.text(header.tagline?.trim() || "NIGERIAN SCHOOL OPERATING SYSTEM", headerX, 57);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.text(input.title, headerX, 83);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(220, 239, 225); doc.text(`Form completed ${formatCompletionTimestamp(header.completionTimestamp)}`, headerX, 100);
  y = 146;
  if (input.subtitle) write(input.subtitle, { size: 9, color: [102, 120, 109], gap: 7 });
  write(`PDF generated ${formatCompletionTimestamp()}`, { size: 9, color: [102, 120, 109], gap: 12 });
  rule();
  fields.forEach(field => {
    write(field.label, { size: 9, bold: true, color: [20, 74, 59], gap: 1 });
    write(field.value!, { size: 10, gap: 9 });
  });
  rule();
  write("This is a local preview of information entered in the form. It is not an admission decision, a submitted application, or an official school record.", { size: 8, color: [102, 120, 109], gap: 0 });
  doc.save(biodataPdfFilename(input.title));
}
