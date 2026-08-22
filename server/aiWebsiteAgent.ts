import { invokeLLM } from "./_core/llm";

export type AiWebsiteDraft = {
  headline: string;
  introduction: string;
  reviewNote: string;
  source: "ai" | "guided";
  requiresConfirmation: true;
};

const unsupportedClaim = /\b(best|number\s*one|#1|top[-\s]?ranked|award[-\s]?winning|guarantee(?:d)?|accredited|government approved|scholarship|100%|perfect results?|leading school)\b/gi;

function cleanPublicText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.replace(unsupportedClaim, "").replace(/[\u0000-\u001f]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, maximum) : "";
}

function fallbackDraft(input: { schoolName: string; existingHeadline?: string | null; existingIntroduction?: string | null }) : AiWebsiteDraft {
  return {
    headline: cleanPublicText(input.existingHeadline, 180) || `${input.schoolName}: learning with purpose and care.`,
    introduction: cleanPublicText(input.existingIntroduction, 1200) || "Use this website to share school-approved information about your learning community, admissions process, and how families can contact the school. Review and complete every detail before publication.",
    reviewNote: "This is an unpublished draft. Confirm every statement, contact detail, and admissions setting before you publish.",
    source: "guided",
    requiresConfirmation: true,
  };
}

export async function generateAiWebsiteDraft(input: { schoolName: string; state?: string | null; existingHeadline?: string | null; existingIntroduction?: string | null; brief: string }) {
  const fallback = fallbackDraft(input);
  try {
    const result = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 800,
      messages: [
        { role: "system", content: "You are the NSOS Website Builder. Create a concise, editable, unpublished public-school website draft using only the supplied school name, state, existing draft, and owner brief. Never invent people, staff, contact details, facilities, fees, results, rankings, awards, accreditation, approvals, availability, testimonials, reviews, safety claims, statistics, or community claims. Do not make promises or guarantees. If a fact is missing, write neutral wording that asks the owner to review or add approved details. This is not a publishing, domain, or payment action. Return only the requested JSON." },
        { role: "user", content: `School name: ${input.schoolName}\nState: ${input.state || "Not supplied"}\nExisting headline: ${input.existingHeadline || "None"}\nExisting introduction: ${input.existingIntroduction || "None"}\nOwner brief: ${input.brief.trim().slice(0, 700)}\n\nWrite a headline of 5–140 characters, an introduction of 80–900 characters, and a short reviewer note. Use plain, warm English.` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nsos_website_draft",
          strict: true,
          schema: {
            type: "object",
            properties: { headline: { type: "string" }, introduction: { type: "string" }, reviewNote: { type: "string" } },
            required: ["headline", "introduction", "reviewNote"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices[0]?.message.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "") as Record<string, unknown>;
    const headline = cleanPublicText(parsed.headline, 180);
    const introduction = cleanPublicText(parsed.introduction, 1200);
    const reviewNote = cleanPublicText(parsed.reviewNote, 240);
    if (headline.length < 5 || introduction.length < 60 || reviewNote.length < 5) return fallback;
    return { headline, introduction, reviewNote, source: "ai" as const, requiresConfirmation: true };
  } catch {
    return fallback;
  }
}
