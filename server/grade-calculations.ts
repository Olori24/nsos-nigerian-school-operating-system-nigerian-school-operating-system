export type GradeBand = {
  label: string;
  minPercentage: number;
  maxPercentage: number;
  remark?: string | null;
};

export function calculatePercentage(score: number, maximumScore: number) {
  if (!Number.isFinite(score) || !Number.isFinite(maximumScore) || maximumScore <= 0) {
    throw new Error("Maximum score must be greater than zero.");
  }
  return Number(((score / maximumScore) * 100).toFixed(2));
}

export function resolveGrade(percentage: number, scales: GradeBand[]) {
  const band = scales.find(scale => percentage >= scale.minPercentage && percentage <= scale.maxPercentage);
  return band ? { grade: band.label, remark: band.remark ?? "" } : { grade: "—", remark: "Grade scale not configured" };
}
