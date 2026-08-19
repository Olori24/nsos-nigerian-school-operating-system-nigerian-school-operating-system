export type OriginLgaLoadState = "choose-state" | "loading" | "error" | "ready";

export function originLgaLoadPresentation(input: { stateOfOrigin?: string; isLoading: boolean; isError: boolean }) {
  const stateOfOrigin = input.stateOfOrigin?.trim();
  if (!stateOfOrigin) return { state: "choose-state" as const, selectPlaceholder: "Select State of Origin first", message: null };
  if (input.isLoading) return { state: "loading" as const, selectPlaceholder: "Loading Local Government Areas…", message: `Loading Local Government Areas for ${stateOfOrigin}…` };
  if (input.isError) return { state: "error" as const, selectPlaceholder: "LGA options are unavailable", message: `We could not load Local Government Areas for ${stateOfOrigin}. Check your connection and try again.` };
  return { state: "ready" as const, selectPlaceholder: "Select Local Government Area", message: null };
}
