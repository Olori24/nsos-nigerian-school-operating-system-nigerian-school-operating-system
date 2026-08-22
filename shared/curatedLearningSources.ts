export type CuratedLearningSourceId = "nerdc_basic_education" | "nerdc_senior_secondary" | "unesco_ai_students";

export type CuratedLearningSource = {
  id: CuratedLearningSourceId;
  title: string;
  organisation: string;
  sourceUrl: string;
  category: "official_curriculum" | "global_pedagogy";
  allowedUse: string;
};

export const curatedLearningSources: CuratedLearningSource[] = [
  {
    id: "nerdc_basic_education",
    title: "NERDC Basic Education Curriculum",
    organisation: "Nigerian Educational Research and Development Council",
    sourceUrl: "https://www.nerdc.gov.ng/content_manager/curriculum.html",
    category: "official_curriculum",
    allowedUse: "Editable Nigeria-first reference for basic-education learning structures; owner review remains required.",
  },
  {
    id: "nerdc_senior_secondary",
    title: "NERDC Revised Senior Secondary Education Curriculum",
    organisation: "Nigerian Educational Research and Development Council",
    sourceUrl: "https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html",
    category: "official_curriculum",
    allowedUse: "Editable Nigeria-first reference for senior-secondary learning structures; owner review remains required.",
  },
  {
    id: "unesco_ai_students",
    title: "UNESCO AI Competency Framework for Students",
    organisation: "UNESCO",
    sourceUrl: "https://www.unesco.org/en/articles/ai-competency-framework-students",
    category: "global_pedagogy",
    allowedUse: "Optional global pedagogical reference for AI-literacy learning objectives and tutor-scope review; it is not Nigerian curriculum authority.",
  },
];

export function getCuratedLearningSource(id: string) {
  return curatedLearningSources.find(source => source.id === id) ?? null;
}
