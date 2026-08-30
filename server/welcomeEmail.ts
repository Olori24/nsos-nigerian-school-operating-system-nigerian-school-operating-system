import { writeOperationalEvent } from "./observability";
import * as db from "./db";
import { ENV } from "./_core/env";

const DELIVERY_TIMEOUT_MS = 10_000;
const GETTING_STARTED_LINKS = [
  { label: "Overview", view: "overview" },
  { label: "Admissions", view: "admissions" },
  { label: "Student records", view: "students" },
  { label: "Fees & finance", view: "finance" },
  { label: "Communications", view: "communications" },
] as const;

const BRAND = {
  pine: "#0f5c4f",
  deepPine: "#123b31",
  cream: "#f7faf6",
  ink: "#1b2c25",
  muted: "#66756c",
  border: "#dce8df",
  white: "#ffffff",
} as const;

function normaliseSender(value: string) {
  const sender = value.trim();
  if (!sender || /[\r\n]/.test(sender))
    throw new Error("The welcome-email sender is not configured safely.");
  const match = sender.match(
    /^(?:[^<>\r\n]+\s+<)?([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>?$/
  );
  if (!match)
    throw new Error("The welcome-email sender is not configured safely.");
  return sender;
}

function safeWelcomeOrigin(value: string) {
  const origin = new URL(value);
  if (
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !["https:", "http:"].includes(origin.protocol) ||
    (origin.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(origin.hostname))
  )
    throw new Error("The welcome-email destination is not configured safely.");
  return origin.origin;
}

function safePublicImageUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password)
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character
  );
}

function safeFirstName(value: string | null | undefined) {
  const candidate = value?.trim().split(/\s+/)[0] ?? "";
  return candidate && /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]+$/.test(candidate)
    ? candidate
    : "there";
}

export function buildWelcomeEmailContent(input: {
  origin: string;
  logoUrl?: string;
  firstName?: string | null;
}) {
  const origin = safeWelcomeOrigin(input.origin);
  const signInUrl = new URL("/", origin).toString();
  const safeLogoUrl = safePublicImageUrl(input.logoUrl);
  const logoMarkup = safeLogoUrl
    ? `<img src="${escapeHtml(safeLogoUrl)}" width="52" height="52" alt="NSOS logo" style="display:block;width:52px;height:52px;border:0;border-radius:14px;background:${BRAND.white};object-fit:contain;padding:6px;box-sizing:border-box;">`
    : `<span role="img" aria-label="NSOS" style="display:block;width:52px;height:52px;border-radius:14px;background:${BRAND.white};color:${BRAND.pine};font-family:Arial,sans-serif;font-size:16px;font-weight:700;line-height:52px;text-align:center;">NSOS</span>`;
  const firstName = safeFirstName(input.firstName);
  const safeFirstNameValue = escapeHtml(firstName);
  const safeSignInUrl = escapeHtml(signInUrl);
  const quickLinks = GETTING_STARTED_LINKS.map(({ label, view }) => {
    const link = new URL("/", origin);
    link.searchParams.set("view", view);
    return { label, url: link.toString() };
  });
  const quickLinksText = quickLinks
    .map(link => `- ${link.label}: ${link.url}`)
    .join("\n");
  const quickLinksHtml = quickLinks
    .map(
      link =>
        `<tr><td style="padding:0 0 10px;"><a href="${escapeHtml(link.url)}" style="color:${BRAND.pine};font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(link.label)} <span aria-hidden="true">→</span></a></td></tr>`
    )
    .join("");
  const text = `Hi ${firstName},\n\nYour NSOS account is ready. Sign in here: ${signInUrl}\n\nGetting started\n${quickLinksText}\n\nIf you did not create this account, you can safely ignore this email.`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="x-apple-disable-message-reformatting"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to NSOS</title></head><body style="margin:0;background:${BRAND.cream};color:${BRAND.ink};font-family:Arial,Helvetica,sans-serif;"><div role="article" aria-roledescription="email" aria-label="Welcome to NSOS" style="background:${BRAND.cream};padding:32px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;"><tr><td style="background:${BRAND.deepPine};padding:28px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:middle;">${logoMarkup}</td><td style="padding-left:14px;vertical-align:middle;"><p style="margin:0;color:${BRAND.white};font-size:18px;font-weight:700;letter-spacing:.02em;">NSOS</p><p style="margin:4px 0 0;color:#d8ebe1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">Nigerian School Operating System</p></td></tr></table></td></tr><tr><td style="padding:36px 32px 28px;"><p style="margin:0;color:${BRAND.pine};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Account ready</p><h1 style="margin:12px 0 0;color:${BRAND.ink};font-size:28px;line-height:1.2;">Hi ${safeFirstNameValue}, welcome to NSOS</h1>
<p style="margin:16px 0 0;color:${BRAND.muted};font-size:16px;line-height:1.65;">Your NSOS account is ready. Use the secure button below to open your workspace.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
<tr><td style="border-radius:10px;background:${BRAND.pine};"><a href="${safeSignInUrl}" style="display:inline-block;padding:14px 22px;border:1px solid ${BRAND.pine};border-radius:10px;color:${BRAND.white};font-size:15px;font-weight:700;text-decoration:none;">Open NSOS</a></td></tr></table><div style="margin:30px 0 0;border-top:1px solid ${BRAND.border};padding-top:24px;"><h2 style="margin:0 0 14px;color:${BRAND.ink};font-size:18px;line-height:1.3;">Getting started</h2><p style="margin:0 0 16px;color:${BRAND.muted};font-size:13px;line-height:1.6;">Use these shortcuts to open the NSOS areas available to your account.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0">${quickLinksHtml}</table></div><p style="margin:24px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">If the button does not work, copy and paste this address into your browser:<br><a href="${safeSignInUrl}" style="color:${BRAND.pine};word-break:break-all;">${safeSignInUrl}</a></p><div style="margin:28px 0 0;border-top:1px solid ${BRAND.border};padding-top:20px;">
<p style="margin:0;color:${BRAND.muted};font-size:13px;line-height:1.6;">If you did not create this account, you can safely ignore this email.</p></div></td></tr><tr><td style="background:${BRAND.cream};padding:20px 32px;"><p style="margin:0;color:${BRAND.muted};font-size:11px;line-height:1.5;">NSOS — Nigerian School Operating System</p></td></tr></table></div></body></html>`;
  return { text, html };
}

async function sendWelcomeEmail(input: {
  email: string;
  origin: string;
  idempotencyKey: string;
  firstName?: string | null;
}) {
  const content = buildWelcomeEmailContent({
    origin: input.origin,
    logoUrl: ENV.appLogo,
    firstName: input.firstName,
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    body: JSON.stringify({
      from: normaliseSender(ENV.authEmailFrom),
      to: input.email,
      subject: "Welcome to NSOS",
      text: content.text,
      html: content.html,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new Error(
      `Resend rejected welcome-email delivery with status ${response.status}`
    );
  return typeof payload.id === "string" ? payload.id.slice(0, 255) : undefined;
}

export async function dispatchWelcomeEmailForNewAccount(input: {
  userId: number;
  email: string;
  origin: string;
  firstName?: string | null;
}) {
  try {
    const delivery = await db.enqueueWelcomeEmailDelivery({
      userId: input.userId,
      recipientEmail: input.email,
    });
    if (!delivery || delivery.status !== "queued")
      return { status: delivery?.status ?? ("failed" as const) };
    const claimed = await db.claimWelcomeEmailDelivery(delivery.id);
    if (!claimed || claimed.status !== "sending")
      return { status: claimed?.status ?? ("failed" as const) };
    try {
      const providerMessageId = await sendWelcomeEmail({
        email: claimed.recipientEmail,
        origin: input.origin,
        firstName: input.firstName,
        idempotencyKey: `nsos-welcome-user-${input.userId}`,
      });
      await db.markWelcomeEmailSent({
        deliveryId: claimed.id,
        providerMessageId,
      });
      writeOperationalEvent("info", "auth_welcome_email_accepted", {
        category: "provider_accepted",
      });
      return { status: "sent" as const, providerMessageId };
    } catch (error) {
      await db.markWelcomeEmailFailed({ deliveryId: claimed.id, error });
      writeOperationalEvent("warn", "auth_welcome_email_failed", {
        category: "provider_or_configuration_failure",
      });
      return { status: "failed" as const };
    }
  } catch {
    writeOperationalEvent("warn", "auth_welcome_email_queue_failed", {
      category: "database_or_configuration_failure",
    });
    return { status: "failed" as const };
  }
}

export const welcomeEmailPolicies = {
  normaliseSender,
  safeWelcomeOrigin,
  safePublicImageUrl,
  buildWelcomeEmailContent,
  safeFirstName,
};
