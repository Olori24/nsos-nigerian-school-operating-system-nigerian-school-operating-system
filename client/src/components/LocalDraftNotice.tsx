export function LocalDraftNotice({ onClear }: { onClear: () => void }) {
  return <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d9e6dc] bg-[#f4faf5] px-3.5 py-3 text-xs text-[#3e5d50]"><p><span className="font-bold text-[#24563f]">Draft restored from this browser.</span> It is kept only for this tab and clears after a successful submission.</p><button type="button" onClick={onClear} className="shrink-0 font-bold text-[#0f5c4f] underline underline-offset-2">Clear draft</button></div>;
}
