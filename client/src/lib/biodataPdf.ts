export type BiodataPreviewField = { label: string; value?: string | null };

export function completedBiodataFields(fields: BiodataPreviewField[]) {
  return fields.filter(field => Boolean(field.value?.trim())).map(field => ({ ...field, value: field.value!.trim() }));
}

export function biodataPdfFilename(title: string) {
  const stem = title.toLocaleLowerCase("en-NG").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "biodata-preview";
  return `${stem}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export async function exportBiodataPdf(input: { title: string; subtitle?: string; fields: BiodataPreviewField[] }) {
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

  doc.setFillColor(15, 92, 79); doc.rect(0, 0, pageWidth, 92, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.text("NSOS", margin, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("NIGERIAN SCHOOL OPERATING SYSTEM", margin, 59);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(input.title, margin, 78);
  y = 122;
  if (input.subtitle) write(input.subtitle, { size: 9, color: [102, 120, 109], gap: 7 });
  write(`Preview generated ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, { size: 9, color: [102, 120, 109], gap: 12 });
  rule();
  fields.forEach(field => {
    write(field.label, { size: 9, bold: true, color: [20, 74, 59], gap: 1 });
    write(field.value!, { size: 10, gap: 9 });
  });
  rule();
  write("This is a local preview of information entered in the form. It is not an admission decision, a submitted application, or an official school record.", { size: 8, color: [102, 120, 109], gap: 0 });
  doc.save(biodataPdfFilename(input.title));
}
