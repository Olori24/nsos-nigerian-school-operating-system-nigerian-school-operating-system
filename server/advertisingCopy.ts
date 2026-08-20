import { invokeLLM } from "./_core/llm";

export type AdvertisingCopyInput = {
  schoolName: string;
  objective: "lead_generation" | "website_visits" | "awareness";
  locations: string[];
  ageMin?: number;
  ageMax?: number;
  audienceNote?: string;
  guidance?: string;
};

export type AdvertisingCopySuggestion = { primaryText: string; headline: string; callToAction: "learn_more" | "apply_now" | "contact_us"; reviewNote: string };

const unsupportedClaim = /\b(guarantee(?:d)?|best school|number\s*one|#1|top[-\s]?ranked|scholarship guaranteed|government approved|accredited)\b|\b\d{1,3}%/gi;

function safeText(value: string, maxLength: number) {
  return value.replace(unsupportedClaim, "").replace(/\s{2,}/g, " ").trim().slice(0, maxLength);
}

export async function generateReviewableAdCopy(input: AdvertisingCopyInput) {
  const audience = { locations: input.locations.map(value => value.trim()).filter(Boolean).slice(0, 12), ageMin: input.ageMin, ageMax: input.ageMax, note: input.audienceNote?.trim().slice(0, 500) || "" };
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 700,
    messages: [
      { role: "system", content: "You write concise, responsible Meta ad-copy suggestions for a Nigerian school. Return suggestions only, not campaign instructions. Never state or imply guarantees, rankings, examination outcomes, scholarships, fees, accreditation, government approval, availability, or school facts that were not explicitly supplied. Never mention or infer a child, parent, family, learner, health, religion, ethnicity, disability, income, or other sensitive personal characteristic. Do not use urgency pressure, fear, discrimination, or manipulative wording. Do not fabricate testimonials, ratings, awards, statistics, or community claims. Suggestions are editable drafts for human review and must not instruct the user to launch, publish, charge, target, or change a budget. Use clear family-friendly English appropriate for a school marketing review. Return only the requested JSON." },
      { role: "user", content: `Create exactly three distinct editable copy suggestions for ${input.schoolName}. Campaign objective: ${input.objective}. Audience context: ${JSON.stringify(audience)}. Additional school-approved guidance: ${input.guidance?.trim().slice(0, 600) || "None"}. Each primaryText must be no more than 300 characters and each headline no more than 80 characters. Use only school name, supplied audience context, objective, and guidance; when facts are missing, use neutral invitations such as “Explore the school” rather than inventing details.` },
    ],
    outputSchema: {
      name: "reviewable_meta_ad_copy",
      strict: true,
      schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: { primaryText: { type: "string" }, headline: { type: "string" }, callToAction: { type: "string", enum: ["learn_more", "apply_now", "contact_us"] }, reviewNote: { type: "string" } },
              required: ["primaryText", "headline", "callToAction", "reviewNote"],
              additionalProperties: false,
            },
          },
        },
        required: ["suggestions"],
        additionalProperties: false,
      },
    },
  });
  const content = response.choices[0]?.message.content;
  const raw = typeof content === "string" ? content : (content ?? []).filter(part => part.type === "text").map(part => part.text).join("");
  let parsed: { suggestions?: AdvertisingCopySuggestion[] };
  try { parsed = JSON.parse(raw) as { suggestions?: AdvertisingCopySuggestion[] }; } catch { throw new Error("The AI copy suggestion could not be read. Try again."); }
  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length !== 3) throw new Error("The AI did not return three usable suggestions. Try again.");
  const suggestions = parsed.suggestions.map(item => ({ primaryText: safeText(String(item.primaryText ?? ""), 300), headline: safeText(String(item.headline ?? ""), 80), callToAction: ["learn_more", "apply_now", "contact_us"].includes(item.callToAction) ? item.callToAction : "learn_more" as const, reviewNote: safeText(String(item.reviewNote ?? ""), 180) })).filter(item => item.primaryText.length >= 5 && item.headline.length >= 3);
  if (suggestions.length !== 3) throw new Error("The AI suggestions did not meet NSOS review requirements. Try again.");
  return { suggestions, requiresReview: true, publishingAction: "none" as const };
}
