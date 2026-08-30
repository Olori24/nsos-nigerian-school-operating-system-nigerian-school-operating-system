import { writeOperationalEvent } from "./observability";
import * as db from "./db";
import { ENV } from "./_core/env";

const DELIVERY_TIMEOUT_MS = 10_000;

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

async function sendWelcomeEmail(input: {
  email: string;
  origin: string;
  idempotencyKey: string;
}) {
  const origin = safeWelcomeOrigin(input.origin);
  const signInUrl = new URL("/", origin).toString();
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
      text: `Your NSOS account is ready. Sign in here: ${signInUrl}\n\nIf you did not create this account, you can safely ignore this email.`,
      html: `<p>Your NSOS account is ready.</p><p><a href="${signInUrl}">Open NSOS</a></p><p>If you did not create this account, you can safely ignore this email.</p>`,
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

export const welcomeEmailPolicies = { normaliseSender, safeWelcomeOrigin };
