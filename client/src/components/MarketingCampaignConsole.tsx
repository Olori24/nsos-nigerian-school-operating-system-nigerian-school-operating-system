import { CheckCircle2, FileEdit, Loader2, Megaphone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";

export function MarketingCampaignConsole() {
  const campaigns = trpc.nsos.marketing.campaigns.useQuery();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const create = trpc.nsos.marketing.createCampaign.useMutation({
    onSuccess: async () => {
      setTitle("");
      setSubject("");
      setBody("");
      await utils.nsos.marketing.campaigns.invalidate();
    },
  });
  const approve = trpc.nsos.marketing.approveCampaign.useMutation({
    onSuccess: async () => {
      await utils.nsos.marketing.campaigns.invalidate();
    },
  });
  const send = trpc.nsos.marketing.sendCampaign.useMutation({
    onSuccess: async () => {
      await utils.nsos.marketing.campaigns.invalidate();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ title, subject, body });
  };

  return (
    <section
      className="rounded-[1.2rem] border border-[#d8e6dc] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,.035)] sm:p-6"
      aria-labelledby="marketing-campaign-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f2ec] text-[#176145]">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.14em] text-[#4b7765]">
            Owner controls
          </p>
          <h2
            id="marketing-campaign-title"
            className="mt-1 text-base font-semibold text-[#203a2e]"
          >
            Product-update campaigns
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#687970]">
            Draft and review updates for users who explicitly subscribed.
            Creating or approving a campaign does not send it.
          </p>
        </div>
      </div>
      <form
        onSubmit={submit}
        className="mt-5 grid gap-3 rounded-xl border border-[#e8eee9] bg-[#f8fbf8] p-4"
      >
        <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]">
          Campaign name
          <input
            required
            minLength={3}
            maxLength={160}
            className="rounded-lg border border-[#d8e4db] bg-white px-3 py-2.5 text-sm font-normal text-[#203a2e] outline-none focus:ring-2 focus:ring-[#97c7a7]"
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]">
          Email subject
          <input
            required
            minLength={3}
            maxLength={255}
            className="rounded-lg border border-[#d8e4db] bg-white px-3 py-2.5 text-sm font-normal text-[#203a2e] outline-none focus:ring-2 focus:ring-[#97c7a7]"
            value={subject}
            onChange={event => setSubject(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]">
          Message
          <textarea
            required
            minLength={10}
            maxLength={10000}
            className="min-h-28 rounded-lg border border-[#d8e4db] bg-white px-3 py-2.5 text-sm font-normal text-[#203a2e] outline-none focus:ring-2 focus:ring-[#97c7a7]"
            value={body}
            onChange={event => setBody(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[11px] leading-5 text-[#74827a]">
            Do not include passwords, verification tokens, learner records,
            payment details, or private school information.
          </p>
          <button
            disabled={create.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {create.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileEdit className="h-3.5 w-3.5" />
            )}
            Save draft
          </button>
        </div>
      </form>
      <div className="mt-5 space-y-2">
        {campaigns.data?.length ? (
          campaigns.data.map(campaign => (
            <div
              key={campaign.id}
              className="flex flex-col gap-3 rounded-xl border border-[#e8eee9] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#30453b]">
                    {campaign.title}
                  </p>
                  <span className="rounded-full bg-[#eef3ed] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#176145]">
                    {campaign.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#74827a]">
                  {campaign.subject}
                </p>
              </div>
              {campaign.status === "draft" && (
                <button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Approve this product-update campaign for a later, separately confirmed send?"
                      )
                    )
                      approve.mutate({
                        campaignId: campaign.id,
                        confirmed: true,
                      });
                  }}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#b8d2bf] bg-white px-3 py-2 text-xs font-bold text-[#176145] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve for review
                </button>
              )}
              {campaign.status === "approved" && (
                <button
                  type="button"
                  disabled={send.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Send this approved update now to every currently subscribed user? This cannot be undone."
                      )
                    )
                      send.mutate({
                        campaignId: campaign.id,
                        confirmed: true,
                      });
                  }}
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#0f5c4f] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {send.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Megaphone className="h-3.5 w-3.5" />
                  )}
                  Send to subscribers
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-[#d8e4db] p-4 text-xs text-[#74827a]">
            No product-update drafts yet.
          </p>
        )}
      </div>
    </section>
  );
}
