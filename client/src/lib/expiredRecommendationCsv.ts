export type ExpiredRecommendationExportRow = {
  recipientName?: string | null;
  classLabel: string;
  subjectLabel: string;
  termLabel: string;
  expiresAt: Date | string;
  expiredAt: Date | string | null;
};

function csvCell(value: string) {
  const protectedValue = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function localDateTime(value: Date | string | null) {
  return value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
}

export function buildExpiredRecommendationCsv(rows: ExpiredRecommendationExportRow[]) {
  const header = ["Assigned teacher", "Class", "Subject", "Term", "Recommendation expiry (local time)", "Expiry recorded (local time)"];
  const lines = rows.map(row => [row.recipientName || "Assigned teacher", row.classLabel, row.subjectLabel, row.termLabel, localDateTime(row.expiresAt), localDateTime(row.expiredAt)].map(value => csvCell(value)).join(","));
  return `\ufeff${header.map(csvCell).join(",")}\r\n${lines.join("\r\n")}`;
}
