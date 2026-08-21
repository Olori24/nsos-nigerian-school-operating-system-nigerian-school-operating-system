import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const GOOGLE_STATE_COOKIE = "__Host-google_oauth_state";
const GOOGLE_SIGNIN_NOTICE_COOKIE = "__Host-google_signin_notice";
const STATE_TTL_MS = 10 * 60_000;
const MAGIC_LINK_TTL_LABEL = "15 minutes";
const EXTERNAL_AUTH_PROVIDER_TIMEOUT_MS = 10_000;

function getStringQuery(req: Request, key: string) {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function validOrigin(value: unknown) {
  if (typeof value !== "string" || value.length > 512) return undefined;
  try {
    const url = new URL(value);
    if (url.origin !== value || !["https:", "http:"].includes(url.protocol)) return undefined;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function validMagicLinkToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

function normaliseAuthSender(value: string) {
  const sender = value.trim();
  if (!sender || /[\r\n]/.test(sender)) throw new Error("The passwordless-email sender is not configured safely.");
  const emailMatch = sender.match(/^(?:[^<>\r\n]+\s+<)?([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>?$/);
  if (!emailMatch) throw new Error("The passwordless-email sender is not configured safely.");
  db.normaliseAuthEmail(emailMatch[1]);
  return sender;
}

function matchesState(expected: string | undefined, actual: string | undefined) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function readGoogleLoginState(req: Request) {
  const raw = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { state?: unknown; origin?: unknown };
    const origin = validOrigin(parsed.origin);
    return typeof parsed.state === "string" && origin ? { state: parsed.state, origin } : undefined;
  } catch {
    return undefined;
  }
}

function clearGoogleStateCookie(req: Request, res: Response) {
  res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/", secure: true, sameSite: "lax", httpOnly: true });
}

function setGoogleSignInNotice(res: Response) {
  res.cookie(GOOGLE_SIGNIN_NOTICE_COOKIE, "google_success", { path: "/", secure: true, sameSite: "lax", httpOnly: false, maxAge: 60_000 });
}

async function createSession(req: Request, res: Response, user: { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null }, fallbackName: string) {
  const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
  const sessionId = await db.createUserSession({ userId: user.id, source: user.loginMethod ?? "external", userAgent: req.get("user-agent") ?? undefined, expiresAt });
  const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name?.trim() || fallbackName, sessionId, expiresInMs: ONE_YEAR_MS });
  res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
}

async function sendMagicLinkEmail(input: { email: string; link: string; subject?: string; text?: string; html?: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(EXTERNAL_AUTH_PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      from: normaliseAuthSender(ENV.authEmailFrom),
      to: input.email,
      subject: input.subject ?? "Your NSOS sign-in link",
      text: input.text ?? `Use this secure NSOS sign-in link within ${MAGIC_LINK_TTL_LABEL}: ${input.link}`,
      html: input.html ?? `<p>Use this secure NSOS sign-in link within ${MAGIC_LINK_TTL_LABEL}.</p><p><a href="${input.link}">Sign in to NSOS</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend rejected email delivery with status ${response.status}`);
}

export async function sendStaffSetupInvitationEmail(input: { email: string; schoolName: string; role: "admin" | "staff" | "teacher" | "finance"; jobTitle: string; origin: string }) {
  const origin = validOrigin(input.origin);
  if (!origin) throw new Error("Use a valid NSOS application address before sending the invitation.");
  const email = db.normaliseAuthEmail(input.email);
  const token = await db.createAuthMagicLink({ email, redirectOrigin: origin });
  const link = `${origin}/api/auth/email/verify?token=${encodeURIComponent(token)}`;
  const schoolName = input.schoolName.replace(/[<>]/g, "").trim().slice(0, 255);
  const jobTitle = input.jobTitle.replace(/[<>]/g, "").trim().slice(0, 120);
  const roleLabel = input.role === "admin" ? "administrator" : input.role;
  await sendMagicLinkEmail({ email, link, subject: `You are invited to ${schoolName} on NSOS`, text: `${schoolName} invited you to join NSOS as ${roleLabel} (${jobTitle}). Use this secure link within ${MAGIC_LINK_TTL_LABEL}: ${link}`, html: `<p>${schoolName} invited you to join NSOS as <strong>${roleLabel}</strong> (${jobTitle}).</p><p><a href="${link}">Accept invitation and sign in</a></p><p>This link expires in ${MAGIC_LINK_TTL_LABEL}. If you were not expecting this invitation, you can safely ignore this email.</p>` });
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google/start", (req: Request, res: Response) => {
    const origin = validOrigin(getStringQuery(req, "origin"));
    if (!origin) return res.status(400).json({ error: "A valid application origin is required." });
    if (!ENV.googleClientId || !ENV.googleClientSecret) return res.status(503).json({ error: "Google sign-in is not configured." });
    const state = randomBytes(32).toString("base64url");
    res.cookie(GOOGLE_STATE_COOKIE, JSON.stringify({ state, origin }), { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: STATE_TTL_MS });
    const redirectUri = `${origin}/api/auth/google/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: ENV.googleClientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, prompt: "select_account" }).toString();
    res.redirect(302, url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getStringQuery(req, "code");
    const state = getStringQuery(req, "state");
    const loginState = readGoogleLoginState(req);
    clearGoogleStateCookie(req, res);
    if (!code || !loginState || !matchesState(loginState.state, state)) return res.status(403).json({ error: "Google sign-in could not be verified. Please start again." });

    try {
      const redirectUri = `${loginState.origin}/api/auth/google/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(EXTERNAL_AUTH_PROVIDER_TIMEOUT_MS),
        body: new URLSearchParams({ code, client_id: ENV.googleClientId, client_secret: ENV.googleClientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      const tokenPayload = await tokenResponse.json().catch(() => ({})) as { access_token?: unknown };
      if (!tokenResponse.ok || typeof tokenPayload.access_token !== "string") throw new Error("Google token exchange failed.");
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tokenPayload.access_token}` }, signal: AbortSignal.timeout(EXTERNAL_AUTH_PROVIDER_TIMEOUT_MS) });
      const profile = await profileResponse.json().catch(() => ({})) as { sub?: unknown; email?: unknown; email_verified?: unknown; name?: unknown; picture?: unknown };
      if (!profileResponse.ok || typeof profile.sub !== "string" || typeof profile.email !== "string" || profile.email_verified !== true) throw new Error("Google account does not provide a verified email address.");
      const user = await db.resolveExternalAuthIdentity({ provider: "google", providerSubject: profile.sub, email: profile.email, name: typeof profile.name === "string" ? profile.name : null, avatarUrl: typeof profile.picture === "string" ? profile.picture : null });
      await createSession(req, res, user, profile.email);
      setGoogleSignInNotice(res);
      res.redirect(302, `${loginState.origin}/`);
    } catch (error) {
      console.error("[Auth] Google callback failed", error);
      res.status(502).json({ error: "Google sign-in could not be completed. Please try again." });
    }
  });
}

export function registerEmailAuthRoutes(app: Express) {
  app.post("/api/auth/email/request", async (req: Request, res: Response) => {
    const origin = validOrigin(req.body?.origin);
    const headerOrigin = validOrigin(req.get("origin"));
    if (!origin || !headerOrigin || origin !== headerOrigin) return res.status(400).json({ error: "A valid application origin is required." });
    try {
      const email = db.normaliseAuthEmail(req.body?.email ?? "");
      const token = await db.createAuthMagicLink({ email, redirectOrigin: origin });
      await sendMagicLinkEmail({ email, link: `${origin}/api/auth/email/verify?token=${encodeURIComponent(token)}` });
      res.status(202).json({ success: true, message: "If this email can receive NSOS sign-in links, one is on its way." });
    } catch (error) {
      if (error instanceof Error && error.message === "Enter a valid email address.") return res.status(400).json({ error: error.message });
      console.error("[Auth] Passwordless email request failed", error);
      res.status(503).json({ error: "We could not send a sign-in link right now. Please try again shortly." });
    }
  });

  app.get("/api/auth/email/verify", async (req: Request, res: Response) => {
    const token = getStringQuery(req, "token");
    if (!token || !validMagicLinkToken(token)) return res.status(400).json({ error: "This sign-in link is invalid or has expired." });
    try {
      const link = await db.consumeAuthMagicLink(token);
      const origin = validOrigin(link.redirectOrigin);
      if (!origin) throw new Error("The sign-in link does not have a valid destination.");
      const user = await db.resolveExternalAuthIdentity({ provider: "email", providerSubject: link.email, email: link.email });
      await db.acceptCopilotSetupAgentStaffInvitationsForVerifiedEmail({ email: link.email, userId: user.id });
      await createSession(req, res, user, link.email);
      res.redirect(302, `${origin}/`);
    } catch (error) {
      console.error("[Auth] Passwordless email verification failed", error);
      res.status(400).json({ error: "This sign-in link is invalid, expired, or already used." });
    }
  });
}

export const authRoutePolicies = { validOrigin, validMagicLinkToken, matchesState, normaliseAuthSender };
