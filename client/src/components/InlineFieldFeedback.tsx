import { CheckCircle2 } from "lucide-react";
import type { InlineValidation } from "@/lib/inlineValidation";

export function InlineFieldFeedback({ validation }: { validation?: InlineValidation }) {
  if (!validation || validation.state === "idle") return null;
  if (validation.state === "valid") return <span className="biodata-field-feedback inline-flex items-center gap-1 text-[#277543]" role="status"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">Looks good</span></span>;
  return <span role="alert" className="mt-0.5 text-[11px] font-medium leading-4 text-[#a23e36]">{validation.message}</span>;
}
