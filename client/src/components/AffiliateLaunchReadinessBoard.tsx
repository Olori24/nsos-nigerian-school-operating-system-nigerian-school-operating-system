import { BookOpenCheck, FileCheck2, Handshake, ShieldAlert, WalletCards } from "lucide-react";

const readinessGates = [
  {
    title: "Governance and terms",
    detail: "Final affiliate terms, partner agreement, eligible-payment rules, and Nigeria-qualified legal and tax review.",
    icon: FileCheck2,
  },
  {
    title: "Privacy and disclosure",
    detail: "Referral notice, data-minimisation and retention decisions, approved claims, and channel disclosures.",
    icon: BookOpenCheck,
  },
  {
    title: "Payout and reconciliation",
    detail: "Named finance reviewer, payee-verification process, manual calculation evidence, and a payment route.",
    icon: WalletCards,
  },
  {
    title: "Fraud and revocation",
    detail: "Self-referral, duplicate, refund, chargeback, suspension, dispute, and rapid-revocation controls.",
    icon: ShieldAlert,
  },
  {
    title: "Named partner approval",
    detail: "A reviewed partner, approved content and disclosure, permitted channel, territory, and one revocable destination.",
    icon: Handshake,
  },
] as const;

export function AffiliateLaunchReadinessBoard({ defaultsRecorded, blockers }: { defaultsRecorded: boolean; blockers: string[] }) {
  return (
    <section className="rounded-2xl border border-[#d8e6dc] bg-[#f8fcf9] p-5" aria-labelledby="affiliate-launch-readiness-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#39765b]">Approval-first launch path</p>
          <h3 id="affiliate-launch-readiness-title" className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#173128]">External activity remains inactive</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#61766b]">The approved internal defaults are one prerequisite. Each gate below needs its own evidence and owner decision before a partner, link, tracking, outreach, contract, payment, or payout can exist.</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-[#e7cfa4] bg-[#fff8e9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#76531b]">{defaultsRecorded ? "Internal defaults only" : "Defaults pending"}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {readinessGates.map(({ title, detail, icon: Icon }) => (
          <article key={title} className="rounded-xl border border-[#dfeae2] bg-white p-4">
            <div className="flex items-start gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eaf5ed] text-[#176145]"><Icon className="h-4 w-4" /></span><div><p className="text-xs font-bold text-[#274638]">{title}</p><p className="mt-1 text-[11px] leading-4 text-[#62766c]">{detail}</p></div></div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#946b25]">Owner decision required</p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[#e6d6b6] bg-[#fffaf1] p-3">
        <p className="text-xs font-semibold text-[#694b16]">Current activation blockers</p>
        <p className="mt-1 text-[11px] leading-5 text-[#755d32]">{blockers.join(" · ")}</p>
      </div>
    </section>
  );
}
