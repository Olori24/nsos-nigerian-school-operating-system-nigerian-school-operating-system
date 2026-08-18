import { NotificationTestMessageDialog } from "@/components/NotificationTestMessageDialog";
import { trpc } from "@/lib/trpc";
import { BellRing, CheckCircle2, Copy, CreditCard, Eye, EyeOff, Loader2, LockKeyhole, PlugZap, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Category = "payment" | "notification";
type ProviderStatus = "draft" | "ready" | "disabled";

const providerOptions: Record<Category, { value: string; label: string; description: string }[]> = {
  payment: [
    { value: "paystack", label: "Paystack", description: "Online card, bank, and transfer collection." },
    { value: "flutterwave", label: "Flutterwave", description: "Payment collection across supported channels." },
    { value: "stripe", label: "Stripe", description: "International payment setup where available." },
    { value: "manual", label: "Manual confirmation", description: "Record bank-transfer or cash payments without a gateway." },
  ],
  notification: [
    { value: "termii", label: "Termii", description: "SMS notifications for Nigerian school families." },
    { value: "twilio", label: "Twilio", description: "SMS and WhatsApp-capable messaging setup." },
    { value: "resend", label: "Resend", description: "Transactional email delivery." },
    { value: "sendgrid", label: "SendGrid", description: "Email notification delivery." },
    { value: "whatsapp_cloud", label: "WhatsApp Cloud", description: "Business messaging workflow configuration." },
    { value: "in_app", label: "In-app only", description: "Use NSOS noticeboard and in-app messages only." },
  ],
};

const inputClass = "h-10 w-full rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";

function TermiiWebhookSetup({ callbackUrl, secret, secretStored, showSecret, onSecretChange, onToggleSecret, onCopy }: { callbackUrl?: string; secret: string; secretStored: boolean; showSecret: boolean; onSecretChange: (value: string) => void; onToggleSecret: () => void; onCopy: () => void }) {
  return (
    <section className="rounded-2xl border border-[#b9d1bd] bg-[linear-gradient(135deg,#f2faf3_0%,#fbfdf9_58%,#f1f7ed_100%)] p-4 shadow-[0_8px_20px_rgba(26,80,51,.05)]" aria-labelledby="termii-webhook-heading">
      <div className="flex flex-col gap-3 border-b border-[#d5e4d5] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white shadow-sm"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h3 id="termii-webhook-heading" className="text-sm font-bold text-[#214333]">Termii delivery webhook</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] ${secretStored ? "bg-[#dcefe0] text-[#176145]" : "bg-[#fff0cf] text-[#825911]"}`}>{secretStored ? "Signing secret saved" : "Signing secret required"}</span></div>
            <p className="mt-1 max-w-xl text-xs leading-5 text-[#567063]">Complete these three steps once to let NSOS confirm SMS delivery automatically. The callback only changes a matching school message after Termii’s signature is verified.</p>
          </div>
        </div>
        {secretStored && <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#29704b]"><CheckCircle2 className="h-4 w-4" />Ready for verified callbacks</span>}
      </div>

      <ol className="mt-4 grid gap-3 text-xs text-[#4d6658] sm:grid-cols-3">
        <li className="rounded-xl border border-[#d8e5d8] bg-white/80 p-3"><span className="mb-2 grid h-5 w-5 place-items-center rounded-full bg-[#dcefe0] text-[10px] font-bold text-[#176145]">1</span><strong className="block text-[#294938]">Copy the callback URL</strong><span className="mt-1 block leading-5">Use the school-specific URL shown below.</span></li>
        <li className="rounded-xl border border-[#d8e5d8] bg-white/80 p-3"><span className="mb-2 grid h-5 w-5 place-items-center rounded-full bg-[#dcefe0] text-[10px] font-bold text-[#176145]">2</span><strong className="block text-[#294938]">Register it in Termii</strong><span className="mt-1 block leading-5">Paste it in your Termii developer console webhook settings.</span></li>
        <li className="rounded-xl border border-[#d8e5d8] bg-white/80 p-3"><span className="mb-2 grid h-5 w-5 place-items-center rounded-full bg-[#dcefe0] text-[10px] font-bold text-[#176145]">3</span><strong className="block text-[#294938]">Save the signing secret</strong><span className="mt-1 block leading-5">Enter the Termii secret below, then save this configuration.</span></li>
      </ol>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3"><label className="text-xs font-bold text-[#395948]">Your school’s Termii callback URL</label><span className="text-[10px] font-medium text-[#61786a]">Read-only</span></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={callbackUrl ?? "Loading callback URL…"} aria-label="Termii SMS delivery callback URL" className="h-11 min-w-0 flex-1 rounded-lg border border-[#c8dccb] bg-white px-3 font-mono text-[11px] text-[#315141]" />
            <button type="button" onClick={onCopy} disabled={!callbackUrl} className="h-11 shrink-0 rounded-lg bg-[#0f5c4f] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0a4a3e] disabled:cursor-not-allowed disabled:opacity-50"><Copy className="mr-1.5 inline h-3.5 w-3.5" />Copy callback URL</button>
          </div>
        </div>

        <label className="grid gap-1.5">
          <span className="flex items-center justify-between gap-3 text-xs font-bold text-[#395948]"><span>Termii webhook signing secret</span><span className="font-normal text-[#6f8376]">Encrypted after you save</span></span>
          <div className="relative">
            <input type={showSecret ? "text" : "password"} autoComplete="new-password" value={secret} onChange={event => onSecretChange(event.target.value)} className={`${inputClass} pr-11`} placeholder={secretStored ? "Stored securely — enter a new value only to replace it" : "Paste the signing secret from Termii"} aria-describedby="termii-secret-help" />
            <button type="button" onClick={onToggleSecret} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-[#657d6d] hover:text-[#0f5c4f]" aria-label={showSecret ? "Hide Termii signing secret" : "Show Termii signing secret"}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          <span id="termii-secret-help" className="text-[11px] leading-5 text-[#667d6d]">NSOS uses this value to reject unauthenticated delivery requests. It is never shown again after saving.</span>
        </label>
      </div>
    </section>
  );
}

function TwilioCallbackInfo({ callbackUrl, onCopy }: { callbackUrl?: string; onCopy: () => void }) {
  return <div className="rounded-xl border border-[#bfd2c2] bg-[#f3f8f3] p-4 text-xs leading-5 text-[#4e6256]"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5c4f]" /><div><strong className="block text-[#284737]">Automatic SMS delivery updates</strong><span>NSOS sends this signed callback URL with each Twilio test SMS, so Twilio can report delivery automatically.</span></div></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly value={callbackUrl ?? "Loading callback URL…"} aria-label="Twilio SMS delivery webhook URL" className="h-10 min-w-0 flex-1 rounded-lg border border-[#d4e2d5] bg-white px-3 font-mono text-[11px] text-[#315141]" /><button type="button" onClick={onCopy} disabled={!callbackUrl} className="shrink-0 rounded-lg border border-[#9bb9a1] bg-white px-3 font-bold text-[#0f5c4f] disabled:cursor-not-allowed disabled:opacity-50"><Copy className="mr-1 inline h-3.5 w-3.5" />Copy</button></div></div>;
}

export function ProviderConfigurationCenter({ schoolId }: { schoolId: number }) {
  const configs = trpc.nsos.providers.list.useQuery({ schoolId });
  const webhookUrls = trpc.nsos.providers.webhookUrls.useQuery({ schoolId });
  const [active, setActive] = useState<Category>("payment");
  const [provider, setProvider] = useState("paystack");
  const [status, setStatus] = useState<ProviderStatus>("draft");
  const [publicKey, setPublicKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const save = trpc.nsos.providers.save.useMutation({ onSuccess: () => { toast.success("Provider settings saved securely."); setApiKey(""); setSecretKey(""); setWebhookSecret(""); setShowWebhookSecret(false); configs.refetch(); }, onError: error => toast.error(error.message) });
  const testConnection = trpc.nsos.providers.testConnection.useMutation({ onSuccess: result => { result.ok ? toast.success(result.message) : toast.error(result.message); configs.refetch(); }, onError: error => toast.error(error.message) });
  const selected = configs.data?.find(item => item.category === active);

  useEffect(() => {
    const existing = configs.data?.find(item => item.category === active);
    const defaults = providerOptions[active][0];
    const configured = (existing?.configuration ?? {}) as Record<string, unknown>;
    setProvider(existing?.provider ?? defaults.value);
    setStatus(existing?.status ?? "draft");
    setPublicKey(typeof configured.publicKey === "string" ? configured.publicKey : "");
    setSenderId(typeof configured.senderId === "string" ? configured.senderId : "");
    setApiKey("");
    setSecretKey("");
    setWebhookSecret("");
    setShowWebhookSecret(false);
  }, [active, configs.data]);

  const saveConfig = () => {
    const configuration = active === "payment" ? { publicKey: publicKey.trim() || undefined } : { senderId: senderId.trim() || undefined };
    save.mutate({ schoolId, category: active, provider: provider as never, status, configuration, credentials: { apiKey: apiKey.trim() || undefined, secretKey: secretKey.trim() || undefined, webhookSecret: webhookSecret.trim() || undefined } });
  };
  const clearCredentials = () => save.mutate({ schoolId, category: active, provider: provider as never, status: "draft", configuration: active === "payment" ? { publicKey: publicKey.trim() || undefined } : { senderId: senderId.trim() || undefined }, clearCredentials: true });
  const runConnectionTest = () => testConnection.mutate({ schoolId, category: active });
  const currentProvider = providerOptions[active].find(item => item.value === provider);
  const callbackUrl = provider === "termii" ? webhookUrls.data?.termii : provider === "twilio" ? webhookUrls.data?.twilio : undefined;
  const selectedProviderIsSaved = selected?.provider === provider;
  const termiiSecretStored = Boolean(selectedProviderIsSaved && selected?.hasWebhookSecret);
  const automaticSmsDeliveryReady = Boolean(selected?.id && selectedProviderIsSaved && selected.status === "ready" && (provider === "twilio" || (provider === "termii" && termiiSecretStored)));
  const copyWebhookUrl = () => {
    if (!callbackUrl) return;
    navigator.clipboard.writeText(callbackUrl).then(() => toast.success("Callback URL copied."), () => toast.error("Could not copy the callback URL. Select and copy it manually."));
  };

  return (
    <section className="rounded-[1.2rem] border border-[#e0e5df] bg-white shadow-[0_10px_32px_rgba(16,45,35,.035)]">
      <div className="flex flex-col gap-4 border-b border-[#e7ebe6] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3ed] text-[#0f5c4f]"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[#20342c]">Provider configuration</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#758079]">Choose the school’s payment and notification providers. Credentials are encrypted on the server and never returned to the dashboard after saving.</p></div></div>
        <div className="flex gap-2"><button onClick={() => setActive("payment")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${active === "payment" ? "bg-[#123b31] text-white" : "bg-[#f1f4f0] text-[#52645b]"}`}><CreditCard className="mr-1.5 inline h-3.5 w-3.5" />Payments</button><button onClick={() => setActive("notification")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${active === "notification" ? "bg-[#123b31] text-white" : "bg-[#f1f4f0] text-[#52645b]"}`}><BellRing className="mr-1.5 inline h-3.5 w-3.5" />Notifications</button></div>
      </div>

      {configs.isLoading ? <div className="grid min-h-[260px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#0f5c4f]" /></div> : <div className="grid gap-6 p-5 lg:grid-cols-[.85fr_1.15fr]">
        <div><p className="mono text-[10px] font-semibold uppercase tracking-[.14em] text-[#7a847e]">Select provider</p><div className="mt-3 grid gap-2">{providerOptions[active].map(option => <button key={option.value} onClick={() => setProvider(option.value)} className={`rounded-xl border p-3 text-left transition ${provider === option.value ? "border-[#0f5c4f] bg-[#eff7f0]" : "border-[#e1e6e1] bg-[#fbfcfa] hover:border-[#b9c9bc]"}`}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#2c4138]">{option.label}</p>{provider === option.value && <span className="h-2 w-2 rounded-full bg-[#0f5c4f]" />}</div><p className="mt-1 text-xs leading-5 text-[#758079]">{option.description}</p></button>)}</div></div>
        <div>
          <div className="flex flex-col gap-3 border-b border-[#edf0ec] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-[#2d4439]">{currentProvider?.label} setup</p><p className="mt-1 text-xs text-[#758079]">{selected?.readiness ?? "Choose provider details and save a draft."}</p>{selected?.lastValidatedAt && <p className="mt-1 text-[10px] font-semibold text-[#367557]">Last verified {new Date(selected.lastValidatedAt).toLocaleString()}</p>}</div><Status status={status} /></div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Configuration status</span><select value={status} onChange={event => setStatus(event.target.value as ProviderStatus)} className={inputClass}><option value="draft">Draft — not used in workflows</option><option value="ready">Ready — adapter credentials configured</option><option value="disabled">Disabled</option></select></label>
            {active === "payment" ? <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Public key or merchant reference</span><input value={publicKey} onChange={event => setPublicKey(event.target.value)} className={inputClass} placeholder="pk_live_… or merchant ID" /></label> : <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Sender ID or from address</span><input value={senderId} onChange={event => setSenderId(event.target.value)} className={inputClass} placeholder="e.g. GreenerFuture or admissions@school.edu.ng" /></label>}
            {provider !== "manual" && provider !== "in_app" && <div className="grid gap-4 rounded-xl bg-[#f8faf7] p-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>API key</span><input type="password" autoComplete="new-password" value={apiKey} onChange={event => setApiKey(event.target.value)} className={inputClass} placeholder={selectedProviderIsSaved && selected?.hasCredentials ? "Stored securely — enter to replace" : "Enter provider API key"} /></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Secret key</span><input type="password" autoComplete="new-password" value={secretKey} onChange={event => setSecretKey(event.target.value)} className={inputClass} placeholder={selectedProviderIsSaved && selected?.hasCredentials ? "Stored securely — enter to replace" : "Enter provider secret"} /></label></div>}
            {provider === "termii" && <TermiiWebhookSetup callbackUrl={callbackUrl} secret={webhookSecret} secretStored={termiiSecretStored} showSecret={showWebhookSecret} onSecretChange={setWebhookSecret} onToggleSecret={() => setShowWebhookSecret(value => !value)} onCopy={copyWebhookUrl} />}
            {provider === "twilio" && <TwilioCallbackInfo callbackUrl={callbackUrl} onCopy={copyWebhookUrl} />}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e5ebe5] bg-[#fcfdfb] p-4 text-xs leading-5 text-[#67766e] sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5c4f]" /><span>Only owner/admin users can change this setup. Credential values are encrypted before persistence and are never displayed after save.</span></div>{selected?.hasCredentials && <button onClick={clearCredentials} className="shrink-0 font-bold text-[#9b413a]"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Clear credentials</button>}</div>
            <div className="flex flex-wrap gap-2"><button onClick={saveConfig} disabled={save.isPending} className="rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{save.isPending ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Save className="mr-1.5 inline h-4 w-4" />}Save configuration</button><button onClick={runConnectionTest} disabled={testConnection.isPending || !selected?.id} className="rounded-xl border border-[#bbcdc0] bg-white px-4 py-2.5 text-sm font-bold text-[#0f5c4f] disabled:cursor-not-allowed disabled:opacity-50">{testConnection.isPending ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 inline h-4 w-4" />}Test connection</button>{active === "notification" && <NotificationTestMessageDialog schoolId={schoolId} provider={provider} enabled={automaticSmsDeliveryReady} onSent={() => configs.refetch()} />}<span className="inline-flex items-center rounded-xl bg-[#f1f4f0] px-3 py-2.5 text-xs font-semibold text-[#66746c]"><Send className="mr-1.5 h-3.5 w-3.5" />Tests use a safe read-only provider request; no payment or notification is sent.</span></div>
          </div>
        </div>
      </div>}
    </section>
  );
}

function Status({ status }: { status: ProviderStatus }) {
  const tone = status === "ready" ? "bg-[#e3f0e6] text-[#176145]" : status === "disabled" ? "bg-[#f2eceb] text-[#94453d]" : "bg-[#f7eed9] text-[#8a5a12]";
  return <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${tone}`}>{status}</span>;
}
