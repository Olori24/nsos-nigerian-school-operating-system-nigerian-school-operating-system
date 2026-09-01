import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180;

function signature(payload: string) {
  return createHmac("sha256", ENV.cookieSecret)
    .update(payload)
    .digest("base64url");
}

export function createMarketingUnsubscribeToken(
  userId: number,
  now = Math.floor(Date.now() / 1000)
) {
  const payload = `${userId}.${now}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyMarketingUnsubscribeToken(
  token: string,
  now = Math.floor(Date.now() / 1000)
) {
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    !/^\d+$/.test(parts[1]) ||
    !/^[A-Za-z0-9_-]{43}$/.test(parts[2])
  )
    return undefined;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = signature(payload);
  const provided = Buffer.from(parts[2]);
  const expectedBuffer = Buffer.from(expected);
  if (
    provided.length !== expectedBuffer.length ||
    !timingSafeEqual(provided, expectedBuffer)
  )
    return undefined;
  const issuedAt = Number(parts[1]);
  if (
    !Number.isSafeInteger(issuedAt) ||
    now < issuedAt ||
    now - issuedAt > TOKEN_TTL_SECONDS
  )
    return undefined;
  const userId = Number(parts[0]);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : undefined;
}

export function marketingUnsubscribeUrl(origin: string, userId: number) {
  const url = new URL(origin);
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !["https:", "http:"].includes(url.protocol) ||
    (url.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw new Error("Marketing origin is not configured safely.");
  const link = new URL("/api/marketing/unsubscribe", url.origin);
  link.searchParams.set("token", createMarketingUnsubscribeToken(userId));
  return link.toString();
}

export const marketingEmailPolicies = {
  createMarketingUnsubscribeToken,
  verifyMarketingUnsubscribeToken,
  marketingUnsubscribeUrl,
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character
  );
}

function normaliseSender(value: string) {
  const sender = value.trim();
  if (
    !sender ||
    /[\r\n]/.test(sender) ||
    !/^(?:[^<>\r\n]+\s+<)?[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>?$/.test(sender)
  )
    throw new Error("The marketing sender is not configured safely.");
  return sender;
}

export async function sendMarketingUpdateEmail(input: {
  userId: number;
  email: string;
  name?: string | null;
  subject: string;
  body: string;
  idempotencyKey: string;
}) {
  const unsubscribeUrl = marketingUnsubscribeUrl(
    "https://nsos.top",
    input.userId
  );
  const firstName = input.name?.trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);
  const safeSubject = input.subject.trim();
  const safeBody = input.body.trim();
  const text = `Hi ${firstName},\n\n${safeBody}\n\nYou are receiving this because you opted in to NSOS product updates. Unsubscribe: ${unsubscribeUrl}`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f7faf6;color:#1b2c25;font-family:Arial,Helvetica,sans-serif;"><div style="max-width:600px;margin:0 auto;padding:32px 16px;"><div style="background:#123b31;padding:24px;border-radius:18px 18px 0 0;color:#fff;"><strong>NSOS</strong><div style="margin-top:6px;color:#d8ebe1;font-size:12px;">Nigerian School Operating System</div></div><div style="background:#fff;border:1px solid #dce8df;border-top:0;padding:28px 24px;border-radius:0 0 18px 18px;"><p style="margin:0 0 12px;color:#0f5c4f;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Product update</p><h1 style="margin:0 0 16px;color:#1b2c25;font-size:24px;">Hi ${safeName}</h1><div style="color:#66756c;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(safeBody)}</div><p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #dce8df;color:#66756c;font-size:12px;line-height:1.6;">You are receiving this because you opted in to NSOS product updates. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#0f5c4f;">Unsubscribe</a></p></div></div></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: normaliseSender(ENV.authEmailFrom),
      to: input.email,
      subject: safeSubject,
      text,
      html,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new Error(
      `Resend rejected marketing delivery with status ${response.status}`
    );
  return typeof payload.id === "string" ? payload.id.slice(0, 255) : undefined;
}
