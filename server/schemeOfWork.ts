export type ReviewedSchemeRow = { weekNo: number; topic: string; objectives?: string; resources?: string };

export const SUPPORTED_SCHEME_MIME_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const MAX_SCHEME_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SCHEME_ROWS = 60;

export function normaliseReviewedSchemeRows(rows: ReviewedSchemeRow[]) {
  if (!rows.length) throw new Error("The reviewed scheme does not contain any importable rows.");
  if (rows.length > MAX_SCHEME_ROWS) throw new Error(`Import up to ${MAX_SCHEME_ROWS} scheme rows at a time.`);
  const seenWeeks = new Set<number>();
  return rows.map((row, index) => {
    const weekNo = Number(row.weekNo);
    const topic = row.topic?.trim();
    const objectives = row.objectives?.trim() || undefined;
    const resources = row.resources?.trim() || undefined;
    if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 20) throw new Error(`Row ${index + 1} needs a week number from 1 to 20.`);
    if (seenWeeks.has(weekNo)) throw new Error(`Week ${weekNo} appears more than once. Review the scheme before importing.`);
    if (!topic || topic.length > 255) throw new Error(`Row ${index + 1} needs a topic between 1 and 255 characters.`);
    if (objectives && objectives.length > 5000) throw new Error(`Row ${index + 1} has objectives that are too long.`);
    if (resources && resources.length > 5000) throw new Error(`Row ${index + 1} has resources that are too long.`);
    seenWeeks.add(weekNo);
    return { weekNo, topic, objectives, resources };
  }).sort((a, b) => a.weekNo - b.weekNo);
}

export function safeSchemeFileName(fileName: string) {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  if (!/\.(csv|xlsx)$/i.test(cleaned)) throw new Error("Upload a CSV or Excel (.xlsx) scheme-of-work file.");
  return cleaned;
}
