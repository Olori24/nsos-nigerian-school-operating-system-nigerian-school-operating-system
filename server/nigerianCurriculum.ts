export type NigerianCurriculumTemplateId = "basic_primary" | "basic_junior_secondary" | "senior_secondary_review";

export type NigerianCurriculumTemplate = {
  id: NigerianCurriculumTemplateId;
  framework: "nerdc_basic" | "nerdc_senior";
  name: string;
  levelLabel: string;
  sourceUrl: string;
  reviewNote: string;
  subjects: Array<{ code: string; name: string; optional?: boolean }>;
};

export const NERDC_BASIC_SOURCE_URL = "https://www.nerdc.gov.ng/content_manager/new_curriculum_home.html";
export const NERDC_SENIOR_SOURCE_URL = "https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html";

const basicSubjects = [
  { code: "ENG", name: "English Studies" },
  { code: "MAT", name: "Mathematics" },
  { code: "NIGLANG", name: "Nigerian Language" },
  { code: "BST", name: "Basic Science and Technology" },
  { code: "RNV", name: "Religion and National Values" },
  { code: "CCA", name: "Cultural and Creative Arts" },
  { code: "ARA", name: "Arabic Language", optional: true },
] as const;

export const NIGERIAN_CURRICULUM_TEMPLATES: NigerianCurriculumTemplate[] = [
  {
    id: "basic_primary",
    framework: "nerdc_basic",
    name: "NERDC Basic Education — Primary",
    levelLabel: "Primary 1–6",
    sourceUrl: NERDC_BASIC_SOURCE_URL,
    reviewNote: "Select the Nigerian language and optional offerings that match your school community before applying.",
    subjects: [...basicSubjects],
  },
  {
    id: "basic_junior_secondary",
    framework: "nerdc_basic",
    name: "NERDC Basic Education — Junior Secondary",
    levelLabel: "JSS 1–3",
    sourceUrl: NERDC_BASIC_SOURCE_URL,
    reviewNote: "This is an editable basic-education starting point. Confirm your approved subject combination and scheme of work before applying.",
    subjects: [...basicSubjects],
  },
  {
    id: "senior_secondary_review",
    framework: "nerdc_senior",
    name: "NERDC Senior Secondary — School-reviewed starter",
    levelLabel: "SSS 1–3",
    sourceUrl: NERDC_SENIOR_SOURCE_URL,
    reviewNote: "Senior subject combinations vary by school, pathway, facilities, staffing, and examination choices. Review every item before applying.",
    subjects: [
      { code: "ENG", name: "English Language" },
      { code: "GMAT", name: "General Mathematics" },
      { code: "BIO", name: "Biology", optional: true },
      { code: "CHEM", name: "Chemistry", optional: true },
      { code: "PHY", name: "Physics", optional: true },
      { code: "ECO", name: "Economics", optional: true },
      { code: "GOV", name: "Government", optional: true },
      { code: "LIT", name: "Literature in English", optional: true },
      { code: "ACC", name: "Financial Accounting", optional: true },
      { code: "AGR", name: "Agricultural Science", optional: true },
    ],
  },
];

export function listNigerianCurriculumTemplates() {
  return NIGERIAN_CURRICULUM_TEMPLATES.map(template => ({ ...template, subjects: template.subjects.map(subject => ({ ...subject })) }));
}

export function getNigerianCurriculumTemplate(templateId: NigerianCurriculumTemplateId) {
  const template = NIGERIAN_CURRICULUM_TEMPLATES.find(item => item.id === templateId);
  if (!template) throw new Error("Select a supported Nigerian curriculum template.");
  return template;
}
