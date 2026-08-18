import { trpc } from "@/lib/trpc";
import { BellRing, CreditCard, KeyRound, Loader2, LockKeyhole, PlugZap, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
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

export function ProviderConfigurationCenter({ schoolId }: { schoolId: number }) {
  const configs = trpc.nsos.providers.list.useQuery({ schoolId });
  const [active, setActive] = useState<Category>("payment");
  const [provider, setProvider] = useState("paystack");
  const [status, setStatus] = useState<ProviderStatus>("draft");
  const [publicKey, setPublicKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const save = trpc.nsos.providers.save.useMutation({ onSuccess: () => { toast.success("Provider settings saved securely."); setApiKey(""); setSecretKey(""); setWebhookSecret(""); configs.refetch(); }, onError: error => toast.error(error.message) });
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
  }, [active, configs.data]);

  const saveConfig = () => {
    const configuration = active === "payment" ? { publicKey: publicKey.trim() || undefined } : { senderId: senderId.trim() || undefined };
    save.mutate({ schoolId, category: active, provider: provider as any, status, configuration, credentials: { apiKey: apiKey.trim() || undefined, secretKey: secretKey.trim() || undefined, webhookSecret: webhookSecret.trim() || undefined } });
  };
  const clearCredentials = () => save.mutate({ schoolId, category: active, provider: provider as any, status: "draft", configuration: active === "payment" ? { publicKey: publicKey.trim() || undefined } : { senderId: senderId.trim() || undefined }, clearCredentials: true });
  const runConnectionTest = () => testConnection.mutate({ schoolId, category: active });
  const currentProvider = providerOptions[active].find(item => item.value === provider);

  return <section className="rounded-[1.2rem] border border-[#e0e5df] bg-white shadow-[0_10px_32px_rgba(16,45,35,.035)]">
    <div className="flex flex-col gap-4 border-b border-[#e7ebe6] p-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3ed] text-[#0f5c4f]"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[#20342c]">Provider configuration</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#758079]">Choose the school’s payment and notification providers. Credentials are encrypted on the server and never returned to the dashboard after saving.</p></div></div><div className="flex gap-2"><button onClick={() => setActive("payment")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${active === "payment" ? "bg-[#123b31] text-white" : "bg-[#f1f4f0] text-[#52645b]"}`}><CreditCard className="mr-1.5 inline h-3.5 w-3.5" />Payments</button><button onClick={() => setActive("notification")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${active === "notification" ? "bg-[#123b31] text-white" : "bg-[#f1f4f0] text-[#52645b]"}`}><BellRing className="mr-1.5 inline h-3.5 w-3.5" />Notifications</button></div></div>
    {configs.isLoading ? <div className="grid min-h-[260px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#0f5c4f]" /></div> : <div className="grid gap-6 p-5 lg:grid-cols-[.85fr_1.15fr]"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.14em] text-[#7a847e]">Select provider</p><div className="mt-3 grid gap-2">{providerOptions[active].map(option => <button key={option.value} onClick={() => setProvider(option.value)} className={`rounded-xl border p-3 text-left transition ${provider === option.value ? "border-[#0f5c4f] bg-[#eff7f0]" : "border-[#e1e6e1] bg-[#fbfcfa] hover:border-[#b9c9bc]"}`}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#2c4138]">{option.label}</p>{provider === option.value && <span className="h-2 w-2 rounded-full bg-[#0f5c4f]" />}</div><p className="mt-1 text-xs leading-5 text-[#758079]">{option.description}</p></button>)}</div></div><div><div className="flex flex-col gap-3 border-b border-[#edf0ec] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-[#2d4439]">{currentProvider?.label} setup</p><p className="mt-1 text-xs text-[#758079]">{selected?.readiness ?? "Choose provider details and save a draft."}</p>{selected?.lastValidatedAt && <p className="mt-1 text-[10px] font-semibold text-[#367557]">Last verified {new Date(selected.lastValidatedAt).toLocaleString()}</p>}</div><Status status={status} /></div><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Configuration status</span><select value={status} onChange={event => setStatus(event.target.value as ProviderStatus)} className={inputClass}><option value="draft">Draft — not used in workflows</option><option value="ready">Ready — adapter credentials configured</option><option value="disabled">Disabled</option></select></label>{active === "payment" ? <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Public key or merchant reference</span><input value={publicKey} onChange={event => setPublicKey(event.target.value)} className={inputClass} placeholder="pk_live_… or merchant ID" /></label> : <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Sender ID or from address</span><input value={senderId} onChange={event => setSenderId(event.target.value)} className={inputClass} placeholder="e.g. GreenerFuture or admissions@school.edu.ng" /></label>}{provider !== "manual" && provider !== "in_app" && <div className="grid gap-4 rounded-xl bg-[#f8faf7] p-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>API key</span><input type="password" autoComplete="new-password" value={apiKey} onChange={event => setApiKey(event.target.value)} className={inputClass} placeholder={selected?.hasCredentials ? "Stored securely — enter to replace" : "Enter provider API key"} /></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Secret key</span><input type="password" autoComplete="new-password" value={secretKey} onChange={event => setSecretKey(event.target.value)} className={inputClass} placeholder={selected?.hasCredentials ? "Stored securely — enter to replace" : "Enter provider secret"} /></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c] sm:col-span-2"><span>Webhook signing secret <em className="font-normal text-[#829089]">optional</em></span><input type="password" autoComplete="new-password" value={webhookSecret} onChange={event => setWebhookSecret(event.target.value)} className={inputClass} placeholder="Optional webhook verification secret" /></label></div>}<div className="flex flex-col gap-3 rounded-xl border border-[#e5ebe5] bg-[#fcfdfb] p-4 text-xs leading-5 text-[#67766e] sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5c4f]" /><span>Only owner/admin users can change this setup. Credential values are encrypted before persistence and are never displayed after save.</span></div>{selected?.hasCredentials && <button onClick={clearCredentials} className="shrink-0 font-bold text-[#9b413a]"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Clear credentials</button>}</div><div className="flex flex-wrap gap-2"><button onClick={saveConfig} disabled={save.isPending} className="rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{save.isPending ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Save className="mr-1.5 inline h-4 w-4" />}Save configuration</button><button onClick={runConnectionTest} disabled={testConnection.isPending || !selected?.id} className="rounded-xl border border-[#bbcdc0] bg-white px-4 py-2.5 text-sm font-bold text-[#0f5c4f] disabled:cursor-not-allowed disabled:opacity-50">{testConnection.isPending ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 inline h-4 w-4" />}Test connection</button><span className="inline-flex items-center rounded-xl bg-[#f1f4f0] px-3 py-2.5 text-xs font-semibold text-[#66746c]"><Send className="mr-1.5 h-3.5 w-3.5" />Tests use a safe read-only provider request; no payment or notification is sent.</span></div></div></div></div>}</section>;
}

function Status({ status }: { status: ProviderStatus }) { const tone = status === "ready" ? "bg-[#e3f0e6] text-[#176145]" : status === "disabled" ? "bg-[#f2eceb] text-[#94453d]" : "bg-[#f7eed9] text-[#8a5a12]"; return <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${tone}`}>{status}</span>; }
