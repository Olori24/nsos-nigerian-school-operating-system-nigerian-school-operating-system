import { Bell, BellOff, CheckCircle2, Loader2, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function MarketingPreferencesPanel() {
  const me = trpc.auth.me.useQuery();
  const preference = trpc.nsos.marketing.preference.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.nsos.marketing.setPreference.useMutation({
    onSuccess: async () => {
      await utils.nsos.marketing.preference.invalidate();
    },
  });
  const subscribed = preference.data?.status === "subscribed";
  const isBusy = preference.isLoading || update.isPending;
  const email = me.data?.email;

  return (
    <section
      className="rounded-[1.2rem] border border-[#d8e6dc] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,.035)] sm:p-6"
      aria-labelledby="marketing-preferences-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f2ec] text-[#176145]">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[#4b7765]">
              Product updates
            </p>
            <h2
              id="marketing-preferences-title"
              className="mt-1 text-base font-semibold text-[#203a2e]"
            >
              Stay informed about NSOS
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#687970]">
              Receive occasional news about platform updates, improvements, and
              important product changes. This is optional and separate from
              account, security, and school messages.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] ${subscribed ? "bg-[#e2f1e8] text-[#176145]" : "bg-[#f1f4f0] text-[#66766e]"}`}
        >
          {subscribed ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <BellOff className="h-3.5 w-3.5" />
          )}
          {subscribed ? "Subscribed" : "Not subscribed"}
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#e8eee9] bg-[#f8fbf8] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#355246]">
            {email
              ? `Updates go to ${email}`
              : "Add a verified email to receive updates"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#74827a]">
            You can change this choice at any time. NSOS records only your
            preference and consent history.
          </p>
        </div>
        <button
          type="button"
          disabled={isBusy || !email}
          onClick={() =>
            update.mutate({
              subscribed: !subscribed,
              source: "account_settings",
            })
          }
          className={`inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${subscribed ? "bg-[#66766e]" : "bg-[#0f5c4f]"}`}
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : subscribed ? (
            <BellOff className="h-3.5 w-3.5" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          {isBusy
            ? "Saving…"
            : subscribed
              ? "Unsubscribe"
              : "Subscribe to updates"}
        </button>
      </div>
      {update.error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-[#a13e38]">
          {update.error.message}
        </p>
      )}
    </section>
  );
}
