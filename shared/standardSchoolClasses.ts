export const standardSchoolClasses = [
  { name: "Basic 1", level: "Basic" },
  { name: "Basic 2", level: "Basic" },
  { name: "Basic 3", level: "Basic" },
  { name: "Basic 4", level: "Basic" },
  { name: "Basic 5", level: "Basic" },
  { name: "Basic 6", level: "Basic" },
  { name: "JSS 1", level: "Junior secondary" },
  { name: "JSS 2", level: "Junior secondary" },
  { name: "JSS 3", level: "Junior secondary" },
  { name: "SS 1", level: "Senior secondary" },
  { name: "SS 2", level: "Senior secondary" },
  { name: "SS 3", level: "Senior secondary" },
] as const;

export type StandardSchoolClass = (typeof standardSchoolClasses)[number];
