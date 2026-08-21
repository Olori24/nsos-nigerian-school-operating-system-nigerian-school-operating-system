import { and, desc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import {
  academicSessions,
  academicTerms,
  advertisingCampaigns,
  aiTutorEscalations,
  aiTutorFeedback,
  aiTutorInteractions,
  aiTutorSessionSummaries,
  aiTutorTeachingPreferences,
  aiTutors,
  admissionDocuments,
  admissionsApplications,
  announcements,
  authIdentities,
  authMagicLinks,
  assessments,
  attendanceRecords,
  cashAssuranceCaseInvoices,
  cashAssuranceCases,
  cashAssuranceEvents,
  classes,
  classSubjects,
  copilotRecentSearches,
  curriculumMilestones,
  departments,
  enrollments,
  feeStructures,
  familyPaymentEvidenceNotifications,
  gradeScales,
  guardians,
  invoiceLineItems,
  invoices,
  leaveRequests,
  lessonPlans,
  messageLogs,
  payments,
  payrollRecords,
  performanceNotes,
  paymentEvidence,
  paymentPromises,
  platformBillingRecords,
  providerConfigurations,
  rateLimitBuckets,
  resultPublications,
  schemeOfWorkImports,
  schemeOfWorkInlineComments,
  schemeOfWorkRows,
  schoolAdvertisingAccounts,
  schoolBankAccounts,
  schoolCurriculumProfiles,
  schoolSubscriptions,
  securityAuditEvents,
  schoolMemberships,
  schoolDocumentTemplates,
  schoolWebsites,
  schools,
  scores,
  staffDuties,
  staffProfiles,
  staffSetupInvitations,
  studentGuardians,
  studentProfiles,
  subscriptionPlans,
  subjects,
  timetableEntries,
  teacherSchemeRevisionNotifications,
  teacherSchemeRevisionRecommendationOutcomes,
  type InsertUser,
  userSecurityActivity,
  userSessions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { generateSupervisedTutorResponse } from "./aiTutor";
import { generateReviewableAdCopy } from "./advertisingCopy";
import type { SchoolRole } from "./roles";
import { storagePut } from "./storage";
import { deriveTenantOnboardingStatus } from "./tenantOnboarding";
import { getNigerianCurriculumTemplate, type NigerianCurriculumTemplateId, listNigerianCurriculumTemplates } from "./nigerianCurriculum";
import { MAX_SCHEME_FILE_BYTES, normaliseReviewedSchemeRows, safeSchemeFileName, type ReviewedSchemeRow } from "./schemeOfWork";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export const DB_POOL_CONNECTION_LIMIT = 5;
export const DB_POOL_QUEUE_LIMIT = 20;

export function databasePoolOptions(uri: string) {
  return {
    uri,
    connectionLimit: DB_POOL_CONNECTION_LIMIT,
    maxIdle: DB_POOL_CONNECTION_LIMIT,
    idleTimeout: 60_000,
    waitForConnections: true,
    queueLimit: DB_POOL_QUEUE_LIMIT,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _pool ??= createPool(databasePoolOptions(process.env.DATABASE_URL));
    _db = drizzle({ client: _pool });
  }
  return _db;
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Configure DATABASE_URL before using NSOS.");
  return db;
}

function makeNumber(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function asDate(value: string | Date | undefined | null) {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
}

function normaliseDomain(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") || null;
}

export function isValidCustomDomain(value: string) {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);
}

export function matchesDomainVerificationRecord(records: string[][], token: string) {
  return records.flat().includes(`nsos-site-verification=${token}`);
}

export function isActivePublishedDomain(website: { domainStatus: string; published: boolean }) {
  return website.domainStatus === "active" && website.published;
}

type ProviderCategory = "payment" | "notification";
type ProviderCredentials = { apiKey?: string; secretKey?: string; webhookSecret?: string };
export type SmsDeliveryState = "pending" | "delivered" | "failed";
export type AdvertisingCampaignStatus = "draft" | "pending_approval" | "approved" | "launching" | "active" | "paused" | "completed" | "failed" | "archived";
type AdvertisingAudience = { locations: string[]; ageMin?: number; ageMax?: number; note?: string };

const NSOS_WEBHOOK_ORIGIN = "https://nsos-system-uhkdscaf.manus.space";

function encryptionKey() {
  if (!ENV.cookieSecret) throw new Error("Provider credentials cannot be stored until the application secret is configured.");
  return createHash("sha256").update(`nsos-provider-configuration:${ENV.cookieSecret}`).digest();
}

export function sealProviderCredentials(credentials: ProviderCredentials) {
  const compact = Object.fromEntries(Object.entries(credentials).filter(([, value]) => typeof value === "string" && value.trim().length > 0));
  if (!Object.keys(compact).length) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(compact), "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function openProviderCredentials(payload: string | null) {
  if (!payload) return {} as ProviderCredentials;
  const [version, ivValue, tagValue, ciphertextValue] = payload.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) throw new Error("Stored provider credentials are invalid. Save the provider configuration again.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8")) as ProviderCredentials;
}

function bankAccountEncryptionKey() {
  if (!ENV.cookieSecret) throw new Error("Bank account details cannot be stored until the application secret is configured.");
  return createHash("sha256").update(`nsos-school-bank-account:${ENV.cookieSecret}`).digest();
}

export function normaliseNigerianBankAccountNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{10}$/.test(digits)) throw new Error("Enter a valid 10-digit Nigerian bank account number.");
  return digits;
}

export function maskBankAccountNumber(value: string) {
  const accountNumber = normaliseNigerianBankAccountNumber(value);
  return `••••••${accountNumber.slice(-4)}`;
}

export function sealBankAccountNumber(value: string) {
  const accountNumber = normaliseNigerianBankAccountNumber(value);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", bankAccountEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(accountNumber, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function providerReadiness(category: ProviderCategory, provider: string, hasCredentials: boolean, status: "draft" | "ready" | "disabled") {
  if (status === "disabled") return "Disabled";
  if (!hasCredentials && provider !== "manual" && provider !== "in_app") return "Credentials required";
  return category === "payment" ? "Ready for payment adapter" : "Ready for notification adapter";
}

export function providerRequiresCredentials(provider: string) {
  return provider !== "manual" && provider !== "in_app";
}

export function providerTestRequest(provider: string, credentials: ProviderCredentials) {
  const token = credentials.secretKey || credentials.apiKey;
  if (!token && providerRequiresCredentials(provider)) throw new Error("Store provider credentials before testing this connection.");
  if (provider === "manual" || provider === "in_app") return null;
  if (provider === "paystack") return { url: "https://api.paystack.co/bank?perPage=1", init: { headers: { Authorization: `Bearer ${token}` } } };
  if (provider === "flutterwave") return { url: "https://api.flutterwave.com/v3/balances", init: { headers: { Authorization: `Bearer ${token}` } } };
  if (provider === "stripe") return { url: "https://api.stripe.com/v1/balance", init: { headers: { Authorization: `Bearer ${token}` } } };
  if (provider === "termii") return { url: `https://api.ng.termii.com/api/get-balance?api_key=${encodeURIComponent(token!)}`, init: {} };
  if (provider === "twilio") return { url: "https://api.twilio.com/2010-04-01/Accounts.json?PageSize=1", init: { headers: { Authorization: `Basic ${Buffer.from(`${credentials.apiKey ?? ""}:${credentials.secretKey ?? ""}`).toString("base64")}` } } };
  if (provider === "resend") return { url: "https://api.resend.com/domains?limit=1", init: { headers: { Authorization: `Bearer ${token}` } } };
  if (provider === "sendgrid") return { url: "https://api.sendgrid.com/v3/user/profile", init: { headers: { Authorization: `Bearer ${token}` } } };
  if (provider === "whatsapp_cloud") return { url: "https://graph.facebook.com/v20.0/me", init: { headers: { Authorization: `Bearer ${token}` } } };
  throw new Error("This provider does not support a connection test yet.");
}

export function normaliseSmsRecipient(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^0\d{10}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^234\d{10}$/.test(digits)) return digits;
  if (/^[1-9]\d{7,14}$/.test(digits)) return digits;
  throw new Error("Enter a valid mobile number in Nigerian (080…) or international format.");
}

export function maskSmsRecipient(value: string) {
  return value.length <= 6 ? "••••" : `${value.slice(0, 4)}••••${value.slice(-3)}`;
}

const sensitiveAuditMetadataKey = /(?:api|auth|credential|key|password|phone|recipient|secret|token|email|body)/i;

export function sanitizeSecurityAuditMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => {
    if (sensitiveAuditMetadataKey.test(key)) return [key, "[REDACTED]"];
    if (typeof value === "string") return [key, value.slice(0, 160)];
    if (typeof value === "number" || typeof value === "boolean" || value === null) return [key, value];
    return [key, "[OMITTED]"];
  }));
}

export async function recordSecurityAuditEvent(input: { schoolId: number; actorUserId?: number; eventType: string; targetType: string; targetId?: string | number; metadata?: Record<string, unknown> }) {
  await (await database()).insert(securityAuditEvents).values({ schoolId: input.schoolId, actorUserId: input.actorUserId ?? null, eventType: input.eventType.slice(0, 96), targetType: input.targetType.slice(0, 96), targetId: input.targetId === undefined ? null : String(input.targetId).slice(0, 128), metadata: sanitizeSecurityAuditMetadata(input.metadata ?? {}) });
}

export async function listSecurityAuditEvents(schoolId: number, limit = 50) {
  return (await database()).select({ id: securityAuditEvents.id, actorUserId: securityAuditEvents.actorUserId, eventType: securityAuditEvents.eventType, targetType: securityAuditEvents.targetType, targetId: securityAuditEvents.targetId, metadata: securityAuditEvents.metadata, occurredAt: securityAuditEvents.occurredAt }).from(securityAuditEvents).where(eq(securityAuditEvents.schoolId, schoolId)).orderBy(desc(securityAuditEvents.occurredAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function consumeSharedRateLimit(input: { namespace: string; route: string; clientKey: string; limit: number; windowMs: number; now?: number }) {
  const now = input.now ?? Date.now();
  const windowStartedAt = Math.floor(now / input.windowMs) * input.windowMs;
  const expiresAt = new Date(windowStartedAt + input.windowMs);
  const bucketMaterial = `${input.namespace}:${input.route}:${input.clientKey}:${windowStartedAt}`;
  const bucketKey = createHmac("sha256", encryptionKey()).update(bucketMaterial).digest("hex");
  const db = await database();
  await db.insert(rateLimitBuckets).values({ bucketKey, count: 1, expiresAt }).onDuplicateKeyUpdate({ set: { count: sql`${rateLimitBuckets.count} + 1`, expiresAt } });
  const bucket = (await db.select({ count: rateLimitBuckets.count, expiresAt: rateLimitBuckets.expiresAt }).from(rateLimitBuckets).where(eq(rateLimitBuckets.bucketKey, bucketKey)).limit(1))[0];
  if (Math.random() < 0.01) void db.delete(rateLimitBuckets).where(sql`${rateLimitBuckets.expiresAt} < ${new Date(now)}`);
  const count = Number(bucket?.count ?? input.limit + 1);
  return { allowed: count <= input.limit, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
}

export async function saveCopilotRecentSearch(input: { userId: number; schoolId: number; query: string; destinationId?: string | null }) {
  const query = input.query.trim().slice(0, 600);
  if (!query) return;
  await (await database()).insert(copilotRecentSearches).values({ userId: input.userId, schoolId: input.schoolId, query, destinationId: input.destinationId?.slice(0, 32) || null, searchedAt: new Date() }).onDuplicateKeyUpdate({ set: { destinationId: input.destinationId?.slice(0, 32) || null, searchedAt: new Date() } });
}

export async function listCopilotRecentSearches(input: { userId: number; schoolId: number; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 12);
  return (await (await database()).select({ id: copilotRecentSearches.id, query: copilotRecentSearches.query, destinationId: copilotRecentSearches.destinationId, searchedAt: copilotRecentSearches.searchedAt }).from(copilotRecentSearches).where(and(eq(copilotRecentSearches.userId, input.userId), eq(copilotRecentSearches.schoolId, input.schoolId))).orderBy(desc(copilotRecentSearches.searchedAt)).limit(limit));
}

export async function clearCopilotRecentSearches(input: { userId: number; schoolId: number }) {
  const result = await (await database()).delete(copilotRecentSearches).where(and(eq(copilotRecentSearches.userId, input.userId), eq(copilotRecentSearches.schoolId, input.schoolId)));
  return { deletedCount: Number(result[0]?.affectedRows ?? 0) };
}

function signaturesMatch(received: string | undefined, expected: string) {
  if (!received) return false;
  const candidate = Buffer.from(received.trim(), "utf8");
  const trusted = Buffer.from(expected, "utf8");
  return candidate.length === trusted.length && timingSafeEqual(candidate, trusted);
}

export function verifyTermiiWebhookSignature(rawPayload: string, signature: string | undefined, webhookSecret: string) {
  const mac = createHmac("sha512", webhookSecret).update(rawPayload, "utf8");
  return signaturesMatch(signature, mac.digest("hex")) || signaturesMatch(signature, createHmac("sha512", webhookSecret).update(rawPayload, "utf8").digest("base64"));
}

export function verifyTwilioWebhookSignature(input: { callbackUrl: string; formFields: Record<string, string | string[]>; signature?: string; authToken: string }) {
  const signedPayload = Object.keys(input.formFields)
    .sort()
    .reduce((value, key) => {
      const fieldValues = Array.isArray(input.formFields[key]) ? [...input.formFields[key]].sort() : [input.formFields[key] as string];
      return `${value}${key}${fieldValues.join("")}`;
    }, input.callbackUrl);
  const expected = createHmac("sha1", input.authToken).update(signedPayload, "utf8").digest("base64");
  return signaturesMatch(input.signature, expected);
}

export function mapTermiiSmsDeliveryStatus(status: string | undefined): SmsDeliveryState {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "delivered") return "delivered";
  if (["dnd active on phone number", "message failed", "rejected", "expired"].includes(normalized ?? "")) return "failed";
  return "pending";
}

export function mapTwilioSmsDeliveryStatus(status: string | undefined): SmsDeliveryState {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "delivered") return "delivered";
  if (["failed", "undelivered"].includes(normalized ?? "")) return "failed";
  return "pending";
}

export function canApplySmsDeliveryTransition(currentStatus: "queued" | "sent" | "failed", incoming: SmsDeliveryState) {
  return currentStatus === "queued" && incoming !== "pending";
}

export function getSmsDeliveryWebhookUrls(schoolId: number) {
  const query = `?schoolId=${schoolId}`;
  return {
    termii: `${NSOS_WEBHOOK_ORIGIN}/api/webhooks/sms/termii${query}`,
    twilio: `${NSOS_WEBHOOK_ORIGIN}/api/webhooks/sms/twilio${query}`,
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await database();
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await database();
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export type ExternalAuthProvider = "google" | "email";

export function normaliseAuthEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) throw new Error("Enter a valid email address.");
  return email;
}

export function normaliseGoogleProfileImageUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const googleImageHost = url.hostname === "lh3.googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com");
    return url.protocol === "https:" && googleImageHost ? url.toString() : null;
  } catch {
    return null;
  }
}

function externalOpenId(provider: ExternalAuthProvider) {
  return `external:${provider}:${crypto.randomUUID()}`;
}

export async function resolveExternalAuthIdentity(input: { provider: ExternalAuthProvider; providerSubject: string; email: string; name?: string | null; avatarUrl?: string | null }) {
  const db = await database();
  const providerSubject = input.providerSubject.trim();
  const email = normaliseAuthEmail(input.email);
  const avatarUrl = input.provider === "google" ? normaliseGoogleProfileImageUrl(input.avatarUrl) : null;
  if (!providerSubject || providerSubject.length > 320) throw new Error("External identity is invalid.");
  const existingIdentity = (await db.select().from(authIdentities).where(and(eq(authIdentities.provider, input.provider), eq(authIdentities.providerSubject, providerSubject))).limit(1))[0];
  if (existingIdentity) {
    const existingUser = (await db.select().from(users).where(eq(users.id, existingIdentity.userId)).limit(1))[0];
    if (!existingUser) throw new Error("External identity is not linked to an NSOS account.");
    await db.update(authIdentities).set({ lastUsedAt: new Date(), email }).where(eq(authIdentities.id, existingIdentity.id));
    if (avatarUrl && existingUser.avatarUrl !== avatarUrl) {
      await db.update(users).set({ avatarUrl }).where(eq(users.id, existingUser.id));
      existingUser.avatarUrl = avatarUrl;
    }
    await upsertUser({ openId: existingUser.openId, lastSignedIn: new Date() });
    return existingUser;
  }

  // A matching email alone must not attach a newly verified external provider
  // to a pre-existing Manus user, because that user may already own tenant data.
  // External providers may share their own local account; linking a legacy
  // Manus account requires a separate explicit reauthentication flow.
  let user = (await db.select().from(users).where(and(eq(users.email, email), like(users.openId, "external:%"))).limit(1))[0];
  if (!user) {
    const created = await db.insert(users).values({ openId: externalOpenId(input.provider), name: input.name?.trim().slice(0, 255) || null, email, avatarUrl, loginMethod: input.provider, lastSignedIn: new Date() });
    user = (await db.select().from(users).where(eq(users.id, Number(created[0].insertId))).limit(1))[0];
  }
  if (!user) throw new Error("Unable to create an NSOS account.");
  if (avatarUrl && user.avatarUrl !== avatarUrl) {
    await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));
    user.avatarUrl = avatarUrl;
  }
  await db.insert(authIdentities).values({ userId: user.id, provider: input.provider, providerSubject, email, lastUsedAt: new Date() }).onDuplicateKeyUpdate({ set: { lastUsedAt: new Date(), email } });
  const identity = (await db.select().from(authIdentities).where(and(eq(authIdentities.provider, input.provider), eq(authIdentities.providerSubject, providerSubject))).limit(1))[0];
  if (!identity) throw new Error("Unable to link the external identity.");
  const linkedUser = (await db.select().from(users).where(eq(users.id, identity.userId)).limit(1))[0];
  if (!linkedUser) throw new Error("External identity is not linked to an NSOS account.");
  await upsertUser({ openId: linkedUser.openId, lastSignedIn: new Date() });
  return linkedUser;
}

export async function createAuthMagicLink(input: { email: string; redirectOrigin: string }) {
  const db = await database();
  const email = normaliseAuthEmail(input.email);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  await db.insert(authMagicLinks).values({ email, tokenHash, redirectOrigin: input.redirectOrigin, expiresAt: new Date(now.getTime() + 15 * 60_000) });
  if (Math.random() < 0.05) void db.delete(authMagicLinks).where(sql`${authMagicLinks.expiresAt} < ${now}`);
  return token;
}

export async function consumeAuthMagicLink(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = await database();
  const link = (await db.select().from(authMagicLinks).where(eq(authMagicLinks.tokenHash, tokenHash)).limit(1))[0];
  if (!link) throw new Error("This sign-in link is invalid or has expired.");
  const updated = await db.update(authMagicLinks).set({ usedAt: new Date() }).where(and(eq(authMagicLinks.id, link.id), isNull(authMagicLinks.usedAt), gt(authMagicLinks.expiresAt, new Date())));
  const affectedRows = Number((updated as any)?.[0]?.affectedRows ?? (updated as any)?.affectedRows ?? 0);
  if (affectedRows !== 1) throw new Error("This sign-in link has already been used or has expired.");
  return link;
}

export function sessionDeviceLabel(userAgent: string | undefined) {
  const value = userAgent ?? "";
  const platform = /iPhone|iPad|iPod/i.test(value) ? "iPhone or iPad" : /Android/i.test(value) ? "Android device" : /Windows/i.test(value) ? "Windows device" : /Macintosh|Mac OS X/i.test(value) ? "Mac" : /Linux/i.test(value) ? "Linux device" : "Unknown device";
  const browser = /Edg\//i.test(value) ? "Microsoft Edge" : /OPR\//i.test(value) ? "Opera" : /Firefox\//i.test(value) ? "Firefox" : /Chrome\//i.test(value) && !/Chromium/i.test(value) ? "Chrome" : /Safari\//i.test(value) && !/Chrome\//i.test(value) ? "Safari" : "Browser";
  return `${browser} on ${platform}`;
}

export type SessionDeviceKind = "desktop" | "mobile" | "tablet" | "unknown";

export function sessionDeviceKind(userAgent: string | undefined): SessionDeviceKind {
  const value = userAgent ?? "";
  if (/iPad|Tablet|Kindle|Silk\//i.test(value)) return "tablet";
  if (/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(value)) return "mobile";
  if (/Windows|Macintosh|Mac OS X|Linux|CrOS/i.test(value)) return "desktop";
  return "unknown";
}

export function sessionLocationLabel(timeZone: string | undefined) {
  const value = timeZone?.trim();
  if (!value || value.length > 80 || !/^[A-Za-z]+(?:\/[A-Za-z_+-]+)+$/.test(value)) return null;
  const country = value === "Africa/Lagos" ? "Nigeria" : value === "Africa/Accra" ? "Ghana" : value === "Africa/Nairobi" ? "Kenya" : value === "Africa/Johannesburg" ? "South Africa" : undefined;
  return country ? `${country} · ${value}` : value.replace(/_/g, " ");
}

export function legacySessionId(sessionToken: string) {
  return `legacy:${createHmac("sha256", encryptionKey()).update(sessionToken).digest("hex").slice(0, 48)}`;
}

export async function createUserSession(input: { userId: number; source: string; userAgent?: string; timeZone?: string; expiresAt: Date }) {
  const id = crypto.randomUUID();
  const userAgent = input.userAgent?.slice(0, 512) || null;
  const source = input.source.slice(0, 32);
  const deviceLabel = sessionDeviceLabel(userAgent ?? undefined);
  const locationLabel = sessionLocationLabel(input.timeZone);
  const db = await database();
  await db.insert(userSessions).values({ id, userId: input.userId, source, deviceLabel, userAgent, locationLabel, expiresAt: input.expiresAt });
  await db.insert(userSecurityActivity).values({ userId: input.userId, eventType: "session_verified", deviceLabel, locationLabel, source });
  return id;
}

export async function ensureActiveUserSession(input: { userId: number; sessionId: string; source: string; userAgent?: string; timeZone?: string; expiresAt: Date }) {
  const db = await database();
  const now = new Date();
  const existing = (await db.select().from(userSessions).where(eq(userSessions.id, input.sessionId)).limit(1))[0];
  if (existing) {
    if (existing.userId !== input.userId || existing.revokedAt || existing.expiresAt <= now) return false;
    await db.update(userSessions).set({ lastSeenAt: now }).where(eq(userSessions.id, input.sessionId));
    return true;
  }
  const userAgent = input.userAgent?.slice(0, 512) || null;
  await db.insert(userSessions).values({ id: input.sessionId, userId: input.userId, source: input.source.slice(0, 32), deviceLabel: sessionDeviceLabel(userAgent ?? undefined), userAgent, locationLabel: sessionLocationLabel(input.timeZone), expiresAt: input.expiresAt, lastSeenAt: now });
  await db.insert(userSecurityActivity).values({ userId: input.userId, eventType: "session_verified", deviceLabel: sessionDeviceLabel(userAgent ?? undefined), locationLabel: sessionLocationLabel(input.timeZone), source: input.source.slice(0, 32), occurredAt: now });
  return true;
}

export async function listActiveUserSessions(userId: number) {
  const now = new Date();
  return (await (await database()).select({ id: userSessions.id, source: userSessions.source, deviceLabel: userSessions.deviceLabel, userAgent: userSessions.userAgent, locationLabel: userSessions.locationLabel, createdAt: userSessions.createdAt, lastSeenAt: userSessions.lastSeenAt, expiresAt: userSessions.expiresAt }).from(userSessions).where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, now))).orderBy(desc(userSessions.lastSeenAt))).map(({ userAgent, ...session }) => ({ ...session, deviceKind: sessionDeviceKind(userAgent ?? undefined) }));
}

export async function updateUserSessionLocation(input: { userId: number; sessionId: string; timeZone?: string }) {
  const locationLabel = sessionLocationLabel(input.timeZone);
  if (!locationLabel) return false;
  const updated = await (await database()).update(userSessions).set({ locationLabel, lastSeenAt: new Date() }).where(and(eq(userSessions.id, input.sessionId), eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt)));
  return Number((updated as any)?.[0]?.affectedRows ?? (updated as any)?.affectedRows ?? 0) === 1;
}

export async function revokeUserSession(input: { userId: number; sessionId: string; reason: string }) {
  const db = await database();
  const session = (await db.select({ deviceLabel: userSessions.deviceLabel, locationLabel: userSessions.locationLabel, source: userSessions.source }).from(userSessions).where(and(eq(userSessions.id, input.sessionId), eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt))).limit(1))[0];
  if (!session) return false;
  const occurredAt = new Date();
  const updated = await db.update(userSessions).set({ revokedAt: occurredAt, revokedReason: input.reason.slice(0, 96) }).where(and(eq(userSessions.id, input.sessionId), eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt)));
  const revoked = Number((updated as any)?.[0]?.affectedRows ?? (updated as any)?.affectedRows ?? 0) === 1;
  if (revoked) await db.insert(userSecurityActivity).values({ userId: input.userId, eventType: "session_revoked", deviceLabel: session.deviceLabel, locationLabel: session.locationLabel, source: session.source, occurredAt });
  return revoked;
}

export async function revokeOtherUserSessions(input: { userId: number; currentSessionId: string; reason: string }) {
  const db = await database();
  const active = await listActiveUserSessions(input.userId);
  const targets = active.filter(session => session.id !== input.currentSessionId);
  const occurredAt = new Date();
  await Promise.all(targets.map(session => db.update(userSessions).set({ revokedAt: occurredAt, revokedReason: input.reason.slice(0, 96) }).where(and(eq(userSessions.id, session.id), eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt)))));
  if (targets.length) await db.insert(userSecurityActivity).values(targets.map(session => ({ userId: input.userId, eventType: "session_revoked", deviceLabel: session.deviceLabel, locationLabel: session.locationLabel, source: session.source, occurredAt })));
  return targets.length;
}

export async function listUserSecurityActivity(userId: number, limit = 20) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  return (await (await database()).select({ id: userSecurityActivity.id, eventType: userSecurityActivity.eventType, deviceLabel: userSecurityActivity.deviceLabel, locationLabel: userSecurityActivity.locationLabel, source: userSecurityActivity.source, occurredAt: userSecurityActivity.occurredAt }).from(userSecurityActivity).where(eq(userSecurityActivity.userId, userId)).orderBy(desc(userSecurityActivity.occurredAt)).limit(safeLimit));
}

export async function listUserSchools(userId: number) {
  const db = await database();
  return db
    .select({ id: schools.id, name: schools.name, shortCode: schools.shortCode, state: schools.state, role: schoolMemberships.role })
    .from(schoolMemberships)
    .innerJoin(schools, eq(schoolMemberships.schoolId, schools.id))
    .where(and(eq(schoolMemberships.userId, userId), eq(schoolMemberships.status, "active")));
}

export async function getSchoolByCode(shortCode: string) {
  const db = await database();
  const school = (await db.select({ id: schools.id, name: schools.name, shortCode: schools.shortCode, state: schools.state }).from(schools).where(eq(schools.shortCode, shortCode.trim().toUpperCase())).limit(1))[0];
  if (!school) return undefined;
  const template = await getSchoolDocumentTemplate(school.id);
  return { ...school, admissionTemplate: publicAdmissionTemplate(template) };
}

export async function createSchool(input: { name: string; shortCode: string; state?: string; email?: string; phone?: string; createdBy: number }) {
  const db = await database();
  const created = await db.insert(schools).values({ ...input, shortCode: input.shortCode.trim().toUpperCase(), currency: "NGN", timezone: "Africa/Lagos" });
  const schoolId = Number(created[0].insertId);
  await db.insert(schoolMemberships).values({ schoolId, userId: input.createdBy, role: "owner", status: "active" });
  await db.insert(schoolSubscriptions).values({ schoolId, status: "trial", billingCycle: "manual", assignedBy: input.createdBy, note: "Commercial plan not yet assigned." });
  return { schoolId };
}

type PlatformSubscriptionStatus = "trial" | "active" | "payment_due" | "suspended" | "cancelled";
type PlatformBillingCycle = "monthly" | "annual" | "manual";

export async function getPlatformRevenueOverview() {
  const db = await database();
  const [plans, schoolRows, subscriptions, billingRecords] = await Promise.all([
    db.select().from(subscriptionPlans).orderBy(desc(subscriptionPlans.createdAt)),
    db.select({ id: schools.id, name: schools.name, shortCode: schools.shortCode, state: schools.state, createdAt: schools.createdAt }).from(schools).orderBy(desc(schools.createdAt)),
    db.select().from(schoolSubscriptions),
    db.select().from(platformBillingRecords).orderBy(desc(platformBillingRecords.createdAt)),
  ]);
  const schoolsWithRevenue = schoolRows.map(school => {
    const subscription = subscriptions.find(item => item.schoolId === school.id) ?? null;
    const plan = subscription?.planId ? plans.find(item => item.id === subscription.planId) ?? null : null;
    const records = billingRecords.filter(item => item.schoolId === school.id);
    return { ...school, subscription, plan, billingRecords: records };
  });
  const issued = billingRecords.filter(record => record.status === "issued" || record.status === "paid");
  const collected = billingRecords.filter(record => record.status === "paid");
  return {
    plans,
    schools: schoolsWithRevenue,
    metrics: {
      schoolCount: schoolRows.length,
      activeSubscriptions: subscriptions.filter(item => item.status === "active").length,
      paymentDueSubscriptions: subscriptions.filter(item => item.status === "payment_due").length,
      invoiced: issued.reduce((total, record) => total + Number(record.amount), 0),
      collected: collected.reduce((total, record) => total + Number(record.amount), 0),
    },
  };
}

export async function createSubscriptionPlan(input: { code: string; name: string; description?: string; monthlyAmount: number; annualAmount: number; studentLimit?: number; createdBy: number }) {
  const db = await database();
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
  if (!code) throw new Error("A subscription plan code is required.");
  const created = await db.insert(subscriptionPlans).values({ code, name: input.name.trim(), description: input.description?.trim() || null, monthlyAmount: String(input.monthlyAmount), annualAmount: String(input.annualAmount), studentLimit: input.studentLimit ?? null, createdBy: input.createdBy });
  return { planId: Number(created[0].insertId) };
}

export async function assignSchoolSubscription(input: { schoolId: number; planId?: number; status: PlatformSubscriptionStatus; billingCycle: PlatformBillingCycle; startsAt?: string; endsAt?: string; note?: string; assignedBy: number }) {
  const db = await database();
  const school = (await db.select({ id: schools.id }).from(schools).where(eq(schools.id, input.schoolId)).limit(1))[0];
  if (!school) throw new Error("School not found.");
  if (input.planId) {
    const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, input.planId)).limit(1))[0];
    if (!plan || plan.status !== "active") throw new Error("Select an active subscription plan.");
  }
  const startsAt = input.startsAt ? asDate(input.startsAt) : new Date();
  const endsAt = input.endsAt ? asDate(input.endsAt) : null;
  if (endsAt && startsAt && endsAt <= startsAt) throw new Error("Subscription end date must be after its start date.");
  const values = { schoolId: input.schoolId, planId: input.planId ?? null, status: input.status, billingCycle: input.billingCycle, startsAt, endsAt, note: input.note?.trim() || null, assignedBy: input.assignedBy };
  await db.insert(schoolSubscriptions).values(values).onDuplicateKeyUpdate({ set: values });
  return getSchoolSubscription(input.schoolId);
}

export async function getSchoolSubscription(schoolId: number) {
  const db = await database();
  const subscription = (await db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.schoolId, schoolId)).limit(1))[0] ?? null;
  const plan = subscription?.planId ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId)).limit(1))[0] ?? null : null;
  const billingRecords = await db.select({ id: platformBillingRecords.id, invoiceNo: platformBillingRecords.invoiceNo, amount: platformBillingRecords.amount, currency: platformBillingRecords.currency, status: platformBillingRecords.status, issueDate: platformBillingRecords.issueDate, dueDate: platformBillingRecords.dueDate, paidAt: platformBillingRecords.paidAt, paymentMethod: platformBillingRecords.paymentMethod }).from(platformBillingRecords).where(eq(platformBillingRecords.schoolId, schoolId)).orderBy(desc(platformBillingRecords.createdAt));
  return { subscription, plan, billingRecords };
}

export async function issuePlatformBillingRecord(input: { schoolId: number; issueDate: string; dueDate?: string; note?: string; createdBy: number }) {
  const db = await database();
  const subscription = (await db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.schoolId, input.schoolId)).limit(1))[0];
  if (!subscription?.planId) throw new Error("Assign an active subscription plan before issuing a platform billing record.");
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId)).limit(1))[0];
  if (!plan || plan.status !== "active") throw new Error("The assigned subscription plan is unavailable for billing.");
  const amount = subscription.billingCycle === "annual" ? Number(plan.annualAmount) : Number(plan.monthlyAmount);
  if (subscription.billingCycle === "manual" || amount <= 0) throw new Error("Set a paid monthly or annual plan before issuing a platform billing record.");
  const created = await db.insert(platformBillingRecords).values({ schoolId: input.schoolId, subscriptionId: subscription.id, planId: plan.id, invoiceNo: makeNumber("NSOS"), amount: String(amount), currency: plan.currency, status: "issued", issueDate: asDate(input.issueDate)!, dueDate: asDate(input.dueDate), note: input.note?.trim() || null, createdBy: input.createdBy });
  return { billingRecordId: Number(created[0].insertId), schoolId: input.schoolId };
}

export async function recordPlatformBillingPayment(input: { billingRecordId: number; paidAt: string; paymentMethod: "bank_transfer" | "card" | "manual"; providerReference?: string; settledBy: number }) {
  const db = await database();
  const record = (await db.select().from(platformBillingRecords).where(eq(platformBillingRecords.id, input.billingRecordId)).limit(1))[0];
  if (!record) throw new Error("Platform billing record not found.");
  if (record.status !== "issued") throw new Error("Only an issued platform billing record can be marked as paid.");
  await db.update(platformBillingRecords).set({ status: "paid", paidAt: asDate(input.paidAt) ?? new Date(), paymentMethod: input.paymentMethod, providerReference: input.providerReference?.trim() || null, settledBy: input.settledBy }).where(and(eq(platformBillingRecords.id, input.billingRecordId), eq(platformBillingRecords.status, "issued")));
  return { schoolId: record.schoolId, billingRecordId: record.id };
}

export async function listProviderConfigurations(schoolId: number) {
  const db = await database();
  const rows = await db.select().from(providerConfigurations).where(eq(providerConfigurations.schoolId, schoolId));
  return (["payment", "notification"] as const).map(category => {
    const row = rows.find(item => item.category === category);
    const hasCredentials = Boolean(row?.encryptedCredentials);
    const hasWebhookSecret = Boolean(row?.encryptedCredentials && openProviderCredentials(row.encryptedCredentials).webhookSecret);
    return row
      ? { id: row.id, category, provider: row.provider, status: row.status, configuration: row.configuration as Record<string, unknown>, hasCredentials, hasWebhookSecret, readiness: providerReadiness(category, row.provider, hasCredentials, row.status), lastValidatedAt: row.lastValidatedAt, updatedAt: row.updatedAt }
      : { id: null, category, provider: category === "payment" ? "paystack" : "termii", status: "draft" as const, configuration: {}, hasCredentials: false, hasWebhookSecret: false, readiness: "Not configured", lastValidatedAt: null, updatedAt: null };
  });
}

export async function saveProviderConfiguration(input: { schoolId: number; category: ProviderCategory; provider: string; status: "draft" | "ready" | "disabled"; configuration: Record<string, unknown>; credentials?: ProviderCredentials; clearCredentials?: boolean; configuredBy: number }) {
  const db = await database();
  const existing = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, input.schoolId), eq(providerConfigurations.category, input.category))).limit(1))[0];
  const encryptedCredentials = input.clearCredentials ? null : sealProviderCredentials(input.credentials ?? {}) ?? existing?.encryptedCredentials ?? null;
  if (input.status === "ready" && providerRequiresCredentials(input.provider) && !encryptedCredentials) throw new Error("Store provider credentials before marking this configuration ready.");
  const values = { schoolId: input.schoolId, category: input.category, provider: input.provider, status: input.status, configuration: input.configuration, encryptedCredentials, configuredBy: input.configuredBy, lastValidatedAt: null };
  await db.insert(providerConfigurations).values(values).onDuplicateKeyUpdate({ set: values });
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.configuredBy, eventType: input.clearCredentials ? "provider_credentials_cleared" : "provider_configuration_saved", targetType: "provider_configuration", targetId: `${input.category}:${input.provider}`, metadata: { category: input.category, provider: input.provider, status: input.status, credentialsState: input.clearCredentials ? "cleared" : encryptedCredentials ? "stored" : "not_provided" } });
  return listProviderConfigurations(input.schoolId);
}

export async function getSmsWebhookVerificationSecret(schoolId: number, provider: "termii" | "twilio") {
  const db = await database();
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, schoolId), eq(providerConfigurations.category, "notification"), eq(providerConfigurations.provider, provider), eq(providerConfigurations.status, "ready"))).limit(1))[0];
  if (!configuration) return undefined;
  const credentials = openProviderCredentials(configuration.encryptedCredentials);
  return provider === "termii" ? credentials.webhookSecret : credentials.secretKey;
}

export async function updateProviderSmsDeliveryStatus(input: { schoolId: number; providerMessageId: string; deliveryState: SmsDeliveryState }) {
  const db = await database();
  const log = (await db.select().from(messageLogs).where(and(eq(messageLogs.schoolId, input.schoolId), eq(messageLogs.providerMessageId, input.providerMessageId), eq(messageLogs.channel, "sms"))).limit(1))[0];
  if (!log) return { updated: false, reason: "message_not_found" as const };
  if (!canApplySmsDeliveryTransition(log.status, input.deliveryState)) return { updated: false, reason: input.deliveryState === "pending" ? "non_terminal_event" as const : "already_terminal" as const, status: log.status };
  const status = input.deliveryState === "delivered" ? "sent" : "failed";
  await db.update(messageLogs).set({ status, sentAt: status === "sent" ? new Date() : null }).where(and(eq(messageLogs.id, log.id), eq(messageLogs.schoolId, input.schoolId), eq(messageLogs.status, "queued")));
  return { updated: true, status };
}

export async function testProviderConnection(schoolId: number, category: ProviderCategory) {
  const db = await database();
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, schoolId), eq(providerConfigurations.category, category))).limit(1))[0];
  if (!configuration) throw new Error("Configure this provider before testing its connection.");
  if (configuration.status === "disabled") throw new Error("Enable or save this provider as a draft before testing it.");
  const credentials = openProviderCredentials(configuration.encryptedCredentials);
  const request = providerTestRequest(configuration.provider, credentials);
  if (!request) return { ok: true, message: "This internal workflow is ready; it does not require an external connection.", testedAt: new Date() };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(request.url, { ...request.init, method: "GET", signal: controller.signal, headers: { Accept: "application/json", ...(request.init.headers ?? {}) } });
    if (!response.ok) return { ok: false, message: `The provider rejected the verification request (HTTP ${response.status}). Check the saved credentials and account permissions.`, testedAt: new Date() };
    const testedAt = new Date();
    await db.update(providerConfigurations).set({ lastValidatedAt: testedAt }).where(eq(providerConfigurations.id, configuration.id));
    return { ok: true, message: "Connection verified. No payment or notification was sent.", testedAt };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return { ok: false, message: timedOut ? "The provider did not respond within eight seconds." : "NSOS could not reach the provider. Check network access and provider availability.", testedAt: new Date() };
  } finally {
    clearTimeout(timeout);
  }
}

function metaAccountId(value: string) {
  const normalized = value.trim().replace(/^act_/i, "");
  if (!/^\d{3,80}$/.test(normalized)) throw new Error("Enter the numeric Meta ad account ID, with or without the act_ prefix.");
  return `act_${normalized}`;
}

function advertisingAccountView(account?: typeof schoolAdvertisingAccounts.$inferSelect) {
  return account
    ? { id: account.id, provider: account.provider, status: account.status, accountName: account.accountName, externalAccountId: account.externalAccountId, currency: account.currency, hasAccessToken: Boolean(account.encryptedCredentials && openProviderCredentials(account.encryptedCredentials).apiKey), webhookStatus: account.webhookStatus, lastValidatedAt: account.lastValidatedAt, updatedAt: account.updatedAt }
    : { id: null, provider: "meta" as const, status: "not_connected" as const, accountName: null, externalAccountId: null, currency: "NGN", hasAccessToken: false, webhookStatus: "not_configured" as const, lastValidatedAt: null, updatedAt: null };
}

export async function getAdvertisingWorkspace(schoolId: number) {
  const db = await database();
  const account = (await db.select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.schoolId, schoolId), eq(schoolAdvertisingAccounts.provider, "meta"))).limit(1))[0];
  const campaigns = await db.select().from(advertisingCampaigns).where(eq(advertisingCampaigns.schoolId, schoolId)).orderBy(desc(advertisingCampaigns.updatedAt));
  return {
    account: advertisingAccountView(account),
    campaigns: campaigns.map(campaign => ({ ...campaign, dailyBudget: Number(campaign.dailyBudget), totalBudget: Number(campaign.totalBudget), audienceSummary: campaign.audienceSummary as AdvertisingAudience })),
    summary: {
      draft: campaigns.filter(campaign => campaign.status === "draft").length,
      awaitingApproval: campaigns.filter(campaign => campaign.status === "pending_approval").length,
      approved: campaigns.filter(campaign => campaign.status === "approved").length,
      live: campaigns.filter(campaign => campaign.status === "active").length,
    },
  };
}

export async function generateAdvertisingCopySuggestions(input: { schoolId: number; objective: "lead_generation" | "website_visits" | "awareness"; audienceSummary: AdvertisingAudience; guidance?: string }) {
  const school = (await (await database()).select({ name: schools.name }).from(schools).where(eq(schools.id, input.schoolId)).limit(1))[0];
  if (!school) throw new Error("School workspace not found.");
  return generateReviewableAdCopy({ schoolName: school.name, objective: input.objective, locations: input.audienceSummary.locations, ageMin: input.audienceSummary.ageMin, ageMax: input.audienceSummary.ageMax, audienceNote: input.audienceSummary.note, guidance: input.guidance });
}

async function tutorWithSubject(schoolId: number, tutorId: number) {
  const row = (await (await database()).select({ tutor: aiTutors, subjectName: subjects.name, subjectCode: subjects.code }).from(aiTutors).innerJoin(subjects, and(eq(aiTutors.subjectId, subjects.id), eq(subjects.schoolId, schoolId))).where(and(eq(aiTutors.id, tutorId), eq(aiTutors.schoolId, schoolId))).limit(1))[0];
  if (!row) throw new Error("AI tutor not found in this school workspace.");
  return row;
}

export async function getAiTutorWorkspace(schoolId: number) {
  const db = await database();
  const tutors = await db.select({ tutor: aiTutors, subjectName: subjects.name, subjectCode: subjects.code, supervisorName: users.name }).from(aiTutors).innerJoin(subjects, eq(aiTutors.subjectId, subjects.id)).leftJoin(users, eq(aiTutors.supervisorUserId, users.id)).where(eq(aiTutors.schoolId, schoolId)).orderBy(desc(aiTutors.updatedAt));
  const subjectList = await db.select().from(subjects).where(and(eq(subjects.schoolId, schoolId), eq(subjects.status, "active"))).orderBy(subjects.name);
  const supervisors = await db.select({ userId: schoolMemberships.userId, name: users.name, role: schoolMemberships.role }).from(schoolMemberships).innerJoin(users, eq(schoolMemberships.userId, users.id)).where(and(eq(schoolMemberships.schoolId, schoolId), eq(schoolMemberships.status, "active"), or(eq(schoolMemberships.role, "owner"), eq(schoolMemberships.role, "admin"), eq(schoolMemberships.role, "teacher")))).orderBy(users.name);
  const openEscalations = await db.select({ tutorId: aiTutorEscalations.tutorId, count: sql<number>`count(*)` }).from(aiTutorEscalations).where(and(eq(aiTutorEscalations.schoolId, schoolId), eq(aiTutorEscalations.status, "open"))).groupBy(aiTutorEscalations.tutorId);
  const feedbackSummaries = await db.select({ tutorId: aiTutorFeedback.tutorId, total: sql<number>`count(*)`, helpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'helpful' then 1 else 0 end)`, partlyHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'partly_helpful' then 1 else 0 end)`, notHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'not_helpful' then 1 else 0 end)` }).from(aiTutorFeedback).where(eq(aiTutorFeedback.schoolId, schoolId)).groupBy(aiTutorFeedback.tutorId);
  const escalationCounts = new Map(openEscalations.map(item => [item.tutorId, Number(item.count)]));
  const feedbackByTutor = new Map(feedbackSummaries.map(item => [item.tutorId, { total: Number(item.total), helpful: Number(item.helpful ?? 0), partlyHelpful: Number(item.partlyHelpful ?? 0), notHelpful: Number(item.notHelpful ?? 0) }]));
  return { tutors: tutors.map(item => ({ ...item.tutor, subjectName: item.subjectName, subjectCode: item.subjectCode, supervisorName: item.supervisorName ?? "Assigned school supervisor", openEscalations: escalationCounts.get(item.tutor.id) ?? 0, feedback: feedbackByTutor.get(item.tutor.id) ?? { total: 0, helpful: 0, partlyHelpful: 0, notHelpful: 0 } })), subjects: subjectList, supervisors };
}

export async function getTeacherAiTutorAnalytics(schoolId: number, userId: number) {
  const db = await database();
  const staff = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.schoolId, schoolId), eq(staffProfiles.userId, userId), eq(staffProfiles.employmentStatus, "active"))).limit(1))[0];
  if (!staff) return { linkedTeacher: false, assignments: [], summary: { activeTutors: 0, eligibleLearners: 0, adaptationEnabled: 0, feedbackSignals: 0, styles: emptyTeachingStyleCounts() }, tutorClasses: [], learners: [] };
  const assignments = await db.select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId, className: classes.name, classLevel: classes.level, subjectName: subjects.name, subjectCode: subjects.code }).from(classSubjects).innerJoin(classes, eq(classSubjects.classId, classes.id)).innerJoin(subjects, eq(classSubjects.subjectId, subjects.id)).where(and(eq(classSubjects.schoolId, schoolId), eq(classSubjects.teacherId, staff.id), eq(classes.status, "active"), eq(subjects.status, "active")));
  if (!assignments.length) return { linkedTeacher: true, assignments: [], summary: { activeTutors: 0, eligibleLearners: 0, adaptationEnabled: 0, feedbackSignals: 0, styles: emptyTeachingStyleCounts() }, tutorClasses: [], learners: [] };
  const assignmentByClassSubject = new Map(assignments.map(item => [`${item.classId}:${item.subjectId}`, item]));
  const assignedClassIds = new Set(assignments.map(item => item.classId));
  const assignedSubjectIds = new Set(assignments.map(item => item.subjectId));
  const [tutors, enrolled, preferences, feedback] = await Promise.all([
    db.select({ tutor: aiTutors, subjectName: subjects.name }).from(aiTutors).innerJoin(subjects, eq(aiTutors.subjectId, subjects.id)).where(and(eq(aiTutors.schoolId, schoolId), eq(aiTutors.status, "active"))),
    db.select({ studentId: studentProfiles.id, firstName: studentProfiles.firstName, lastName: studentProfiles.lastName, admissionNo: studentProfiles.admissionNo, classId: enrollments.classId }).from(enrollments).innerJoin(studentProfiles, eq(enrollments.studentId, studentProfiles.id)).where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.status, "active"), eq(studentProfiles.status, "active"))),
    db.select().from(aiTutorTeachingPreferences).where(eq(aiTutorTeachingPreferences.schoolId, schoolId)),
    db.select({ tutorId: aiTutorFeedback.tutorId, studentId: aiTutorFeedback.studentId, total: sql<number>`count(*)`, helpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'helpful' then 1 else 0 end)`, partlyHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'partly_helpful' then 1 else 0 end)`, notHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'not_helpful' then 1 else 0 end)` }).from(aiTutorFeedback).where(eq(aiTutorFeedback.schoolId, schoolId)).groupBy(aiTutorFeedback.tutorId, aiTutorFeedback.studentId),
  ]);
  const eligibleTutors = tutors.filter(item => assignedSubjectIds.has(item.tutor.subjectId));
  const learnerRows = enrolled.filter(student => assignedClassIds.has(student.classId));
  const preferenceByStudentTutor = new Map(preferences.map(item => [`${item.studentId}:${item.tutorId}`, item]));
  const feedbackByStudentTutor = new Map(feedback.map(item => [`${item.studentId}:${item.tutorId}`, { total: Number(item.total), helpful: Number(item.helpful ?? 0), partlyHelpful: Number(item.partlyHelpful ?? 0), notHelpful: Number(item.notHelpful ?? 0) }]));
  const learners: Array<{ studentId: number; learnerName: string; admissionNo: string; className: string; tutorId: number; tutorName: string; subjectName: string; adaptationEnabled: boolean; teachingStyle: TeachingStyle; feedbackSignals: number }> = [];
  for (const learner of learnerRows) for (const tutor of eligibleTutors) {
    const assignment = assignmentByClassSubject.get(`${learner.classId}:${tutor.tutor.subjectId}`);
    if (!assignment) continue;
    const levels = tutor.tutor.allowedLevels as string[];
    if (!levels.some(level => level.toLowerCase() === "all learners") && (!assignment.classLevel || !levels.includes(assignment.classLevel))) continue;
    const preference = preferenceByStudentTutor.get(`${learner.studentId}:${tutor.tutor.id}`);
    const ratingSummary = feedbackByStudentTutor.get(`${learner.studentId}:${tutor.tutor.id}`);
    learners.push({ studentId: learner.studentId, learnerName: `${learner.firstName} ${learner.lastName}`.trim(), admissionNo: learner.admissionNo, className: assignment.className, tutorId: tutor.tutor.id, tutorName: tutor.tutor.name, subjectName: tutor.subjectName, adaptationEnabled: preference?.adaptationEnabled ?? true, teachingStyle: preference?.adaptationEnabled === false ? "balanced" : deriveTeachingStyle(ratingSummary), feedbackSignals: ratingSummary?.total ?? 0 });
  }
  const styles = emptyTeachingStyleCounts();
  for (const learner of learners) styles[learner.teachingStyle] += 1;
  const tutorClasses = assignments.flatMap(assignment => {
    const matchingTutors = eligibleTutors.filter(tutor => {
      const levels = tutor.tutor.allowedLevels as string[];
      return tutor.tutor.subjectId === assignment.subjectId && (levels.some(level => level.toLowerCase() === "all learners") || (!!assignment.classLevel && levels.includes(assignment.classLevel)));
    });
    return matchingTutors.map(tutor => {
      const rows = learners.filter(learner => learner.tutorId === tutor.tutor.id && learner.className === assignment.className);
      const styleCounts = emptyTeachingStyleCounts();
      rows.forEach(row => { styleCounts[row.teachingStyle] += 1; });
      return { tutorId: tutor.tutor.id, tutorName: tutor.tutor.name, subjectName: tutor.subjectName, className: assignment.className, learners: rows.length, adaptationEnabled: rows.filter(row => row.adaptationEnabled).length, feedbackSignals: rows.reduce((sum, row) => sum + row.feedbackSignals, 0), styles: styleCounts };
    });
  });
  return { linkedTeacher: true, assignments: assignments.map(item => ({ className: item.className, subjectName: item.subjectName, subjectCode: item.subjectCode })), summary: { activeTutors: new Set(learners.map(item => item.tutorId)).size, eligibleLearners: new Set(learners.map(item => item.studentId)).size, adaptationEnabled: learners.filter(item => item.adaptationEnabled).length, feedbackSignals: learners.reduce((sum, item) => sum + item.feedbackSignals, 0), styles }, tutorClasses, learners: learners.sort((a, b) => a.className.localeCompare(b.className) || a.learnerName.localeCompare(b.learnerName) || a.subjectName.localeCompare(b.subjectName)) };
}

function emptyTeachingStyleCounts(): Record<TeachingStyle, number> { return { balanced: 0, step_by_step: 0, worked_examples: 0, concise_review: 0 }; }

export async function createAiTutor(input: { schoolId: number; subjectId: number; name: string; curriculumScope: string; allowedLevels: string[]; supervisorUserId: number; dailyQuestionLimit: number; createdBy: number }) {
  const db = await database();
  const subject = (await db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.schoolId, input.schoolId), eq(subjects.status, "active"))).limit(1))[0];
  if (!subject) throw new Error("Choose an active subject in this school.");
  const supervisor = (await db.select().from(schoolMemberships).where(and(eq(schoolMemberships.schoolId, input.schoolId), eq(schoolMemberships.userId, input.supervisorUserId), eq(schoolMemberships.status, "active"), or(eq(schoolMemberships.role, "owner"), eq(schoolMemberships.role, "admin"), eq(schoolMemberships.role, "teacher")))).limit(1))[0];
  if (!supervisor) throw new Error("Choose an active owner, administrator, or teacher as the accountable tutor supervisor.");
  const created = await db.insert(aiTutors).values({ schoolId: input.schoolId, subjectId: input.subjectId, name: input.name.trim(), curriculumScope: input.curriculumScope.trim(), allowedLevels: input.allowedLevels.map(value => value.trim()).filter(Boolean).slice(0, 12), supervisorUserId: input.supervisorUserId, dailyQuestionLimit: input.dailyQuestionLimit, status: "draft", createdBy: input.createdBy });
  return { tutorId: Number(created[0].insertId), status: "draft" as const };
}

export async function setAiTutorStatus(input: { schoolId: number; tutorId: number; status: "active" | "paused" | "retired" }) {
  await tutorWithSubject(input.schoolId, input.tutorId);
  await (await database()).update(aiTutors).set({ status: input.status }).where(and(eq(aiTutors.id, input.tutorId), eq(aiTutors.schoolId, input.schoolId)));
  return { tutorId: input.tutorId, status: input.status };
}

async function currentStudentTutorContext(schoolId: number, userId: number, tutorId: number) {
  const db = await database();
  const student = (await db.select().from(studentProfiles).where(and(eq(studentProfiles.schoolId, schoolId), eq(studentProfiles.userId, userId), eq(studentProfiles.status, "active"))).limit(1))[0];
  if (!student) throw new Error("Your student profile is not linked to this school account. Ask the school office for support.");
  const tutorRow = await tutorWithSubject(schoolId, tutorId);
  if (tutorRow.tutor.status !== "active") throw new Error("This AI tutor is not available right now.");
  const enrollment = (await db.select({ level: classes.level }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.studentId, student.id), eq(enrollments.status, "active"))).orderBy(desc(enrollments.enrolledOn)).limit(1))[0];
  const allowedLevels = tutorRow.tutor.allowedLevels as string[];
  if (!allowedLevels.some(level => level.toLowerCase() === "all learners") && (!enrollment?.level || !allowedLevels.includes(enrollment.level))) throw new Error("This tutor is not configured for your current class level. Ask your school supervisor for guidance.");
  return { student, tutor: tutorRow.tutor, subjectName: tutorRow.subjectName, classLevel: enrollment?.level ?? "All learners" };
}

export async function listStudentAiTutors(schoolId: number, userId: number) {
  const db = await database();
  const student = (await db.select().from(studentProfiles).where(and(eq(studentProfiles.schoolId, schoolId), eq(studentProfiles.userId, userId), eq(studentProfiles.status, "active"))).limit(1))[0];
  if (!student) return { tutors: [], studentLinked: false };
  const enrollment = (await db.select({ level: classes.level }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.studentId, student.id), eq(enrollments.status, "active"))).orderBy(desc(enrollments.enrolledOn)).limit(1))[0];
  const activeTutors = await db.select({ tutor: aiTutors, subjectName: subjects.name }).from(aiTutors).innerJoin(subjects, eq(aiTutors.subjectId, subjects.id)).where(and(eq(aiTutors.schoolId, schoolId), eq(aiTutors.status, "active"))).orderBy(subjects.name);
  const preferences = await db.select().from(aiTutorTeachingPreferences).where(and(eq(aiTutorTeachingPreferences.schoolId, schoolId), eq(aiTutorTeachingPreferences.studentId, student.id)));
  const preferenceByTutor = new Map(preferences.map(item => [item.tutorId, item]));
  const feedbackSummary = await db.select({ tutorId: aiTutorFeedback.tutorId, total: sql<number>`count(*)`, helpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'helpful' then 1 else 0 end)`, partlyHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'partly_helpful' then 1 else 0 end)`, notHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'not_helpful' then 1 else 0 end)` }).from(aiTutorFeedback).where(and(eq(aiTutorFeedback.schoolId, schoolId), eq(aiTutorFeedback.studentId, student.id))).groupBy(aiTutorFeedback.tutorId);
  const feedbackByTutor = new Map(feedbackSummary.map(item => [item.tutorId, { total: Number(item.total), helpful: Number(item.helpful ?? 0), partlyHelpful: Number(item.partlyHelpful ?? 0), notHelpful: Number(item.notHelpful ?? 0) }]));
  return { studentLinked: true, tutors: activeTutors.filter(item => { const levels = item.tutor.allowedLevels as string[]; return levels.some(level => level.toLowerCase() === "all learners") || (!!enrollment?.level && levels.includes(enrollment.level)); }).map(item => { const preference = preferenceByTutor.get(item.tutor.id); const derivedStyle = deriveTeachingStyle(feedbackByTutor.get(item.tutor.id)); return { id: item.tutor.id, name: item.tutor.name, subjectName: item.subjectName, curriculumScope: item.tutor.curriculumScope, allowedLevels: item.tutor.allowedLevels, classLevel: enrollment?.level ?? "All learners", dailyQuestionLimit: item.tutor.dailyQuestionLimit, adaptationEnabled: preference?.adaptationEnabled ?? true, teachingStyle: preference?.adaptationEnabled === false ? "balanced" : (preference?.preferredStyle ?? derivedStyle) }; }) };
}

type TeachingStyle = "balanced" | "step_by_step" | "worked_examples" | "concise_review";
type RatingSummary = { total: number; helpful: number; partlyHelpful: number; notHelpful: number } | undefined;

function deriveTeachingStyle(summary: RatingSummary): TeachingStyle {
  if (!summary || summary.total < 3) return "balanced";
  if (summary.notHelpful / summary.total >= 0.4) return "step_by_step";
  if (summary.partlyHelpful / summary.total >= 0.4) return "worked_examples";
  if (summary.helpful / summary.total >= 0.75) return "concise_review";
  return "balanced";
}

async function getStudentTeachingPreference(schoolId: number, tutorId: number, studentId: number) {
  const db = await database();
  const preference = (await db.select().from(aiTutorTeachingPreferences).where(and(eq(aiTutorTeachingPreferences.schoolId, schoolId), eq(aiTutorTeachingPreferences.tutorId, tutorId), eq(aiTutorTeachingPreferences.studentId, studentId))).limit(1))[0];
  if (preference?.adaptationEnabled === false) return { adaptationEnabled: false, teachingStyle: "balanced" as TeachingStyle };
  const summary = (await db.select({ total: sql<number>`count(*)`, helpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'helpful' then 1 else 0 end)`, partlyHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'partly_helpful' then 1 else 0 end)`, notHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'not_helpful' then 1 else 0 end)` }).from(aiTutorFeedback).where(and(eq(aiTutorFeedback.schoolId, schoolId), eq(aiTutorFeedback.tutorId, tutorId), eq(aiTutorFeedback.studentId, studentId))))[0];
  return { adaptationEnabled: true, teachingStyle: deriveTeachingStyle(summary ? { total: Number(summary.total), helpful: Number(summary.helpful ?? 0), partlyHelpful: Number(summary.partlyHelpful ?? 0), notHelpful: Number(summary.notHelpful ?? 0) } : undefined) };
}

export async function setAiTutorTeachingPreference(input: { schoolId: number; userId: number; tutorId: number; adaptationEnabled: boolean }) {
  const context = await currentStudentTutorContext(input.schoolId, input.userId, input.tutorId);
  const derived = await getStudentTeachingPreference(input.schoolId, input.tutorId, context.student.id);
  const values = { schoolId: input.schoolId, tutorId: input.tutorId, studentId: context.student.id, adaptationEnabled: input.adaptationEnabled, preferredStyle: derived.teachingStyle };
  await (await database()).insert(aiTutorTeachingPreferences).values(values).onDuplicateKeyUpdate({ set: { adaptationEnabled: input.adaptationEnabled, preferredStyle: derived.teachingStyle } });
  return { adaptationEnabled: input.adaptationEnabled, teachingStyle: input.adaptationEnabled ? derived.teachingStyle : "balanced" as TeachingStyle };
}

function tutorSessionDate() { return new Date(); }

async function incrementTutorSession(schoolId: number, tutorId: number, studentId: number, kind: "question" | "escalation", dailyLimit?: number) {
  const db = await database();
  const sessionDate = tutorSessionDate();
  const existing = (await db.select().from(aiTutorSessionSummaries).where(and(eq(aiTutorSessionSummaries.tutorId, tutorId), eq(aiTutorSessionSummaries.studentId, studentId), eq(aiTutorSessionSummaries.sessionDate, sessionDate))).limit(1))[0];
  if (kind === "question" && dailyLimit && existing && existing.questionCount >= dailyLimit) throw new Error(`You have reached this tutor’s daily question limit of ${dailyLimit}. Please continue with your supervising teacher tomorrow.`);
  if (existing) { await db.update(aiTutorSessionSummaries).set(kind === "question" ? { questionCount: existing.questionCount + 1 } : { escalationCount: existing.escalationCount + 1 }).where(eq(aiTutorSessionSummaries.id, existing.id)); return; }
  await db.insert(aiTutorSessionSummaries).values({ schoolId, tutorId, studentId, sessionDate, questionCount: kind === "question" ? 1 : 0, escalationCount: kind === "escalation" ? 1 : 0 });
}

export async function askAiTutor(input: { schoolId: number; userId: number; tutorId: number; question: string }) {
  const context = await currentStudentTutorContext(input.schoolId, input.userId, input.tutorId);
  const teachingPreference = await getStudentTeachingPreference(input.schoolId, input.tutorId, context.student.id);
  await incrementTutorSession(input.schoolId, input.tutorId, context.student.id, "question", context.tutor.dailyQuestionLimit);
  const result = await generateSupervisedTutorResponse({ tutorName: context.tutor.name, subjectName: context.subjectName, curriculumScope: context.tutor.curriculumScope, allowedLevels: context.tutor.allowedLevels as string[], question: input.question, teachingStyle: teachingPreference.teachingStyle });
  if (result.needsTeacherSupport) { const reason = (result.escalationReason || "needs_teacher_review") as "safeguarding" | "out_of_scope" | "needs_teacher_review"; await incrementTutorSession(input.schoolId, input.tutorId, context.student.id, "escalation"); await (await database()).insert(aiTutorEscalations).values({ schoolId: input.schoolId, tutorId: input.tutorId, studentId: context.student.id, reason }); }
  const interactionKey = crypto.randomUUID();
  await (await database()).insert(aiTutorInteractions).values({ schoolId: input.schoolId, tutorId: input.tutorId, studentId: context.student.id, interactionKey });
  return { ...result, tutorName: context.tutor.name, interactionKey, adaptationEnabled: teachingPreference.adaptationEnabled, teachingStyle: teachingPreference.teachingStyle, conversationStored: false };
}

const feedbackSensitivePattern = /\b(suicide|self[-\s]?harm|abuse|assault|pregnan|medical|medicine|drug|sex|nude|bully|threat|unsafe|hurt me)\b/i;
const feedbackContactPattern = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?234|0)\d[\d\s-]{7,}/i;

export async function submitAiTutorFeedback(input: { schoolId: number; userId: number; interactionKey: string; helpfulness: "helpful" | "partly_helpful" | "not_helpful"; comment?: string }) {
  const db = await database();
  const student = (await db.select().from(studentProfiles).where(and(eq(studentProfiles.schoolId, input.schoolId), eq(studentProfiles.userId, input.userId), eq(studentProfiles.status, "active"))).limit(1))[0];
  if (!student) throw new Error("Your student profile is not linked to this school account.");
  const interaction = (await db.select().from(aiTutorInteractions).where(and(eq(aiTutorInteractions.schoolId, input.schoolId), eq(aiTutorInteractions.studentId, student.id), eq(aiTutorInteractions.interactionKey, input.interactionKey))).limit(1))[0];
  if (!interaction) throw new Error("This tutor response is unavailable for feedback. Refresh and try again.");
  const existing = (await db.select({ id: aiTutorFeedback.id }).from(aiTutorFeedback).where(eq(aiTutorFeedback.interactionId, interaction.id)).limit(1))[0];
  if (existing) throw new Error("You have already shared feedback for this tutor response.");
  const comment = input.comment?.trim().slice(0, 500) || undefined;
  if (comment && (feedbackSensitivePattern.test(comment) || feedbackContactPattern.test(comment))) throw new Error("Keep tutor feedback free of personal, contact, health, safety, or sensitive information. Speak to a trusted adult or school staff member directly for support.");
  await db.insert(aiTutorFeedback).values({ schoolId: input.schoolId, tutorId: interaction.tutorId, studentId: student.id, interactionId: interaction.id, helpfulness: input.helpfulness, comment });
  return { submitted: true, conversationStored: false };
}

export async function requestAiTutorEscalation(input: { schoolId: number; userId: number; tutorId: number }) {
  const context = await currentStudentTutorContext(input.schoolId, input.userId, input.tutorId);
  await incrementTutorSession(input.schoolId, input.tutorId, context.student.id, "escalation");
  await (await database()).insert(aiTutorEscalations).values({ schoolId: input.schoolId, tutorId: input.tutorId, studentId: context.student.id, reason: "learner_requested" });
  return { requested: true, message: "Your request has been sent to the school’s supervising team. Your tutor conversation is not stored by NSOS." };
}

export async function saveMetaAdvertisingAccount(input: { schoolId: number; accountName: string; externalAccountId: string; accessToken?: string; clearAccessToken?: boolean; connectedBy: number }) {
  const db = await database();
  const existing = (await db.select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.schoolId, input.schoolId), eq(schoolAdvertisingAccounts.provider, "meta"))).limit(1))[0];
  const encryptedCredentials = input.clearAccessToken ? null : sealProviderCredentials({ apiKey: input.accessToken }) ?? existing?.encryptedCredentials ?? null;
  if (!encryptedCredentials) throw new Error("Save a Meta access token for this school before connecting the advertising account.");
  const values = { schoolId: input.schoolId, provider: "meta" as const, status: "connected" as const, accountName: input.accountName.trim().slice(0, 160), externalAccountId: metaAccountId(input.externalAccountId), encryptedCredentials, connectedBy: input.connectedBy, lastValidatedAt: null, webhookStatus: "not_configured" as const };
  await db.insert(schoolAdvertisingAccounts).values(values).onDuplicateKeyUpdate({ set: values });
  const account = (await db.select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.schoolId, input.schoolId), eq(schoolAdvertisingAccounts.provider, "meta"))).limit(1))[0];
  return advertisingAccountView(account);
}

export async function testMetaAdvertisingAccount(schoolId: number) {
  const db = await database();
  const account = (await db.select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.schoolId, schoolId), eq(schoolAdvertisingAccounts.provider, "meta"))).limit(1))[0];
  if (!account?.externalAccountId || !account.encryptedCredentials) throw new Error("Connect a Meta ad account and save its access token before testing the connection.");
  const accessToken = openProviderCredentials(account.encryptedCredentials).apiKey;
  if (!accessToken) throw new Error("The Meta access token is unavailable. Save the account connection again.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(account.externalAccountId)}?fields=id,name,account_status,currency`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) {
      await db.update(schoolAdvertisingAccounts).set({ status: "attention" }).where(eq(schoolAdvertisingAccounts.id, account.id));
      return { ok: false, message: `Meta rejected the account verification (HTTP ${response.status}). Check the token and ad-account permissions.`, testedAt: new Date() };
    }
    const verified = await response.json() as { name?: string; currency?: string };
    const testedAt = new Date();
    await db.update(schoolAdvertisingAccounts).set({ status: "connected", accountName: verified.name?.slice(0, 160) || account.accountName, currency: verified.currency?.slice(0, 8) || account.currency, lastValidatedAt: testedAt }).where(eq(schoolAdvertisingAccounts.id, account.id));
    return { ok: true, message: "Meta ad account verified. No campaign was created and no spend was incurred.", testedAt };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return { ok: false, message: timedOut ? "Meta did not respond within eight seconds." : "NSOS could not reach Meta. Check network availability and try again.", testedAt: new Date() };
  } finally {
    clearTimeout(timeout);
  }
}

async function advertisingAccountForDraft(schoolId: number) {
  const db = await database();
  let account = (await db.select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.schoolId, schoolId), eq(schoolAdvertisingAccounts.provider, "meta"))).limit(1))[0];
  if (!account) {
    await db.insert(schoolAdvertisingAccounts).values({ schoolId, provider: "meta", status: "not_connected", currency: "NGN", webhookStatus: "not_configured" });
    account = (await db.select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.schoolId, schoolId), eq(schoolAdvertisingAccounts.provider, "meta"))).limit(1))[0];
  }
  if (!account) throw new Error("NSOS could not prepare the school advertising workspace.");
  return account;
}

export async function createAdvertisingCampaign(input: { schoolId: number; name: string; objective: "lead_generation" | "website_visits" | "awareness"; destinationUrl?: string; facebookPageId?: string; creativeImageUrl?: string; primaryText: string; headline: string; callToAction: "learn_more" | "apply_now" | "contact_us"; audienceSummary: AdvertisingAudience; dailyBudget: number; totalBudget: number; startsAt?: string; endsAt?: string; createdBy: number }) {
  if (input.totalBudget < input.dailyBudget) throw new Error("The total budget must be at least the daily budget.");
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (startsAt && endsAt && endsAt <= startsAt) throw new Error("The campaign end date must be after its start date.");
  const account = await advertisingAccountForDraft(input.schoolId);
  const db = await database();
  const created = await db.insert(advertisingCampaigns).values({ schoolId: input.schoolId, advertisingAccountId: account.id, provider: "meta", name: input.name.trim(), objective: input.objective, destinationUrl: input.destinationUrl?.trim() || null, facebookPageId: input.facebookPageId?.trim() || null, creativeImageUrl: input.creativeImageUrl?.trim() || null, primaryText: input.primaryText.trim(), headline: input.headline.trim(), callToAction: input.callToAction, audienceSummary: { locations: input.audienceSummary.locations.map(location => location.trim()).filter(Boolean).slice(0, 12), ageMin: input.audienceSummary.ageMin, ageMax: input.audienceSummary.ageMax, note: input.audienceSummary.note?.trim().slice(0, 500) }, dailyBudget: String(input.dailyBudget), totalBudget: String(input.totalBudget), currency: account.currency, startsAt, endsAt, status: "draft", createdBy: input.createdBy });
  return { campaignId: Number(created[0].insertId), accountConnected: account.status === "connected" };
}

async function advertisingCampaignForSchool(schoolId: number, campaignId: number) {
  const campaign = (await (await database()).select().from(advertisingCampaigns).where(and(eq(advertisingCampaigns.id, campaignId), eq(advertisingCampaigns.schoolId, schoolId))).limit(1))[0];
  if (!campaign) throw new Error("Advertising campaign not found in this school workspace.");
  return campaign;
}

export async function requestAdvertisingCampaignApproval(input: { schoolId: number; campaignId: number }) {
  const campaign = await advertisingCampaignForSchool(input.schoolId, input.campaignId);
  if (campaign.status !== "draft") throw new Error("Only draft campaigns can be submitted for approval.");
  await (await database()).update(advertisingCampaigns).set({ status: "pending_approval" }).where(and(eq(advertisingCampaigns.id, campaign.id), eq(advertisingCampaigns.status, "draft")));
  return { campaignId: campaign.id, status: "pending_approval" as const };
}

export async function approveAdvertisingCampaign(input: { schoolId: number; campaignId: number; approvedBy: number }) {
  const campaign = await advertisingCampaignForSchool(input.schoolId, input.campaignId);
  if (campaign.status !== "pending_approval") throw new Error("Only a campaign awaiting approval can be approved for launch preparation.");
  await (await database()).update(advertisingCampaigns).set({ status: "approved", approvedBy: input.approvedBy, approvedAt: new Date() }).where(and(eq(advertisingCampaigns.id, campaign.id), eq(advertisingCampaigns.status, "pending_approval")));
  return { campaignId: campaign.id, status: "approved" as const };
}

function metaCampaignObjective(objective: "lead_generation" | "website_visits" | "awareness") {
  return objective === "lead_generation" ? "LEAD_GENERATION" : objective === "awareness" ? "BRAND_AWARENESS" : "LINK_CLICKS";
}

export async function preparePausedMetaCampaign(input: { schoolId: number; campaignId: number; launchedBy: number }) {
  const campaign = await advertisingCampaignForSchool(input.schoolId, input.campaignId);
  if (campaign.status !== "approved") throw new Error("Only an explicitly approved campaign can be prepared in Meta.");
  const db = await database();
  const account = (await db.select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.id, campaign.advertisingAccountId), eq(schoolAdvertisingAccounts.schoolId, input.schoolId), eq(schoolAdvertisingAccounts.status, "connected"))).limit(1))[0];
  if (!account?.externalAccountId || !account.encryptedCredentials) throw new Error("Connect and verify the school’s Meta ad account before preparing a campaign in Meta.");
  const accessToken = openProviderCredentials(account.encryptedCredentials).apiKey;
  if (!accessToken) throw new Error("The Meta access token is unavailable. Save the school account connection again.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  await db.update(advertisingCampaigns).set({ status: "launching", lastProviderError: null }).where(and(eq(advertisingCampaigns.id, campaign.id), eq(advertisingCampaigns.status, "approved")));
  try {
    const body = new URLSearchParams({ name: campaign.name, objective: metaCampaignObjective(campaign.objective), status: "PAUSED", access_token: accessToken });
    const response = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(account.externalAccountId)}/campaigns`, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body });
    const payload = await response.json().catch(() => ({})) as { id?: string; error?: { message?: string } };
    if (!response.ok || !payload.id) {
      const message = (payload.error?.message || `Meta rejected the paused-campaign request (HTTP ${response.status}).`).slice(0, 500);
      await db.update(advertisingCampaigns).set({ status: "failed", lastProviderError: message }).where(eq(advertisingCampaigns.id, campaign.id));
      throw new Error("Meta could not prepare this campaign. Check the school account permissions and campaign settings, then try again.");
    }
    const launchedAt = new Date();
    await db.update(advertisingCampaigns).set({ status: "paused", providerCampaignId: payload.id, providerStatus: "PAUSED", launchedBy: input.launchedBy, launchedAt, lastProviderError: null }).where(eq(advertisingCampaigns.id, campaign.id));
    return { campaignId: campaign.id, providerCampaignId: payload.id, status: "paused" as const, message: "Meta campaign created in a paused state. No advert is active and no spend can begin until ad-set, creative, and final launch controls are completed." };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Meta could not")) throw error;
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    await db.update(advertisingCampaigns).set({ status: "failed", lastProviderError: timedOut ? "Meta preparation request timed out." : "NSOS could not reach Meta for this preparation request." }).where(eq(advertisingCampaigns.id, campaign.id));
    throw new Error(timedOut ? "Meta did not respond within twelve seconds. No active advert was created." : "NSOS could not reach Meta. No active advert was created.");
  } finally {
    clearTimeout(timeout);
  }
}

async function metaAccountForCampaign(schoolId: number, campaign: typeof advertisingCampaigns.$inferSelect) {
  const account = (await (await database()).select().from(schoolAdvertisingAccounts).where(and(eq(schoolAdvertisingAccounts.id, campaign.advertisingAccountId), eq(schoolAdvertisingAccounts.schoolId, schoolId), eq(schoolAdvertisingAccounts.status, "connected"))).limit(1))[0];
  if (!account?.externalAccountId || !account.encryptedCredentials) throw new Error("Connect and verify the school’s Meta ad account before preparing delivery assets.");
  const externalAccountId = account.externalAccountId;
  const accessToken = openProviderCredentials(account.encryptedCredentials).apiKey;
  if (!accessToken) throw new Error("The Meta access token is unavailable. Save the school account connection again.");
  return { externalAccountId, accessToken };
}

async function postMetaForm(path: string, fields: Record<string, string>, accessToken: string, signal: AbortSignal) {
  const response = await fetch(`https://graph.facebook.com/v26.0/${path}`, { method: "POST", signal, headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ ...fields, access_token: accessToken }) });
  const payload = await response.json().catch(() => ({})) as { id?: string; success?: boolean; error?: { message?: string } };
  if (!response.ok) throw new Error((payload.error?.message || `Meta request failed with HTTP ${response.status}.`).slice(0, 500));
  return payload;
}

function metaCallToAction(value: "learn_more" | "apply_now" | "contact_us") {
  return value === "apply_now" ? "APPLY_NOW" : value === "contact_us" ? "CONTACT_US" : "LEARN_MORE";
}

export async function preparePausedMetaDelivery(input: { schoolId: number; campaignId: number; preparedBy: number }) {
  const campaign = await advertisingCampaignForSchool(input.schoolId, input.campaignId);
  if (campaign.status !== "paused") throw new Error("Create the paused Meta campaign before preparing its delivery assets.");
  if (!campaign.providerCampaignId) throw new Error("The Meta campaign identifier is missing. Create the paused Meta campaign again.");
  if (!campaign.facebookPageId || !campaign.creativeImageUrl || !campaign.destinationUrl) throw new Error("Add the school Facebook Page ID, an HTTPS creative image URL, and a destination URL to this campaign before preparing delivery assets.");
  if (!/^https:\/\//i.test(campaign.creativeImageUrl) || !/^https:\/\//i.test(campaign.destinationUrl)) throw new Error("Creative media and the destination URL must use HTTPS before Meta delivery assets are prepared.");
  const { externalAccountId, accessToken } = await metaAccountForCampaign(input.schoolId, campaign);
  const providerCampaignId = campaign.providerCampaignId;
  const facebookPageId = campaign.facebookPageId;
  const creativeImageUrl = campaign.creativeImageUrl;
  const destinationUrl = campaign.destinationUrl;
  const db = await database();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  await db.update(advertisingCampaigns).set({ status: "launching", lastProviderError: null }).where(and(eq(advertisingCampaigns.id, campaign.id), eq(advertisingCampaigns.status, "paused")));
  try {
    let adSetId = campaign.providerAdSetId;
    if (!adSetId) {
      const adSet = await postMetaForm(`${encodeURIComponent(externalAccountId)}/adsets`, { name: `${campaign.name} — audience`, campaign_id: providerCampaignId!, daily_budget: String(Math.round(Number(campaign.dailyBudget) * 100)), targeting: JSON.stringify({ geo_locations: { countries: ["NG"] }, age_min: (campaign.audienceSummary as AdvertisingAudience).ageMin ?? 18, age_max: (campaign.audienceSummary as AdvertisingAudience).ageMax ?? 65 }), status: "PAUSED" }, accessToken, controller.signal);
      if (!adSet.id) throw new Error("Meta did not return an ad-set identifier.");
      adSetId = adSet.id;
      await db.update(advertisingCampaigns).set({ providerAdSetId: adSetId }).where(eq(advertisingCampaigns.id, campaign.id));
    }
    let creativeId = campaign.providerCreativeId;
    if (!creativeId) {
      const creative = await postMetaForm(`${encodeURIComponent(externalAccountId)}/adcreatives`, { name: `${campaign.name} — creative`, object_story_spec: JSON.stringify({ page_id: facebookPageId!, link_data: { message: campaign.primaryText, link: destinationUrl!, picture: creativeImageUrl!, name: campaign.headline, call_to_action: { type: metaCallToAction(campaign.callToAction) } } }) }, accessToken, controller.signal);
      if (!creative.id) throw new Error("Meta did not return a creative identifier.");
      creativeId = creative.id;
      await db.update(advertisingCampaigns).set({ providerCreativeId: creativeId }).where(eq(advertisingCampaigns.id, campaign.id));
    }
    let adId = campaign.providerAdId;
    if (!adId) {
      const ad = await postMetaForm(`${encodeURIComponent(externalAccountId)}/ads`, { name: `${campaign.name} — ad`, adset_id: adSetId!, creative: JSON.stringify({ creative_id: creativeId! }), status: "PAUSED" }, accessToken, controller.signal);
      if (!ad.id) throw new Error("Meta did not return an ad identifier.");
      adId = ad.id;
    }
    const syncedAt = new Date();
    await db.update(advertisingCampaigns).set({ status: "paused", providerAdSetId: adSetId, providerCreativeId: creativeId, providerAdId: adId, providerStatus: "PAUSED", lastSyncedAt: syncedAt, lastProviderError: null }).where(eq(advertisingCampaigns.id, campaign.id));
    return { campaignId: campaign.id, providerAdId: adId, status: "paused" as const, message: "Paused Meta delivery assets are ready. The advert is inactive and cannot spend until an administrator confirms activation." };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    const message = timedOut ? "Meta delivery preparation timed out." : error instanceof Error ? error.message.slice(0, 500) : "Meta delivery preparation failed.";
    await db.update(advertisingCampaigns).set({ status: "failed", lastProviderError: message }).where(eq(advertisingCampaigns.id, campaign.id));
    throw new Error(timedOut ? "Meta did not respond within fifteen seconds. No active advert was created." : "Meta could not prepare inactive delivery assets. Check the school Page, creative media, and ad-account permissions.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function setMetaAdvertisingAdStatus(input: { schoolId: number; campaignId: number; status: "ACTIVE" | "PAUSED"; changedBy: number }) {
  const campaign = await advertisingCampaignForSchool(input.schoolId, input.campaignId);
  if (!campaign.providerAdId) throw new Error("Prepare the paused Meta delivery assets before changing the advert status.");
  if (input.status === "ACTIVE" && campaign.status !== "paused") throw new Error("Only a paused Meta advert can be activated.");
  if (input.status === "PAUSED" && campaign.status !== "active") throw new Error("Only an active Meta advert can be paused.");
  const { accessToken } = await metaAccountForCampaign(input.schoolId, campaign);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    await postMetaForm(encodeURIComponent(campaign.providerAdId), { status: input.status }, accessToken, controller.signal);
    const nextStatus = input.status === "ACTIVE" ? "active" : "paused" as const;
    const updatedAt = new Date();
    await (await database()).update(advertisingCampaigns).set({ status: nextStatus, providerStatus: input.status, lastSyncedAt: updatedAt, lastProviderError: null }).where(eq(advertisingCampaigns.id, campaign.id));
    return { campaignId: campaign.id, status: nextStatus, message: input.status === "ACTIVE" ? "Meta advert activated. The school’s connected Meta account can now begin delivery and incur spend under its approved budget." : "Meta advert paused. New delivery and spend are stopped at Meta." };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    throw new Error(timedOut ? "Meta did not respond within twelve seconds. The advert status was not changed by NSOS." : "Meta could not update the advert status. Check Meta Ads Manager before retrying.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncMetaAdvertisingCampaign(input: { schoolId: number; campaignId: number }) {
  const campaign = await advertisingCampaignForSchool(input.schoolId, input.campaignId);
  if (!campaign.providerAdId) throw new Error("Prepare the Meta delivery assets before syncing their external status.");
  const { accessToken } = await metaAccountForCampaign(input.schoolId, campaign);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(campaign.providerAdId)}?fields=status,effective_status`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, signal: controller.signal });
    const payload = await response.json().catch(() => ({})) as { status?: string; effective_status?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `Meta status sync failed with HTTP ${response.status}.`);
    const providerStatus = payload.effective_status || payload.status || "UNKNOWN";
    const status = providerStatus === "ACTIVE" ? "active" : providerStatus === "PAUSED" ? "paused" : campaign.status;
    const syncedAt = new Date();
    await (await database()).update(advertisingCampaigns).set({ status, providerStatus, lastSyncedAt: syncedAt, lastProviderError: null }).where(eq(advertisingCampaigns.id, campaign.id));
    return { campaignId: campaign.id, status, providerStatus, syncedAt };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    throw new Error(timedOut ? "Meta did not respond within eight seconds. No status was changed." : "NSOS could not sync this Meta advert. Check the school ad account and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendProviderSmsTest(input: { schoolId: number; to: string; confirmed: boolean; createdBy: number }) {
  if (!input.confirmed) throw new Error("Confirm that you are authorized to send this test message.");
  const db = await database();
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, input.schoolId), eq(providerConfigurations.category, "notification"))).limit(1))[0];
  if (!configuration) throw new Error("Configure a notification provider before sending a test message.");
  if (configuration.status !== "ready") throw new Error("Save this notification provider as ready and test its connection before sending an SMS.");
  if (configuration.provider !== "termii" && configuration.provider !== "twilio") throw new Error("SMS test delivery is currently available for Termii and Twilio configurations.");
  const recipient = normaliseSmsRecipient(input.to);
  const maskedRecipient = maskSmsRecipient(recipient);
  const school = (await db.select({ name: schools.name }).from(schools).where(eq(schools.id, input.schoolId)).limit(1))[0];
  const message = `NSOS test message from ${school?.name ?? "your school"}. SMS delivery is configured.`;
  const log = await createMessageLog({ schoolId: input.schoolId, channel: "sms", audience: "staff", subject: `Provider SMS test to ${maskedRecipient}`, body: `Test SMS dispatch requested via ${configuration.provider}.`, recipientCount: 1, createdBy: input.createdBy });
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.createdBy, eventType: "provider_sms_test_requested", targetType: "notification_provider", targetId: configuration.provider, metadata: { provider: configuration.provider, deliveryTracking: "requested" } });
  const credentials = openProviderCredentials(configuration.encryptedCredentials);
  if (configuration.provider === "termii" && !credentials.webhookSecret) throw new Error("Store the Termii webhook signing secret before sending an automatically tracked SMS test.");
  const details = (configuration.configuration ?? {}) as Record<string, unknown>;
  const sender = typeof details.senderId === "string" && details.senderId.trim() ? details.senderId.trim() : "NSOS";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    let response: Response;
    if (configuration.provider === "termii") {
      if (!credentials.apiKey && !credentials.secretKey) throw new Error("Store a Termii API key before sending a test message.");
      response = await fetch("https://api.ng.termii.com/api/sms/send", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ api_key: credentials.apiKey ?? credentials.secretKey, to: recipient, from: sender, sms: message, type: "plain", channel: "generic" }) });
    } else {
      if (!credentials.apiKey || !credentials.secretKey) throw new Error("Store the Twilio account SID and auth token before sending a test message.");
      response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(credentials.apiKey)}/Messages.json`, { method: "POST", signal: controller.signal, headers: { Authorization: `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.secretKey}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: `+${recipient}`, From: sender, Body: message, StatusCallback: getSmsDeliveryWebhookUrls(input.schoolId).twilio }).toString() });
    }
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || (configuration.provider === "termii" && payload.code !== "ok")) {
      await db.update(messageLogs).set({ status: "failed" }).where(eq(messageLogs.id, log.messageId));
      return { ok: false, message: `The provider did not accept the SMS test (HTTP ${response.status}). Check the configured sender ID, SMS route, credentials, and account balance.`, recipient: maskedRecipient };
    }
    const providerMessageId = String(payload.message_id ?? payload.message_id_str ?? payload.sid ?? "") || undefined;
    if (!providerMessageId) {
      await db.update(messageLogs).set({ status: "failed" }).where(eq(messageLogs.id, log.messageId));
      return { ok: false, message: "The provider accepted the request but did not return a message identifier for delivery tracking.", recipient: maskedRecipient };
    }
    await db.update(messageLogs).set({ providerMessageId }).where(eq(messageLogs.id, log.messageId));
    await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.createdBy, eventType: "provider_sms_test_submitted", targetType: "message_log", targetId: log.messageId, metadata: { provider: configuration.provider, deliveryTracking: "pending" } });
    return { ok: true, message: `SMS submitted to ${maskedRecipient}. Delivery confirmation is pending.`, recipient: maskedRecipient, providerMessageId, logId: log.messageId, deliveryState: "pending" as const };
  } catch (error) {
    await db.update(messageLogs).set({ status: "failed" }).where(eq(messageLogs.id, log.messageId));
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    if (error instanceof Error && !timedOut) return { ok: false, message: error.message, recipient: maskedRecipient };
    return { ok: false, message: "The SMS provider did not respond within twelve seconds.", recipient: maskedRecipient };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkProviderSmsTestDelivery(input: { schoolId: number; messageLogId: number }) {
  const db = await database();
  const log = (await db.select().from(messageLogs).where(and(eq(messageLogs.id, input.messageLogId), eq(messageLogs.schoolId, input.schoolId))).limit(1))[0];
  if (!log || log.channel !== "sms") throw new Error("SMS test message was not found in this school workspace.");
  if (!log.providerMessageId) throw new Error("This SMS test has no provider message identifier to verify.");
  if (log.status === "sent") return { ok: true, deliveryState: "delivered" as const, message: "Delivery was already confirmed by the provider." };
  if (log.status === "failed") return { ok: false, deliveryState: "failed" as const, message: "The provider previously reported this test message as failed." };
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, input.schoolId), eq(providerConfigurations.category, "notification"))).limit(1))[0];
  if (!configuration || (configuration.provider !== "termii" && configuration.provider !== "twilio")) throw new Error("The configured notification provider cannot confirm SMS delivery for this test.");
  const credentials = openProviderCredentials(configuration.encryptedCredentials);
  let response: Response;
  if (configuration.provider === "termii") {
    const apiKey = credentials.apiKey ?? credentials.secretKey;
    if (!apiKey) throw new Error("Store a Termii API key before checking delivery status.");
    response = await fetch(`https://api.ng.termii.com/api/sms/inbox?api_key=${encodeURIComponent(apiKey)}&message_id=${encodeURIComponent(log.providerMessageId)}`, { headers: { Accept: "application/json" } });
  } else {
    if (!credentials.apiKey || !credentials.secretKey) throw new Error("Store the Twilio account SID and auth token before checking delivery status.");
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(credentials.apiKey)}/Messages/${encodeURIComponent(log.providerMessageId)}.json`, { headers: { Authorization: `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.secretKey}`).toString("base64")}`, Accept: "application/json" } });
  }
  if (!response.ok) return { ok: false, deliveryState: "pending" as const, message: `The provider status report is not available yet (HTTP ${response.status}). Try again shortly.` };
  const payload = await response.json().catch(() => ({})) as Record<string, unknown> | Record<string, unknown>[];
  const report = Array.isArray(payload) ? payload[0] ?? {} : payload;
  const deliveryState = configuration.provider === "termii" ? mapTermiiSmsDeliveryStatus(String(report.status ?? "")) : mapTwilioSmsDeliveryStatus(String(report.status ?? ""));
  if (deliveryState !== "pending") {
    const transition = await updateProviderSmsDeliveryStatus({ schoolId: input.schoolId, providerMessageId: log.providerMessageId, deliveryState });
    const effectiveStatus = transition.updated ? transition.status : transition.status;
    if (effectiveStatus === "sent") {
      return { ok: true, deliveryState: "delivered" as const, message: "Provider confirmed that the test SMS was delivered." };
    }
    if (effectiveStatus === "failed") {
      return { ok: false, deliveryState: "failed" as const, message: "Provider confirmed that the test SMS was not delivered." };
    }
  }
  if (deliveryState === "delivered") {
    return { ok: true, deliveryState: "delivered" as const, message: "Provider confirmed that the test SMS was delivered." };
  }
  if (deliveryState === "failed") {
    return { ok: false, deliveryState: "failed" as const, message: "Provider confirmed that the test SMS was not delivered." };
  }
  return { ok: false, deliveryState: "pending" as const, message: "SMS was submitted but delivery has not been confirmed yet. Try again shortly." };
}

export async function getSchoolWebsite(schoolId: number) {
  const db = await database();
  const school = (await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1))[0];
  if (!school) throw new Error("School not found.");
  const website = (await db.select().from(schoolWebsites).where(eq(schoolWebsites.schoolId, schoolId)).limit(1))[0];
  return { school, website: website ?? { schoolId, headline: `${school.name}: learning for a brighter future.`, introduction: "", primaryColor: "#0f5c4f", contactEmail: school.email, contactPhone: school.phone, campusLocation: school.address ?? school.state, customDomain: null, domainStatus: "not_configured", admissionsEnabled: true, published: false } };
}

const admissionTemplateFieldIds = ["middleName", "dateOfBirth", "placeOfBirth", "nationality", "homeTown", "stateOfOrigin", "localGovernmentOfOrigin", "gender", "residentialAddress", "postalAddress", "priorSchool", "currentClass", "religion", "medicalHistory", "familyDoctor", "guardianOccupation", "guardianOfficeAddress"] as const;
type AdmissionTemplateFieldId = (typeof admissionTemplateFieldIds)[number];
type FeeScheduleEntry = { category: string; tuitionFee: number };

const defaultDocumentTemplate = {
  admissionTitle: "School admission form",
  headerTagline: "Nursery · Primary · College",
  headerLogoUrl: null,
  headerAddressLine: null,
  headerContactLine: null,
  admissionFields: ["middleName", "dateOfBirth", "placeOfBirth", "nationality", "homeTown", "stateOfOrigin", "localGovernmentOfOrigin", "gender", "residentialAddress", "priorSchool", "currentClass", "medicalHistory", "guardianOccupation"] as AdmissionTemplateFieldId[],
  declarationText: "I confirm that the information provided is accurate to the best of my knowledge and I understand that the school will use it only for admissions and student-support purposes.",
  requireDeclaration: true,
  termlyFeeTitle: "Termly fee guide",
  feeSchedule: [
    { category: "Kindergarten", tuitionFee: 15000 },
    { category: "Nursery", tuitionFee: 16000 },
    { category: "Primary 1–3", tuitionFee: 18000 },
    { category: "Primary 4–6", tuitionFee: 20000 },
    { category: "JSS 1–2", tuitionFee: 22000 },
    { category: "JSS 3", tuitionFee: 25000 },
    { category: "SSS 1–2", tuitionFee: 17000 },
    { category: "SSS 3", tuitionFee: 20000 },
  ] satisfies FeeScheduleEntry[],
};

function templateFields(value: unknown): AdmissionTemplateFieldId[] {
  if (!Array.isArray(value)) return defaultDocumentTemplate.admissionFields;
  const selected = value.filter((item): item is AdmissionTemplateFieldId => typeof item === "string" && admissionTemplateFieldIds.includes(item as AdmissionTemplateFieldId));
  const fields = selected.length ? Array.from(new Set(selected)) : defaultDocumentTemplate.admissionFields;
  return fields.includes("localGovernmentOfOrigin") && !fields.includes("stateOfOrigin") ? [...fields, "stateOfOrigin"] : fields;
}

function templateFees(value: unknown): FeeScheduleEntry[] {
  if (!Array.isArray(value)) return defaultDocumentTemplate.feeSchedule;
  const selected = value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const category = typeof entry.category === "string" ? entry.category.trim().slice(0, 120) : "";
    const tuitionFee = typeof entry.tuitionFee === "number" ? entry.tuitionFee : Number(entry.tuitionFee);
    return category && Number.isFinite(tuitionFee) && tuitionFee > 0 && tuitionFee <= 10_000_000 ? [{ category, tuitionFee: Math.round(tuitionFee * 100) / 100 }] : [];
  });
  const seenCategories = new Set<string>();
  const distinct = selected.filter(entry => {
    const key = entry.category.toLocaleLowerCase("en-NG");
    if (seenCategories.has(key)) return false;
    seenCategories.add(key);
    return true;
  });
  return distinct.length ? distinct.slice(0, 24) : defaultDocumentTemplate.feeSchedule;
}

export function normalisePublicHeaderLogoUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function publicAdmissionTemplate(template: { admissionTitle: string; headerTagline: string | null; headerLogoUrl: string | null; headerAddressLine: string | null; headerContactLine: string | null; admissionFields: unknown; declarationText: string | null; requireDeclaration: boolean } | undefined) {
  return {
    admissionTitle: template?.admissionTitle ?? defaultDocumentTemplate.admissionTitle,
    headerTagline: template?.headerTagline ?? defaultDocumentTemplate.headerTagline,
    headerLogoUrl: normalisePublicHeaderLogoUrl(template?.headerLogoUrl ?? undefined),
    headerAddressLine: template?.headerAddressLine?.trim() || null,
    headerContactLine: template?.headerContactLine?.trim() || null,
    admissionFields: templateFields(template?.admissionFields),
    declarationText: template?.declarationText ?? defaultDocumentTemplate.declarationText,
    requireDeclaration: template?.requireDeclaration ?? defaultDocumentTemplate.requireDeclaration,
  };
}

export async function getSchoolDocumentTemplate(schoolId: number) {
  const row = (await (await database()).select().from(schoolDocumentTemplates).where(eq(schoolDocumentTemplates.schoolId, schoolId)).limit(1))[0];
  return {
    ...(row ?? { schoolId, ...defaultDocumentTemplate, updatedBy: null, updatedAt: null }),
    admissionFields: templateFields(row?.admissionFields),
    feeSchedule: templateFees(row?.feeSchedule),
  };
}

export async function saveSchoolDocumentTemplate(input: { schoolId: number; admissionTitle: string; headerTagline?: string; headerLogoUrl?: string; headerAddressLine?: string; headerContactLine?: string; admissionFields: string[]; declarationText?: string; requireDeclaration: boolean; termlyFeeTitle: string; feeSchedule: FeeScheduleEntry[]; updatedBy: number }) {
  const values = {
    schoolId: input.schoolId,
    admissionTitle: input.admissionTitle.trim(),
    headerTagline: input.headerTagline?.trim() || null,
    headerLogoUrl: normalisePublicHeaderLogoUrl(input.headerLogoUrl),
    headerAddressLine: input.headerAddressLine?.trim() || null,
    headerContactLine: input.headerContactLine?.trim() || null,
    admissionFields: templateFields(input.admissionFields),
    declarationText: input.declarationText?.trim() || null,
    requireDeclaration: input.requireDeclaration,
    termlyFeeTitle: input.termlyFeeTitle.trim(),
    feeSchedule: templateFees(input.feeSchedule),
    updatedBy: input.updatedBy,
  };
  await (await database()).insert(schoolDocumentTemplates).values(values).onDuplicateKeyUpdate({ set: values });
  return getSchoolDocumentTemplate(input.schoolId);
}

export async function createDraftFeesFromTemplate(input: { schoolId: number; termId: number; classId?: number }) {
  const db = await database();
  const term = (await db.select({ id: academicTerms.id }).from(academicTerms).where(and(eq(academicTerms.id, input.termId), eq(academicTerms.schoolId, input.schoolId))).limit(1))[0];
  if (!term) throw new Error("Select an academic term in this school before adopting a termly fee guide.");
  if (input.classId) {
    const classRow = (await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, input.classId), eq(classes.schoolId, input.schoolId))).limit(1))[0];
    if (!classRow) throw new Error("Select a class in this school, or leave the class scope open.");
  }
  const template = await getSchoolDocumentTemplate(input.schoolId);
  const existing = await db.select({ name: feeStructures.name }).from(feeStructures).where(and(eq(feeStructures.schoolId, input.schoolId), eq(feeStructures.termId, input.termId), input.classId ? eq(feeStructures.classId, input.classId) : isNull(feeStructures.classId)));
  const existingNames = new Set(existing.map(row => row.name));
  const newRows = template.feeSchedule.map(entry => ({ name: `${template.termlyFeeTitle} · ${entry.category}`, amount: String(entry.tuitionFee), schoolId: input.schoolId, termId: input.termId, classId: input.classId ?? null, mandatory: true, status: "draft" as const })).filter(row => !existingNames.has(row.name));
  if (!newRows.length) throw new Error("This fee guide has already been adopted for the selected term and class scope.");
  await db.insert(feeStructures).values(newRows);
  return { createdCount: newRows.length, status: "draft" as const };
}

export async function saveSchoolWebsite(input: { schoolId: number; headline?: string; introduction?: string; primaryColor?: string; contactEmail?: string; contactPhone?: string; campusLocation?: string; customDomain?: string; admissionsEnabled?: boolean; published?: boolean }) {
  const db = await database();
  const customDomain = normaliseDomain(input.customDomain);
  if (customDomain && !isValidCustomDomain(customDomain)) throw new Error("Enter a valid domain name without a protocol or path.");
  const existing = (await db.select().from(schoolWebsites).where(eq(schoolWebsites.schoolId, input.schoolId)).limit(1))[0];
  const domainChanged = existing?.customDomain !== customDomain;
  const domainVerificationToken = customDomain ? (!domainChanged && existing?.domainVerificationToken ? existing.domainVerificationToken : crypto.randomUUID().replace(/-/g, "")) : null;
  const domainStatus = customDomain ? (domainChanged ? "pending" as const : existing?.domainStatus ?? "pending" as const) : "not_configured" as const;
  const values = { ...input, customDomain, domainVerificationToken, domainStatus };
  await db.insert(schoolWebsites).values(values).onDuplicateKeyUpdate({ set: values });
  return getSchoolWebsite(input.schoolId);
}

export async function verifySchoolWebsiteDomain(schoolId: number) {
  const db = await database();
  const website = (await db.select().from(schoolWebsites).where(eq(schoolWebsites.schoolId, schoolId)).limit(1))[0];
  if (!website?.customDomain || !website.domainVerificationToken) throw new Error("Set a custom domain before requesting verification.");
  const recordHost = `_nsos-verify.${website.customDomain}`;
  let records: string[][];
  try { records = await resolveTxt(recordHost); } catch { throw new Error(`No DNS TXT record was found at ${recordHost}.`); }
  const expected = `nsos-site-verification=${website.domainVerificationToken}`;
  if (!matchesDomainVerificationRecord(records, website.domainVerificationToken)) throw new Error("The DNS TXT record does not match this school’s verification token.");
  await db.update(schoolWebsites).set({ domainStatus: "active" }).where(eq(schoolWebsites.id, website.id));
  return getSchoolWebsite(schoolId);
}

function publicWebsiteResponse(row: { school: typeof schools.$inferSelect; website: typeof schoolWebsites.$inferSelect }) {
  return { ...row, admissionsUrl: row.website.admissionsEnabled ? `/apply/${row.school.shortCode}` : null };
}

export async function getPublicSchoolWebsite(shortCode: string) {
  const db = await database();
  const row = (await db.select({ school: schools, website: schoolWebsites }).from(schools).innerJoin(schoolWebsites, eq(schools.id, schoolWebsites.schoolId)).where(and(eq(schools.shortCode, shortCode.trim().toUpperCase()), eq(schoolWebsites.published, true))).limit(1))[0];
  if (!row) return undefined;
  return publicWebsiteResponse(row);
}

export async function getPublicSchoolWebsiteByDomain(domain: string) {
  const db = await database();
  const normalised = normaliseDomain(domain);
  if (!normalised) return undefined;
  const row = (await db.select({ school: schools, website: schoolWebsites }).from(schoolWebsites).innerJoin(schools, eq(schoolWebsites.schoolId, schools.id)).where(and(eq(schoolWebsites.customDomain, normalised), eq(schoolWebsites.domainStatus, "active"), eq(schoolWebsites.published, true))).limit(1))[0];
  return row && isActivePublishedDomain(row.website) ? publicWebsiteResponse(row) : undefined;
}

export async function getSchoolMembership(userId: number, schoolId: number) {
  const db = await database();
  return (await db.select().from(schoolMemberships).where(and(eq(schoolMemberships.userId, userId), eq(schoolMemberships.schoolId, schoolId))).limit(1))[0];
}

export async function upsertMembership(schoolId: number, userId: number, role: SchoolRole) {
  const db = await database();
  await db.insert(schoolMemberships).values({ schoolId, userId, role, status: "active" }).onDuplicateKeyUpdate({ set: { role, status: "active" } });
  return { success: true };
}

export async function getSchoolContext(schoolId: number, role: SchoolRole) {
  const db = await database();
  const school = (await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1))[0];
  if (!school) throw new Error("School not found");
  const [sessions, terms] = await Promise.all([
    db.select().from(academicSessions).where(eq(academicSessions.schoolId, schoolId)).orderBy(desc(academicSessions.isCurrent), desc(academicSessions.startsOn)),
    db.select().from(academicTerms).where(eq(academicTerms.schoolId, schoolId)).orderBy(desc(academicTerms.isCurrent), desc(academicTerms.startsOn)),
  ]);
  return { school, role, sessions, terms };
}

export async function getDashboardSummary(schoolId: number) {
  const db = await database();
  const [studentsCount, staffCount, applicationsCount, invoicesSummary, attendanceSummary, latestApplications, latestAnnouncements] = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(studentProfiles).where(and(eq(studentProfiles.schoolId, schoolId), eq(studentProfiles.status, "active"))),
    db.select({ value: sql<number>`count(*)` }).from(staffProfiles).where(and(eq(staffProfiles.schoolId, schoolId), eq(staffProfiles.employmentStatus, "active"))),
    db.select({ value: sql<number>`count(*)` }).from(admissionsApplications).where(and(eq(admissionsApplications.schoolId, schoolId), or(eq(admissionsApplications.status, "submitted"), eq(admissionsApplications.status, "under_review")))),
    db.select({ invoiced: sql<string>`COALESCE(SUM(${invoices.total}), 0)`, paid: sql<string>`COALESCE(SUM(${invoices.amountPaid}), 0)` }).from(invoices).where(eq(invoices.schoolId, schoolId)),
    db.select({ total: sql<number>`count(*)`, present: sql<number>`SUM(CASE WHEN ${attendanceRecords.status} IN ('present','late') THEN 1 ELSE 0 END)` }).from(attendanceRecords).where(eq(attendanceRecords.schoolId, schoolId)),
    db.select().from(admissionsApplications).where(eq(admissionsApplications.schoolId, schoolId)).orderBy(desc(admissionsApplications.submittedAt)).limit(5),
    db.select().from(announcements).where(and(eq(announcements.schoolId, schoolId), eq(announcements.status, "published"))).orderBy(desc(announcements.publishedAt)).limit(4),
  ]);
  const totalAttendance = Number(attendanceSummary[0]?.total ?? 0);
  return {
    activeStudents: Number(studentsCount[0]?.value ?? 0),
    activeStaff: Number(staffCount[0]?.value ?? 0),
    pendingAdmissions: Number(applicationsCount[0]?.value ?? 0),
    invoiced: Number(invoicesSummary[0]?.invoiced ?? 0),
    collected: Number(invoicesSummary[0]?.paid ?? 0),
    outstanding: Number(invoicesSummary[0]?.invoiced ?? 0) - Number(invoicesSummary[0]?.paid ?? 0),
    attendanceRate: totalAttendance ? Math.round((Number(attendanceSummary[0]?.present ?? 0) / totalAttendance) * 100) : 0,
    latestApplications,
    latestAnnouncements,
  };
}

export async function getTenantOnboardingStatus(schoolId: number) {
  const db = await database();
  const [school, sessionsCount, termsCount, classesCount, subjectsCount, classSubjectsCount, curriculumProfile, staffCount, studentsCount, feeStructuresCount, activeBankAccountsCount, website] = await Promise.all([
    db.select({ name: schools.name, shortCode: schools.shortCode, state: schools.state }).from(schools).where(eq(schools.id, schoolId)).limit(1),
    db.select({ value: sql<number>`count(*)` }).from(academicSessions).where(eq(academicSessions.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(academicTerms).where(eq(academicTerms.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(classes).where(eq(classes.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(subjects).where(eq(subjects.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(classSubjects).where(eq(classSubjects.schoolId, schoolId)),
    db.select({ id: schoolCurriculumProfiles.id }).from(schoolCurriculumProfiles).where(eq(schoolCurriculumProfiles.schoolId, schoolId)).limit(1),
    db.select({ value: sql<number>`count(*)` }).from(staffProfiles).where(and(eq(staffProfiles.schoolId, schoolId), eq(staffProfiles.employmentStatus, "active"))),
    db.select({ value: sql<number>`count(*)` }).from(studentProfiles).where(and(eq(studentProfiles.schoolId, schoolId), eq(studentProfiles.status, "active"))),
    db.select({ value: sql<number>`count(*)` }).from(feeStructures).where(eq(feeStructures.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(schoolBankAccounts).where(and(eq(schoolBankAccounts.schoolId, schoolId), eq(schoolBankAccounts.status, "active"))),
    db.select({ published: schoolWebsites.published }).from(schoolWebsites).where(eq(schoolWebsites.schoolId, schoolId)).limit(1),
  ]);
  const profile = school[0];
  if (!profile) throw new Error("School not found.");
  return deriveTenantOnboardingStatus({
    schoolProfileReady: Boolean(profile.name.trim() && profile.shortCode.trim() && profile.state?.trim()),
    sessions: Number(sessionsCount[0]?.value ?? 0),
    terms: Number(termsCount[0]?.value ?? 0),
    classes: Number(classesCount[0]?.value ?? 0),
    subjects: Number(subjectsCount[0]?.value ?? 0),
    classSubjects: Number(classSubjectsCount[0]?.value ?? 0),
    curriculumConfigured: Boolean(curriculumProfile[0]),
    activeStaff: Number(staffCount[0]?.value ?? 0),
    activeStudents: Number(studentsCount[0]?.value ?? 0),
    feeStructures: Number(feeStructuresCount[0]?.value ?? 0),
    activeBankAccounts: Number(activeBankAccountsCount[0]?.value ?? 0),
    websitePublished: Boolean(website[0]?.published),
  });
}

export async function runCopilotSetupAgentAcademicFoundation(input: { schoolId: number; executedBy: number; sessionName: string; sessionStartsOn: string; sessionEndsOn: string; termName: string; termStartsOn: string; termEndsOn: string; classes: Array<{ name: string; level?: string }>; templateId: "basic_primary" | "basic_junior_secondary" | "senior_secondary_review"; includeOptional: boolean }) {
  const db = await database();
  const sessionName = input.sessionName.trim();
  const termName = input.termName.trim();
  const requestedClasses = Array.from(new Map(input.classes.map(item => [item.name.trim().toLowerCase(), { name: item.name.trim(), level: item.level?.trim() || undefined }])).values());
  if (!requestedClasses.length) throw new Error("Add at least one real class name before the setup agent can continue.");
  const sessionStartsOn = asDate(input.sessionStartsOn);
  const sessionEndsOn = asDate(input.sessionEndsOn);
  const termStartsOn = asDate(input.termStartsOn);
  const termEndsOn = asDate(input.termEndsOn);
  if (!sessionStartsOn || !sessionEndsOn || !termStartsOn || !termEndsOn || sessionStartsOn > sessionEndsOn || termStartsOn > termEndsOn) throw new Error("Use valid start and end dates for the academic session and term.");
  if (termStartsOn < sessionStartsOn || termEndsOn > sessionEndsOn) throw new Error("Keep the term dates within the selected academic session.");

  let session = (await db.select().from(academicSessions).where(and(eq(academicSessions.schoolId, input.schoolId), eq(academicSessions.name, sessionName))).limit(1))[0];
  let sessionCreated = false;
  if (!session) {
    const created = await db.insert(academicSessions).values({ schoolId: input.schoolId, name: sessionName, startsOn: sessionStartsOn, endsOn: sessionEndsOn, status: "planning" });
    session = (await db.select().from(academicSessions).where(eq(academicSessions.id, Number(created[0].insertId))).limit(1))[0]!;
    sessionCreated = true;
  }

  let term = (await db.select().from(academicTerms).where(and(eq(academicTerms.schoolId, input.schoolId), eq(academicTerms.sessionId, session.id), eq(academicTerms.name, termName))).limit(1))[0];
  let termCreated = false;
  if (!term) {
    const created = await db.insert(academicTerms).values({ schoolId: input.schoolId, sessionId: session.id, name: termName, startsOn: termStartsOn, endsOn: termEndsOn, status: "planning" });
    term = (await db.select().from(academicTerms).where(eq(academicTerms.id, Number(created[0].insertId))).limit(1))[0]!;
    termCreated = true;
  }

  const existingClasses = await db.select().from(classes).where(eq(classes.schoolId, input.schoolId));
  const classesByName = new Map(existingClasses.map(item => [item.name.trim().toLowerCase(), item]));
  const classIds: number[] = [];
  let classesCreated = 0;
  for (const classInput of requestedClasses) {
    let classRow = classesByName.get(classInput.name.toLowerCase());
    if (!classRow) {
      const created = await db.insert(classes).values({ schoolId: input.schoolId, sessionId: session.id, name: classInput.name, level: classInput.level ?? null, status: "active" });
      classRow = { id: Number(created[0].insertId) } as typeof classes.$inferSelect;
      classesCreated += 1;
    }
    classIds.push(classRow.id);
  }

  const curriculum = await applyNigerianCurriculumTemplate({ schoolId: input.schoolId, templateId: input.templateId, classIds, includeOptional: input.includeOptional, appliedBy: input.executedBy });
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.executedBy, eventType: "copilot_setup_agent_academic_foundation_applied", targetType: "tenant_onboarding", targetId: input.schoolId, metadata: { sessionCreated, termCreated, classesCreated, classCount: classIds.length, templateId: input.templateId, includeOptional: input.includeOptional, confirmationRequired: true } });
  return { sessionId: session.id, termId: term.id, sessionCreated, termCreated, classesCreated, classIds, curriculum };
}

export async function listCopilotSetupAgentHistory(schoolId: number) {
  return (await listSecurityAuditEvents(schoolId, 100)).filter(event => event.eventType.startsWith("copilot_setup_agent_")).slice(0, 20);
}

type StaffInvitationRole = "admin" | "staff" | "teacher" | "finance";
type StaffInvitationEmploymentType = "full_time" | "part_time" | "contract" | "temporary";

function normaliseStaffInvitationEmployeeNo(value: string) {
  const employeeNo = value.trim().toUpperCase().replace(/\s+/g, " ");
  if (employeeNo.length < 2 || employeeNo.length > 48) throw new Error("Enter a school-approved employee number between 2 and 48 characters.");
  return employeeNo;
}

export async function prepareCopilotSetupAgentStaffInvitation(input: { schoolId: number; preparedBy: number; firstName: string; lastName: string; email: string; employeeNo: string; jobTitle: string; role: StaffInvitationRole; employmentType: StaffInvitationEmploymentType }) {
  const db = await database();
  const email = normaliseAuthEmail(input.email);
  const employeeNo = normaliseStaffInvitationEmployeeNo(input.employeeNo);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const jobTitle = input.jobTitle.trim();
  const [staffWithEmployeeNo, openInvitation] = await Promise.all([
    db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.schoolId, input.schoolId), eq(staffProfiles.employeeNo, employeeNo))).limit(1),
    db.select({ id: staffSetupInvitations.id }).from(staffSetupInvitations).where(and(eq(staffSetupInvitations.schoolId, input.schoolId), eq(staffSetupInvitations.email, email), inArray(staffSetupInvitations.status, ["draft", "sending", "sent"]))).limit(1),
  ]);
  if (staffWithEmployeeNo[0]) throw new Error("This employee number already belongs to a staff profile in this school.");
  if (openInvitation[0]) throw new Error("A pending invitation already exists for this email address in this school.");
  const created = await db.insert(staffSetupInvitations).values({ schoolId: input.schoolId, firstName, lastName, email, employeeNo, jobTitle, role: input.role, employmentType: input.employmentType, status: "draft", createdBy: input.preparedBy });
  const invitationId = Number(created[0].insertId);
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.preparedBy, eventType: "copilot_setup_agent_staff_invitation_prepared", targetType: "staff_setup_invitation", targetId: invitationId, metadata: { role: input.role, employmentType: input.employmentType, invitationPrepared: true, confirmationRequired: true } });
  return { invitationId, status: "draft" as const };
}

export async function listCopilotSetupAgentStaffInvitations(schoolId: number) {
  return (await (await database()).select({ id: staffSetupInvitations.id, firstName: staffSetupInvitations.firstName, lastName: staffSetupInvitations.lastName, email: staffSetupInvitations.email, employeeNo: staffSetupInvitations.employeeNo, jobTitle: staffSetupInvitations.jobTitle, role: staffSetupInvitations.role, employmentType: staffSetupInvitations.employmentType, status: staffSetupInvitations.status, sentAt: staffSetupInvitations.sentAt, acceptedAt: staffSetupInvitations.acceptedAt, createdAt: staffSetupInvitations.createdAt }).from(staffSetupInvitations).where(eq(staffSetupInvitations.schoolId, schoolId)).orderBy(desc(staffSetupInvitations.createdAt)).limit(20));
}

export async function claimCopilotSetupAgentStaffInvitationForDelivery(input: { schoolId: number; invitationId: number }) {
  const db = await database();
  const updated = await db.update(staffSetupInvitations).set({ status: "sending" }).where(and(eq(staffSetupInvitations.id, input.invitationId), eq(staffSetupInvitations.schoolId, input.schoolId), inArray(staffSetupInvitations.status, ["draft", "sent"])));
  const affectedRows = Number((updated as any)?.[0]?.affectedRows ?? (updated as any)?.affectedRows ?? 0);
  if (affectedRows !== 1) throw new Error("This invitation is no longer available to send. Refresh the setup agent and review its status.");
  const invitation = (await db.select({ id: staffSetupInvitations.id, schoolId: staffSetupInvitations.schoolId, firstName: staffSetupInvitations.firstName, lastName: staffSetupInvitations.lastName, email: staffSetupInvitations.email, role: staffSetupInvitations.role, jobTitle: staffSetupInvitations.jobTitle, schoolName: schools.name }).from(staffSetupInvitations).innerJoin(schools, eq(staffSetupInvitations.schoolId, schools.id)).where(and(eq(staffSetupInvitations.id, input.invitationId), eq(staffSetupInvitations.schoolId, input.schoolId))).limit(1))[0];
  if (!invitation) throw new Error("Staff invitation not found.");
  return invitation;
}

export async function releaseCopilotSetupAgentStaffInvitationDelivery(input: { schoolId: number; invitationId: number }) {
  await (await database()).update(staffSetupInvitations).set({ status: "draft" }).where(and(eq(staffSetupInvitations.id, input.invitationId), eq(staffSetupInvitations.schoolId, input.schoolId), eq(staffSetupInvitations.status, "sending")));
}

export async function markCopilotSetupAgentStaffInvitationSent(input: { schoolId: number; invitationId: number; sentBy: number }) {
  const db = await database();
  await db.update(staffSetupInvitations).set({ status: "sent", sentAt: new Date() }).where(and(eq(staffSetupInvitations.id, input.invitationId), eq(staffSetupInvitations.schoolId, input.schoolId), eq(staffSetupInvitations.status, "sending")));
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.sentBy, eventType: "copilot_setup_agent_staff_invitation_sent", targetType: "staff_setup_invitation", targetId: input.invitationId, metadata: { invitationSent: true, confirmationRequired: true } });
  return { invitationId: input.invitationId, status: "sent" as const };
}

export async function acceptCopilotSetupAgentStaffInvitationsForVerifiedEmail(input: { email: string; userId: number }) {
  const db = await database();
  const email = normaliseAuthEmail(input.email);
  const invitations = await db.select().from(staffSetupInvitations).where(and(eq(staffSetupInvitations.email, email), eq(staffSetupInvitations.status, "sent")));
  let acceptedCount = 0;
  for (const invitation of invitations) {
    const [membership, linkedStaff] = await Promise.all([
      db.select().from(schoolMemberships).where(and(eq(schoolMemberships.schoolId, invitation.schoolId), eq(schoolMemberships.userId, input.userId))).limit(1),
      db.select().from(staffProfiles).where(and(eq(staffProfiles.schoolId, invitation.schoolId), eq(staffProfiles.userId, input.userId))).limit(1),
    ]);
    if (membership[0] && membership[0].role !== invitation.role) continue;
    if (linkedStaff[0]) continue;
    const duplicateEmployeeNo = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.schoolId, invitation.schoolId), eq(staffProfiles.employeeNo, invitation.employeeNo))).limit(1))[0];
    if (duplicateEmployeeNo) continue;
    await db.insert(schoolMemberships).values({ schoolId: invitation.schoolId, userId: input.userId, role: invitation.role, status: "active" }).onDuplicateKeyUpdate({ set: { role: invitation.role, status: "active" } });
    await db.insert(staffProfiles).values({ schoolId: invitation.schoolId, userId: input.userId, employeeNo: invitation.employeeNo, firstName: invitation.firstName, lastName: invitation.lastName, email: invitation.email, jobTitle: invitation.jobTitle, employmentType: invitation.employmentType, employmentStatus: "active" });
    await db.update(staffSetupInvitations).set({ status: "accepted", acceptedUserId: input.userId, acceptedAt: new Date() }).where(eq(staffSetupInvitations.id, invitation.id));
    await recordSecurityAuditEvent({ schoolId: invitation.schoolId, actorUserId: input.userId, eventType: "copilot_setup_agent_staff_invitation_accepted", targetType: "staff_setup_invitation", targetId: invitation.id, metadata: { role: invitation.role, staffProfileCreated: true } });
    acceptedCount += 1;
  }
  return { acceptedCount };
}

export async function prepareCopilotSetupAgentFinanceDraft(input: { schoolId: number; preparedBy: number; name: string; amount: number; termId?: number; classId?: number; mandatory: boolean; dueOn?: string }) {
  const db = await database();
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 10_000_000) throw new Error("Enter a fee amount between ₦0.01 and ₦10,000,000.");
  if (input.termId) {
    const term = (await db.select({ id: academicTerms.id }).from(academicTerms).where(and(eq(academicTerms.id, input.termId), eq(academicTerms.schoolId, input.schoolId))).limit(1))[0];
    if (!term) throw new Error("Select a term that belongs to this school.");
  }
  if (input.classId) {
    const classRow = (await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, input.classId), eq(classes.schoolId, input.schoolId))).limit(1))[0];
    if (!classRow) throw new Error("Select a class that belongs to this school.");
  }
  const created = await db.insert(feeStructures).values({ schoolId: input.schoolId, name: input.name.trim(), amount: String(input.amount), termId: input.termId ?? null, classId: input.classId ?? null, mandatory: input.mandatory, dueOn: asDate(input.dueOn), status: "draft" });
  const feeStructureId = Number(created[0].insertId);
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.preparedBy, eventType: "copilot_setup_agent_finance_draft_prepared", targetType: "fee_structure", targetId: feeStructureId, metadata: { mandatory: input.mandatory, termScoped: Boolean(input.termId), classScoped: Boolean(input.classId), status: "draft", confirmationRequired: true } });
  return { feeStructureId, status: "draft" as const };
}

export async function listCopilotSetupAgentFinanceDrafts(schoolId: number) {
  return (await (await database()).select({ id: feeStructures.id, name: feeStructures.name, amount: feeStructures.amount, termId: feeStructures.termId, classId: feeStructures.classId, mandatory: feeStructures.mandatory, dueOn: feeStructures.dueOn, status: feeStructures.status, createdAt: feeStructures.createdAt }).from(feeStructures).where(and(eq(feeStructures.schoolId, schoolId), eq(feeStructures.status, "draft"))).orderBy(desc(feeStructures.createdAt)).limit(30)).map(item => ({ ...item, amount: Number(item.amount) }));
}

export async function activateCopilotSetupAgentFinanceDraft(input: { schoolId: number; feeStructureId: number; approvedBy: number; approvalNote?: string }) {
  const db = await database();
  const draft = (await db.select().from(feeStructures).where(and(eq(feeStructures.id, input.feeStructureId), eq(feeStructures.schoolId, input.schoolId), eq(feeStructures.status, "draft"))).limit(1))[0];
  if (!draft) throw new Error("Only a current draft fee structure can be activated.");
  await db.update(feeStructures).set({ status: "active" }).where(and(eq(feeStructures.id, input.feeStructureId), eq(feeStructures.schoolId, input.schoolId), eq(feeStructures.status, "draft")));
  const approvalNote = input.approvalNote?.trim();
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.approvedBy, eventType: "copilot_setup_agent_finance_draft_activated", targetType: "fee_structure", targetId: input.feeStructureId, metadata: { mandatory: draft.mandatory, activatedFromDraft: true, explicitApproval: true, ...(approvalNote ? { approvalNote } : {}) } });
  return { feeStructureId: input.feeStructureId, status: "active" as const };
}

export async function listApplications(schoolId: number, status?: "submitted" | "under_review" | "accepted" | "declined" | "enrolled") {
  const db = await database();
  return db.select().from(admissionsApplications).where(status ? and(eq(admissionsApplications.schoolId, schoolId), eq(admissionsApplications.status, status)) : eq(admissionsApplications.schoolId, schoolId)).orderBy(desc(admissionsApplications.submittedAt));
}

export async function createApplication(input: Record<string, unknown>) {
  const db = await database();
  const { schoolId, ...application } = input as { schoolId: number } & Record<string, unknown>;
  const created = await db.insert(admissionsApplications).values({ ...application, schoolId, applicationNo: makeNumber("APP") } as typeof admissionsApplications.$inferInsert);
  return { applicationId: Number(created[0].insertId) };
}

export async function reviewApplication(applicationId: number, status: "under_review" | "accepted" | "declined", decisionNote: string | undefined, reviewerId: number) {
  const db = await database();
  await db.update(admissionsApplications).set({ status, reviewerId, decisionNote: decisionNote ?? null, decidedAt: status === "under_review" ? null : new Date() }).where(eq(admissionsApplications.id, applicationId));
  return { success: true };
}

export async function listAdmissionDocuments(applicationId: number) {
  return (await database()).select().from(admissionDocuments).where(eq(admissionDocuments.applicationId, applicationId)).orderBy(desc(admissionDocuments.uploadedAt));
}

export async function uploadAdmissionDocument(input: { schoolId: number; applicationId: number; label: string; fileName: string; mimeType: string; base64: string }) {
  const db = await database();
  const application = (await db.select().from(admissionsApplications).where(and(eq(admissionsApplications.id, input.applicationId), eq(admissionsApplications.schoolId, input.schoolId))).limit(1))[0];
  if (!application) throw new Error("Admission application not found.");
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const { key, url } = await storagePut(`schools/${input.schoolId}/admissions/${input.applicationId}/${safeName}`, Buffer.from(input.base64, "base64"), input.mimeType);
  const result = await db.insert(admissionDocuments).values({ applicationId: input.applicationId, label: input.label, storageKey: key, url, mimeType: input.mimeType });
  return { documentId: Number(result[0].insertId), url };
}

export async function reviewAdmissionDocument(documentId: number, status: "verified" | "rejected", reviewNote: string | undefined, reviewerId: number) {
  await (await database()).update(admissionDocuments).set({ status, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: reviewNote ?? null }).where(eq(admissionDocuments.id, documentId));
  return { success: true };
}

export async function enrolApplication(input: { schoolId: number; applicationId: number; admissionNo: string; classId: number; sessionId: number; admittedOn: string }) {
  const db = await database();
  const [application, classRow, session, school] = await Promise.all([
    (await db.select().from(admissionsApplications).where(and(eq(admissionsApplications.id, input.applicationId), eq(admissionsApplications.schoolId, input.schoolId))).limit(1))[0],
    (await db.select({ id: classes.id, name: classes.name }).from(classes).where(and(eq(classes.id, input.classId), eq(classes.schoolId, input.schoolId))).limit(1))[0],
    (await db.select({ id: academicSessions.id, name: academicSessions.name }).from(academicSessions).where(and(eq(academicSessions.id, input.sessionId), eq(academicSessions.schoolId, input.schoolId))).limit(1))[0],
    (await db.select({ name: schools.name, address: schools.address, state: schools.state }).from(schools).where(eq(schools.id, input.schoolId)).limit(1))[0],
  ]);
  if (!application || application.status !== "accepted") throw new Error("Only accepted applications can be enrolled.");
  if (!classRow || !session || !school) throw new Error("Choose a class and academic session that belong to this school.");
  const supplement = (application.supplementalData ?? {}) as Record<string, string>;
  const stateOfOrigin = supplement.stateOfOrigin?.trim() || undefined;
  const localGovernment = supplement.localGovernmentOfOrigin?.trim() || undefined;
  const created = await db.insert(studentProfiles).values({ schoolId: input.schoolId, admissionNo: input.admissionNo, firstName: application.firstName, lastName: application.lastName, middleName: supplement.middleName?.trim() || null, dateOfBirth: application.dateOfBirth, gender: application.gender, address: supplement.residentialAddress?.trim() || null, stateOfOrigin, localGovernment, medicalNotes: supplement.medicalHistory?.trim() || null, admittedOn: asDate(input.admittedOn) });
  const studentId = Number(created[0].insertId);
  await db.insert(enrollments).values({ schoolId: input.schoolId, studentId, classId: input.classId, sessionId: input.sessionId, enrolledOn: asDate(input.admittedOn)! });
  await db.update(admissionsApplications).set({ status: "enrolled" }).where(eq(admissionsApplications.id, input.applicationId));
  return { studentId, biodataTransferred: true, admissionLetter: { guardianEmail: application.guardianEmail ?? null, guardianName: application.guardianName, studentName: [application.firstName, supplement.middleName?.trim(), application.lastName].filter(Boolean).join(" "), schoolName: school.name, schoolAddress: school.address ?? school.state, admissionNo: input.admissionNo, className: classRow.name, sessionName: session.name, admittedOn: input.admittedOn } };
}

export async function listStudents(schoolId: number, search?: string) {
  const db = await database();
  const criteria = search ? and(eq(studentProfiles.schoolId, schoolId), or(like(studentProfiles.firstName, `%${search}%`), like(studentProfiles.lastName, `%${search}%`), like(studentProfiles.admissionNo, `%${search}%`))) : eq(studentProfiles.schoolId, schoolId);
  return db.select().from(studentProfiles).where(criteria).orderBy(desc(studentProfiles.createdAt));
}

export async function getStudentAcademicHistory(schoolId: number, studentId: number) {
  const db = await database();
  return db.select({ enrollment: enrollments, className: classes.name, sessionName: academicSessions.name }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).innerJoin(academicSessions, eq(enrollments.sessionId, academicSessions.id)).where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.studentId, studentId))).orderBy(desc(enrollments.enrolledOn));
}

export async function createStudent(input: Record<string, unknown>) {
  const db = await database();
  const { classId, sessionId, ...student } = input as { classId: number; sessionId: number } & Record<string, unknown>;
  const created = await db.insert(studentProfiles).values(student as typeof studentProfiles.$inferInsert);
  const studentId = Number(created[0].insertId);
  await db.insert(enrollments).values({ schoolId: Number(student.schoolId), studentId, classId, sessionId, enrolledOn: asDate(String(student.admittedOn))! });
  return { studentId };
}

export async function promoteStudent(input: { schoolId: number; studentId: number; toClassId: number; sessionId: number; note?: string }) {
  const db = await database();
  await db.update(enrollments).set({ status: "promoted", promotionNote: input.note ?? null }).where(and(eq(enrollments.studentId, input.studentId), eq(enrollments.schoolId, input.schoolId)));
  await db.insert(enrollments).values({ schoolId: input.schoolId, studentId: input.studentId, classId: input.toClassId, sessionId: input.sessionId, enrolledOn: new Date() });
  return { success: true };
}

export async function graduateStudent(schoolId: number, studentId: number, graduationYear: number) {
  const db = await database();
  await db.update(studentProfiles).set({ status: "graduated", graduationYear }).where(and(eq(studentProfiles.id, studentId), eq(studentProfiles.schoolId, schoolId)));
  await db.update(enrollments).set({ status: "graduated" }).where(and(eq(enrollments.studentId, studentId), eq(enrollments.schoolId, schoolId)));
  return { success: true };
}

export async function linkGuardianToStudent(input: { schoolId: number; studentId: number; firstName: string; lastName: string; relationship: string; email?: string; phone?: string; isPrimary?: boolean }) {
  const db = await database();
  const guardian = await db.insert(guardians).values({ schoolId: input.schoolId, firstName: input.firstName, lastName: input.lastName, relationship: input.relationship, email: input.email, phone: input.phone, isPrimaryContact: input.isPrimary ?? false });
  const guardianId = Number(guardian[0].insertId);
  await db.insert(studentGuardians).values({ studentId: input.studentId, guardianId, isPrimary: input.isPrimary ?? false });
  return { guardianId };
}

export async function listAcademicData(schoolId: number) {
  const db = await database();
  const [sessions, terms, classList, subjectList, classSubjectList, timetable, lessonPlanList, curriculum, curriculumProfile, schemeImports, schemeRows] = await Promise.all([
    db.select().from(academicSessions).where(eq(academicSessions.schoolId, schoolId)).orderBy(desc(academicSessions.startsOn)),
    db.select().from(academicTerms).where(eq(academicTerms.schoolId, schoolId)).orderBy(desc(academicTerms.startsOn)),
    db.select().from(classes).where(eq(classes.schoolId, schoolId)).orderBy(classes.name),
    db.select().from(subjects).where(eq(subjects.schoolId, schoolId)).orderBy(subjects.name),
    db.select().from(classSubjects).where(eq(classSubjects.schoolId, schoolId)),
    db.select().from(timetableEntries).where(eq(timetableEntries.schoolId, schoolId)),
    db.select().from(lessonPlans).where(eq(lessonPlans.schoolId, schoolId)).orderBy(desc(lessonPlans.createdAt)),
    db.select().from(curriculumMilestones).where(eq(curriculumMilestones.schoolId, schoolId)).orderBy(curriculumMilestones.targetWeek),
    db.select().from(schoolCurriculumProfiles).where(eq(schoolCurriculumProfiles.schoolId, schoolId)).limit(1),
    db.select().from(schemeOfWorkImports).where(eq(schemeOfWorkImports.schoolId, schoolId)).orderBy(desc(schemeOfWorkImports.importedAt)),
    db.select().from(schemeOfWorkRows).where(eq(schemeOfWorkRows.schoolId, schoolId)),
  ]);
  const importHistory = schemeImports.map(item => {
    const rows = schemeRows.filter(row => row.importId === item.id);
    return { id: item.id, classId: item.classId, subjectId: item.subjectId, termId: item.termId, fileName: item.fileName, mimeType: item.mimeType, rowCount: item.rowCount, importedAt: item.importedAt, reviewSummary: { pending: rows.filter(row => row.reviewStatus === "pending_review").length, approved: rows.filter(row => row.reviewStatus === "approved").length, returned: rows.filter(row => row.reviewStatus === "returned").length, published: rows.filter(row => row.reviewStatus === "published").length } };
  });
  return { sessions, terms, classes: classList, subjects: subjectList, classSubjects: classSubjectList, timetable, lessonPlans: lessonPlanList, curriculum, curriculumProfile: curriculumProfile[0] ?? null, schemeImports: importHistory };
}

export const createAcademicSession = async (input: Record<string, unknown>) => (await database()).insert(academicSessions).values({ ...input, isCurrent: input.isCurrent ?? false } as typeof academicSessions.$inferInsert);
export const createAcademicTerm = async (input: Record<string, unknown>) => (await database()).insert(academicTerms).values({ ...input, isCurrent: input.isCurrent ?? false } as typeof academicTerms.$inferInsert);
export const createClass = async (input: Record<string, unknown>) => (await database()).insert(classes).values(input as typeof classes.$inferInsert);
export const createSubject = async (input: Record<string, unknown>) => (await database()).insert(subjects).values(input as typeof subjects.$inferInsert);
export const createTimetableEntry = async (input: Record<string, unknown>) => (await database()).insert(timetableEntries).values(input as typeof timetableEntries.$inferInsert);
export const createLessonPlan = async (input: Record<string, unknown>) => (await database()).insert(lessonPlans).values(input as typeof lessonPlans.$inferInsert);
export const createCurriculumMilestone = async (input: Record<string, unknown>) => (await database()).insert(curriculumMilestones).values(input as typeof curriculumMilestones.$inferInsert);

export function getCurriculumTemplateCatalog() {
  return listNigerianCurriculumTemplates();
}

export async function assignClassSubject(input: { schoolId: number; classId: number; subjectId: number; teacherId?: number }) {
  const db = await database();
  const [targetClass, targetSubject] = await Promise.all([
    db.select().from(classes).where(and(eq(classes.id, input.classId), eq(classes.schoolId, input.schoolId))).limit(1),
    db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.schoolId, input.schoolId))).limit(1),
  ]);
  if (!targetClass[0] || !targetSubject[0]) throw new Error("Select a class and subject that belong to this school.");
  if (input.teacherId) {
    const teacher = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.id, input.teacherId), eq(staffProfiles.schoolId, input.schoolId))).limit(1))[0];
    if (!teacher) throw new Error("Select a teacher profile that belongs to this school.");
  }
  await db.insert(classSubjects).values({ schoolId: input.schoolId, classId: input.classId, subjectId: input.subjectId, teacherId: input.teacherId ?? null }).onDuplicateKeyUpdate({ set: { teacherId: input.teacherId ?? null } });
  return { success: true };
}

export async function applyNigerianCurriculumTemplate(input: { schoolId: number; templateId: NigerianCurriculumTemplateId; classIds: number[]; includeOptional: boolean; appliedBy: number }) {
  const db = await database();
  const template = getNigerianCurriculumTemplate(input.templateId);
  const requestedClassIds = Array.from(new Set(input.classIds));
  const schoolClasses = await db.select().from(classes).where(eq(classes.schoolId, input.schoolId));
  if (!requestedClassIds.length || requestedClassIds.some(classId => !schoolClasses.some(item => item.id === classId))) throw new Error("Select one or more classes that belong to this school.");
  const subjectsToApply = template.subjects.filter(subject => input.includeOptional || !subject.optional);
  const existingSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, input.schoolId));
  const byCode = new Map<string, { id: number }>(existingSubjects.map(subject => [subject.code, { id: subject.id }]));
  let createdSubjectCount = 0;
  for (const subject of subjectsToApply) {
    if (byCode.has(subject.code)) continue;
    const created = await db.insert(subjects).values({ schoolId: input.schoolId, code: subject.code, name: subject.name, description: `Added from ${template.name}.` });
    byCode.set(subject.code, { id: Number(created[0].insertId) });
    createdSubjectCount += 1;
  }
  let classSubjectLinks = 0;
  for (const classId of requestedClassIds) {
    for (const subject of subjectsToApply) {
      const subjectId = byCode.get(subject.code)!.id;
      await db.insert(classSubjects).values({ schoolId: input.schoolId, classId, subjectId }).onDuplicateKeyUpdate({ set: { schoolId: input.schoolId } });
      classSubjectLinks += 1;
    }
  }
  const profile = { schoolId: input.schoolId, framework: template.framework, templateId: template.id, sourceUrl: template.sourceUrl, appliedClassIds: requestedClassIds, appliedBy: input.appliedBy, appliedAt: new Date() } as typeof schoolCurriculumProfiles.$inferInsert;
  await db.insert(schoolCurriculumProfiles).values(profile).onDuplicateKeyUpdate({ set: profile });
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.appliedBy, eventType: "nigerian_curriculum_template_applied", targetType: "school_curriculum_profile", targetId: input.schoolId, metadata: { templateId: template.id, classCount: requestedClassIds.length, subjectCount: subjectsToApply.length, optionalSubjectsIncluded: input.includeOptional } });
  return { template: template.name, createdSubjectCount, classSubjectLinks, classIds: requestedClassIds };
}

export async function importApprovedSchemeOfWork(input: { schoolId: number; classId: number; subjectId: number; termId: number; fileName: string; mimeType: "text/csv" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; base64: string; rows: ReviewedSchemeRow[]; replaceExisting: boolean; importedBy: number }) {
  const db = await database();
  const fileName = safeSchemeFileName(input.fileName);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)) throw new Error("The uploaded file could not be verified. Upload it again and review the rows.");
  const fileBytes = Buffer.from(input.base64, "base64");
  if (!fileBytes.length || fileBytes.length > MAX_SCHEME_FILE_BYTES) throw new Error("Upload a non-empty CSV or Excel file no larger than 2 MB.");
  const rows = normaliseReviewedSchemeRows(input.rows);
  const [classRow, subjectRow, termRow, classSubject] = await Promise.all([
    db.select().from(classes).where(and(eq(classes.id, input.classId), eq(classes.schoolId, input.schoolId))).limit(1),
    db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.schoolId, input.schoolId))).limit(1),
    db.select().from(academicTerms).where(and(eq(academicTerms.id, input.termId), eq(academicTerms.schoolId, input.schoolId))).limit(1),
    db.select().from(classSubjects).where(and(eq(classSubjects.schoolId, input.schoolId), eq(classSubjects.classId, input.classId), eq(classSubjects.subjectId, input.subjectId))).limit(1),
  ]);
  if (!classRow[0] || !subjectRow[0] || !termRow[0] || !classSubject[0]) throw new Error("Map the scheme to a class, approved subject, and term that belong to this school.");
  if (!classSubject[0].teacherId) throw new Error("Assign the class-subject teacher before importing a scheme for review.");
  const priorImports = await db.select().from(schemeOfWorkImports).where(and(eq(schemeOfWorkImports.schoolId, input.schoolId), eq(schemeOfWorkImports.classId, input.classId), eq(schemeOfWorkImports.subjectId, input.subjectId), eq(schemeOfWorkImports.termId, input.termId)));
  if (priorImports.length && !input.replaceExisting) throw new Error("An approved scheme already exists for this class, subject, and term. Review it and explicitly replace it to continue.");
  if (priorImports.length) {
    for (const prior of priorImports) {
      const priorRows = await db.select().from(schemeOfWorkRows).where(eq(schemeOfWorkRows.importId, prior.id));
      for (const priorRow of priorRows) await db.delete(curriculumMilestones).where(and(eq(curriculumMilestones.id, priorRow.milestoneId), eq(curriculumMilestones.schoolId, input.schoolId)));
      await db.delete(schemeOfWorkRows).where(eq(schemeOfWorkRows.importId, prior.id));
      await db.delete(schemeOfWorkImports).where(eq(schemeOfWorkImports.id, prior.id));
    }
  }
  const fileHash = createHash("sha256").update(fileBytes).digest("hex");
  const stored = await storagePut(`schools/${input.schoolId}/curriculum-schemes/${crypto.randomUUID()}/${fileName}`, fileBytes, input.mimeType);
  const imported = await db.insert(schemeOfWorkImports).values({ schoolId: input.schoolId, classId: input.classId, subjectId: input.subjectId, termId: input.termId, fileName, fileKey: stored.key, mimeType: input.mimeType, contentSha256: fileHash, rowCount: rows.length, importedBy: input.importedBy });
  const importId = Number(imported[0].insertId);
  for (const row of rows) {
    const milestone = await db.insert(curriculumMilestones).values({ schoolId: input.schoolId, classSubjectId: classSubject[0].id, termId: input.termId, title: row.topic, targetWeek: row.weekNo });
    await db.insert(schemeOfWorkRows).values({ importId, schoolId: input.schoolId, milestoneId: Number(milestone[0].insertId), assignedTeacherId: classSubject[0].teacherId, weekNo: row.weekNo, topic: row.topic, objectives: row.objectives ?? null, resources: row.resources ?? null, reviewStatus: "pending_review" });
  }
  let revisionNotificationCreated = false;
  if (priorImports.length) {
    const assignedTeacher = (await db.select({ userId: staffProfiles.userId }).from(staffProfiles).where(and(eq(staffProfiles.id, classSubject[0].teacherId), eq(staffProfiles.schoolId, input.schoolId), eq(staffProfiles.employmentStatus, "active"))).limit(1))[0];
    if (assignedTeacher?.userId) {
      await db.insert(teacherSchemeRevisionNotifications).values({ schoolId: input.schoolId, recipientUserId: assignedTeacher.userId, importId, classId: input.classId, subjectId: input.subjectId, termId: input.termId, classLabel: classRow[0].name, subjectLabel: subjectRow[0].name, termLabel: termRow[0].name }).onDuplicateKeyUpdate({ set: { readAt: null, createdAt: new Date() } });
      revisionNotificationCreated = true;
      await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.importedBy, eventType: "weekly_plan_revision_teacher_notified", targetType: "scheme_of_work_import", targetId: importId, metadata: { recipientAssigned: true, classId: input.classId, subjectId: input.subjectId, termId: input.termId } });
    }
  }
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.importedBy, eventType: "scheme_of_work_imported", targetType: "scheme_of_work_import", targetId: importId, metadata: { classId: input.classId, subjectId: input.subjectId, termId: input.termId, rowCount: rows.length, replacedExisting: input.replaceExisting, fileType: input.mimeType } });
  return { importId, rowCount: rows.length, fileName, replacedExisting: input.replaceExisting, revisionNotificationCreated };
}

async function activeTeacherStaffProfile(schoolId: number, userId: number) {
  const db = await database();
  const staff = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.schoolId, schoolId), eq(staffProfiles.userId, userId), eq(staffProfiles.employmentStatus, "active"))).limit(1))[0];
  if (!staff) throw new Error("Your teacher account is not linked to an active staff profile for this school.");
  return staff;
}

export async function listTeacherSchemeRevisionNotifications(schoolId: number, userId: number) {
  await activeTeacherStaffProfile(schoolId, userId);
  await clearExpiredSchoolLeaderSchemeRecommendations(schoolId);
  return (await database()).select().from(teacherSchemeRevisionNotifications).where(and(eq(teacherSchemeRevisionNotifications.schoolId, schoolId), eq(teacherSchemeRevisionNotifications.recipientUserId, userId))).orderBy(desc(teacherSchemeRevisionNotifications.pinnedAt), desc(teacherSchemeRevisionNotifications.createdAt));
}

export async function markTeacherSchemeRevisionNotificationRead(input: { schoolId: number; notificationId: number; userId: number }) {
  await activeTeacherStaffProfile(input.schoolId, input.userId);
  await clearExpiredSchoolLeaderSchemeRecommendations(input.schoolId);
  const db = await database();
  const notification = (await db.select().from(teacherSchemeRevisionNotifications).where(and(eq(teacherSchemeRevisionNotifications.id, input.notificationId), eq(teacherSchemeRevisionNotifications.schoolId, input.schoolId), eq(teacherSchemeRevisionNotifications.recipientUserId, input.userId))).limit(1))[0];
  if (!notification) throw new Error("Revised weekly-plan notification not found.");
  if (!notification.readAt) await db.update(teacherSchemeRevisionNotifications).set({ readAt: new Date() }).where(and(eq(teacherSchemeRevisionNotifications.id, input.notificationId), eq(teacherSchemeRevisionNotifications.recipientUserId, input.userId)));
  await db.update(teacherSchemeRevisionRecommendationOutcomes).set({ acknowledgedAt: new Date() }).where(and(eq(teacherSchemeRevisionRecommendationOutcomes.schoolId, input.schoolId), eq(teacherSchemeRevisionRecommendationOutcomes.notificationId, input.notificationId), isNull(teacherSchemeRevisionRecommendationOutcomes.acknowledgedAt), isNull(teacherSchemeRevisionRecommendationOutcomes.expiredAt), isNull(teacherSchemeRevisionRecommendationOutcomes.clearedAt)));
  return { success: true, importId: notification.importId };
}

export async function setTeacherSchemeRevisionNotificationPinned(input: { schoolId: number; notificationId: number; userId: number; pinned: boolean }) {
  await activeTeacherStaffProfile(input.schoolId, input.userId);
  const db = await database();
  const notification = (await db.select().from(teacherSchemeRevisionNotifications).where(and(eq(teacherSchemeRevisionNotifications.id, input.notificationId), eq(teacherSchemeRevisionNotifications.schoolId, input.schoolId), eq(teacherSchemeRevisionNotifications.recipientUserId, input.userId))).limit(1))[0];
  if (!notification) throw new Error("Revised weekly-plan notification not found.");
  await db.update(teacherSchemeRevisionNotifications).set({ pinnedAt: input.pinned ? new Date() : null }).where(and(eq(teacherSchemeRevisionNotifications.id, input.notificationId), eq(teacherSchemeRevisionNotifications.schoolId, input.schoolId), eq(teacherSchemeRevisionNotifications.recipientUserId, input.userId)));
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.userId, eventType: input.pinned ? "weekly_plan_revision_alert_pinned" : "weekly_plan_revision_alert_unpinned", targetType: "teacher_scheme_revision_notification", targetId: input.notificationId, metadata: { pinned: input.pinned } });
  return { success: true, pinned: input.pinned };
}

export async function listSchoolLeaderSchemeRevisionNotifications(schoolId: number) {
  await clearExpiredSchoolLeaderSchemeRecommendations(schoolId);
  const rows = await (await database()).select({ notification: teacherSchemeRevisionNotifications, recipientName: users.name }).from(teacherSchemeRevisionNotifications).innerJoin(users, eq(teacherSchemeRevisionNotifications.recipientUserId, users.id)).where(eq(teacherSchemeRevisionNotifications.schoolId, schoolId)).orderBy(desc(teacherSchemeRevisionNotifications.recommendedAt), desc(teacherSchemeRevisionNotifications.createdAt));
  return rows.map(row => ({ ...row.notification, recipientName: row.recipientName }));
}

async function clearExpiredSchoolLeaderSchemeRecommendations(schoolId: number) {
  const now = new Date();
  const db = await database();
  await db.update(teacherSchemeRevisionRecommendationOutcomes).set({ expiredAt: now }).where(and(eq(teacherSchemeRevisionRecommendationOutcomes.schoolId, schoolId), isNull(teacherSchemeRevisionRecommendationOutcomes.acknowledgedAt), isNull(teacherSchemeRevisionRecommendationOutcomes.expiredAt), sql`${teacherSchemeRevisionRecommendationOutcomes.expiresAt} <= ${now}`));
  await db.update(teacherSchemeRevisionNotifications).set({ recommendedAt: null, recommendedBy: null, recommendationExpiresAt: null }).where(and(eq(teacherSchemeRevisionNotifications.schoolId, schoolId), sql`${teacherSchemeRevisionNotifications.recommendationExpiresAt} IS NOT NULL AND ${teacherSchemeRevisionNotifications.recommendationExpiresAt} <= ${now}`));
}

export async function setSchoolLeaderSchemeRevisionNotificationRecommended(input: { schoolId: number; notificationId: number; userId: number; recommended: boolean; recommendationExpiresAt?: Date }) {
  const db = await database();
  const notification = (await db.select().from(teacherSchemeRevisionNotifications).where(and(eq(teacherSchemeRevisionNotifications.id, input.notificationId), eq(teacherSchemeRevisionNotifications.schoolId, input.schoolId))).limit(1))[0];
  if (!notification) throw new Error("Revised weekly-plan notification not found.");
  if (input.recommended && input.recommendationExpiresAt && input.recommendationExpiresAt.getTime() <= Date.now()) throw new Error("Recommendation expiry must be in the future.");
  const expiresAt = input.recommended ? input.recommendationExpiresAt ?? null : null;
  const now = new Date();
  await db.update(teacherSchemeRevisionNotifications).set({ recommendedAt: input.recommended ? now : null, recommendedBy: input.recommended ? input.userId : null, recommendationExpiresAt: expiresAt }).where(and(eq(teacherSchemeRevisionNotifications.id, input.notificationId), eq(teacherSchemeRevisionNotifications.schoolId, input.schoolId)));
  if (input.recommended && expiresAt) await db.insert(teacherSchemeRevisionRecommendationOutcomes).values({ schoolId: input.schoolId, notificationId: input.notificationId, recipientUserId: notification.recipientUserId, classLabel: notification.classLabel, subjectLabel: notification.subjectLabel, termLabel: notification.termLabel, expiresAt, acknowledgedAt: null, expiredAt: null, clearedAt: null }).onDuplicateKeyUpdate({ set: { expiresAt, acknowledgedAt: null, expiredAt: null, clearedAt: null, createdAt: now } });
  if (!input.recommended) await db.update(teacherSchemeRevisionRecommendationOutcomes).set({ clearedAt: now }).where(and(eq(teacherSchemeRevisionRecommendationOutcomes.schoolId, input.schoolId), eq(teacherSchemeRevisionRecommendationOutcomes.notificationId, input.notificationId), isNull(teacherSchemeRevisionRecommendationOutcomes.acknowledgedAt), isNull(teacherSchemeRevisionRecommendationOutcomes.expiredAt), isNull(teacherSchemeRevisionRecommendationOutcomes.clearedAt)));
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.userId, eventType: input.recommended ? "weekly_plan_revision_alert_recommended" : "weekly_plan_revision_alert_recommendation_cleared", targetType: "teacher_scheme_revision_notification", targetId: input.notificationId, metadata: { recommended: input.recommended, expiresAt: expiresAt?.toISOString() ?? null } });
  return { success: true, recommended: input.recommended, recommendationExpiresAt: expiresAt };
}

export async function listExpiredBeforeAcknowledgementRecommendationReport(schoolId: number) {
  await clearExpiredSchoolLeaderSchemeRecommendations(schoolId);
  const rows = await (await database()).select({ outcome: teacherSchemeRevisionRecommendationOutcomes, recipientName: users.name }).from(teacherSchemeRevisionRecommendationOutcomes).innerJoin(users, eq(teacherSchemeRevisionRecommendationOutcomes.recipientUserId, users.id)).where(and(eq(teacherSchemeRevisionRecommendationOutcomes.schoolId, schoolId), isNull(teacherSchemeRevisionRecommendationOutcomes.acknowledgedAt), sql`${teacherSchemeRevisionRecommendationOutcomes.expiredAt} IS NOT NULL`)).orderBy(desc(teacherSchemeRevisionRecommendationOutcomes.expiredAt));
  return rows.map(row => ({ ...row.outcome, recipientName: row.recipientName }));
}

export async function listTeacherSchemeReviews(schoolId: number, userId: number) {
  const db = await database();
  const staff = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.schoolId, schoolId), eq(staffProfiles.userId, userId), eq(staffProfiles.employmentStatus, "active"))).limit(1))[0];
  if (!staff) throw new Error("Your teacher account is not linked to an active staff profile for this school.");
  const rows = await db.select({ row: schemeOfWorkRows, import: schemeOfWorkImports, className: classes.name, subjectName: subjects.name, termName: academicTerms.name }).from(schemeOfWorkRows).innerJoin(schemeOfWorkImports, eq(schemeOfWorkRows.importId, schemeOfWorkImports.id)).innerJoin(classes, eq(schemeOfWorkImports.classId, classes.id)).innerJoin(subjects, eq(schemeOfWorkImports.subjectId, subjects.id)).innerJoin(academicTerms, eq(schemeOfWorkImports.termId, academicTerms.id)).where(and(eq(schemeOfWorkRows.schoolId, schoolId), eq(schemeOfWorkRows.assignedTeacherId, staff.id))).orderBy(schemeOfWorkRows.importId, schemeOfWorkRows.weekNo);
  const rowIds = rows.map(item => item.row.id);
  const comments = rowIds.length ? await db.select().from(schemeOfWorkInlineComments).where(and(eq(schemeOfWorkInlineComments.schoolId, schoolId), inArray(schemeOfWorkInlineComments.rowId, rowIds))).orderBy(schemeOfWorkInlineComments.createdAt) : [];
  const commentsByRow = new Map<number, typeof comments>();
  for (const comment of comments) commentsByRow.set(comment.rowId, [...(commentsByRow.get(comment.rowId) ?? []), comment]);
  return rows.map(item => ({ id: item.row.id, importId: item.row.importId, weekNo: item.row.weekNo, topic: item.row.topic, objectives: item.row.objectives, resources: item.row.resources, reviewStatus: item.row.reviewStatus, reviewNote: item.row.reviewNote, className: item.className, subjectName: item.subjectName, termName: item.termName, comments: commentsByRow.get(item.row.id) ?? [] }));
}

export async function addAssignedSchemeRowInlineComment(input: { schoolId: number; rowId: number; anchor: "topic" | "objectives" | "resources"; body: string; createdByUserId: number }) {
  const db = await database();
  const staff = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.schoolId, input.schoolId), eq(staffProfiles.userId, input.createdByUserId), eq(staffProfiles.employmentStatus, "active"))).limit(1))[0];
  if (!staff) throw new Error("Your teacher account is not linked to an active staff profile for this school.");
  const row = (await db.select().from(schemeOfWorkRows).where(and(eq(schemeOfWorkRows.id, input.rowId), eq(schemeOfWorkRows.schoolId, input.schoolId), eq(schemeOfWorkRows.assignedTeacherId, staff.id))).limit(1))[0];
  if (!row) throw new Error("This weekly plan is not assigned to your teacher profile.");
  if (row.reviewStatus === "published") throw new Error("Published weekly plans cannot receive new review comments.");
  const body = input.body.trim();
  if (!body) throw new Error("Write a concise comment before saving it.");
  const result = await db.insert(schemeOfWorkInlineComments).values({ schoolId: input.schoolId, rowId: input.rowId, anchor: input.anchor, body, createdBy: input.createdByUserId });
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.createdByUserId, eventType: "weekly_plan_inline_comment_added", targetType: "scheme_of_work_row", targetId: input.rowId, metadata: { anchor: input.anchor, bodyStored: true } });
  return { success: true, commentId: Number(result[0].insertId) };
}

export async function listSchemeImportInlineComments(schoolId: number, importId: number) {
  const db = await database();
  const imported = (await db.select().from(schemeOfWorkImports).where(and(eq(schemeOfWorkImports.id, importId), eq(schemeOfWorkImports.schoolId, schoolId))).limit(1))[0];
  if (!imported) throw new Error("Imported scheme not found.");
  const rows = await db.select().from(schemeOfWorkRows).where(and(eq(schemeOfWorkRows.importId, importId), eq(schemeOfWorkRows.schoolId, schoolId))).orderBy(schemeOfWorkRows.weekNo);
  const rowIds = rows.map(row => row.id);
  const comments = rowIds.length ? await db.select().from(schemeOfWorkInlineComments).where(and(eq(schemeOfWorkInlineComments.schoolId, schoolId), inArray(schemeOfWorkInlineComments.rowId, rowIds))).orderBy(schemeOfWorkInlineComments.createdAt) : [];
  return rows.map(row => ({ rowId: row.id, weekNo: row.weekNo, topic: row.topic, comments: comments.filter(comment => comment.rowId === row.id) }));
}

export async function reviewAssignedSchemeRow(input: { schoolId: number; rowId: number; decision: "approved" | "returned"; reviewNote?: string; reviewedByUserId: number }) {
  const db = await database();
  const staff = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.schoolId, input.schoolId), eq(staffProfiles.userId, input.reviewedByUserId), eq(staffProfiles.employmentStatus, "active"))).limit(1))[0];
  if (!staff) throw new Error("Your teacher account is not linked to an active staff profile for this school.");
  const row = (await db.select().from(schemeOfWorkRows).where(and(eq(schemeOfWorkRows.id, input.rowId), eq(schemeOfWorkRows.schoolId, input.schoolId), eq(schemeOfWorkRows.assignedTeacherId, staff.id))).limit(1))[0];
  if (!row) throw new Error("This weekly plan is not assigned to your teacher profile.");
  if (row.reviewStatus === "published") throw new Error("A published weekly plan cannot be changed through teacher review.");
  if (input.decision === "returned" && !input.reviewNote?.trim()) throw new Error("Add a short return note so the school can revise the plan.");
  await db.update(schemeOfWorkRows).set({ reviewStatus: input.decision, reviewNote: input.reviewNote?.trim() || null, reviewedBy: input.reviewedByUserId, reviewedAt: new Date() }).where(and(eq(schemeOfWorkRows.id, input.rowId), eq(schemeOfWorkRows.assignedTeacherId, staff.id), eq(schemeOfWorkRows.schoolId, input.schoolId)));
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.reviewedByUserId, eventType: "weekly_plan_teacher_reviewed", targetType: "scheme_of_work_row", targetId: input.rowId, metadata: { decision: input.decision, noteProvided: Boolean(input.reviewNote?.trim()) } });
  return { success: true };
}

export async function publishApprovedSchemeImport(input: { schoolId: number; importId: number; publishedBy: number }) {
  const db = await database();
  const imported = (await db.select().from(schemeOfWorkImports).where(and(eq(schemeOfWorkImports.id, input.importId), eq(schemeOfWorkImports.schoolId, input.schoolId))).limit(1))[0];
  if (!imported) throw new Error("Imported scheme not found.");
  const rows = await db.select().from(schemeOfWorkRows).where(and(eq(schemeOfWorkRows.importId, input.importId), eq(schemeOfWorkRows.schoolId, input.schoolId)));
  if (!rows.length) throw new Error("This import has no weekly plans to publish.");
  if (rows.some(row => row.reviewStatus !== "approved" && row.reviewStatus !== "published")) throw new Error("Every weekly plan must be approved by its assigned teacher before publication.");
  const now = new Date();
  for (const row of rows) {
    if (row.reviewStatus === "published") continue;
    await db.update(schemeOfWorkRows).set({ reviewStatus: "published", publishedBy: input.publishedBy, publishedAt: now }).where(eq(schemeOfWorkRows.id, row.id));
    await db.update(curriculumMilestones).set({ status: "in_progress" }).where(and(eq(curriculumMilestones.id, row.milestoneId), eq(curriculumMilestones.schoolId, input.schoolId)));
  }
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.publishedBy, eventType: "approved_weekly_plans_published", targetType: "scheme_of_work_import", targetId: input.importId, metadata: { rowCount: rows.length, publicationGate: "teacher_approved" } });
  return { success: true, rowCount: rows.length };
}

export async function listAttendance(schoolId: number, filters: { attendanceDate?: string; attendeeType?: "student" | "staff" }) {
  const db = await database();
  const conditions = [eq(attendanceRecords.schoolId, schoolId)];
  if (filters.attendanceDate) conditions.push(eq(attendanceRecords.attendanceDate, asDate(filters.attendanceDate)!));
  if (filters.attendeeType) conditions.push(eq(attendanceRecords.attendeeType, filters.attendeeType));
  return db.select().from(attendanceRecords).where(and(...conditions)).orderBy(desc(attendanceRecords.attendanceDate));
}

export async function getAbsenceAlerts(schoolId: number) {
  const db = await database();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);
  return db.select({ studentId: attendanceRecords.studentId, absentDays: sql<number>`count(*)` }).from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.attendeeType, "student"), eq(attendanceRecords.status, "absent"), sql`${attendanceRecords.attendanceDate} >= ${fromDate}`)).groupBy(attendanceRecords.studentId).having(sql`count(*) >= 3`);
}

export async function recordAttendance(input: Record<string, unknown>) {
  const db = await database();
  const data = input as typeof attendanceRecords.$inferInsert;
  if (data.attendeeType === "student" && !data.studentId) throw new Error("Student attendance requires a student.");
  if (data.attendeeType === "staff" && !data.staffId) throw new Error("Staff attendance requires a staff profile.");
  const target = data.attendeeType === "student" ? data.studentId : data.staffId;
  const where = data.attendeeType === "student" ? and(eq(attendanceRecords.studentId, target!), eq(attendanceRecords.attendanceDate, data.attendanceDate)) : and(eq(attendanceRecords.staffId, target!), eq(attendanceRecords.attendanceDate, data.attendanceDate));
  const existing = (await db.select().from(attendanceRecords).where(where).limit(1))[0];
  if (existing) await db.update(attendanceRecords).set({ status: data.status, note: data.note ?? null, recordedBy: data.recordedBy }).where(eq(attendanceRecords.id, existing.id));
  else await db.insert(attendanceRecords).values(data);
  return { success: true };
}

export async function listResultsData(schoolId: number) {
  const db = await database();
  const [assessmentList, scales, publications] = await Promise.all([
    db.select().from(assessments).where(eq(assessments.schoolId, schoolId)).orderBy(desc(assessments.createdAt)),
    listGradeScales(schoolId),
    db.select().from(resultPublications).where(eq(resultPublications.schoolId, schoolId)).orderBy(desc(resultPublications.createdAt)),
  ]);
  return { assessments: assessmentList, gradeScales: scales, publications };
}

export const createAssessment = async (input: Record<string, unknown>) => (await database()).insert(assessments).values({ ...input, maximumScore: Math.round(Number(input.maximumScore)), weight: String(input.weight ?? 100) } as typeof assessments.$inferInsert);
export async function getAssessment(id: number) { return (await (await database()).select().from(assessments).where(eq(assessments.id, id)).limit(1))[0]; }
export async function listGradeScales(schoolId: number) {
  const rows = await (await database()).select().from(gradeScales).where(eq(gradeScales.schoolId, schoolId)).orderBy(gradeScales.sortOrder);
  return rows.map(row => ({ ...row, minPercentage: Number(row.minPercentage), maxPercentage: Number(row.maxPercentage) }));
}
export async function upsertScore(input: { schoolId: number; assessmentId: number; studentId: number; score: number; comment?: string; enteredBy: number; percentage: number; grade: string }) {
  const db = await database();
  await db.insert(scores).values({ schoolId: input.schoolId, assessmentId: input.assessmentId, studentId: input.studentId, score: String(input.score), comment: input.comment ?? null, enteredBy: input.enteredBy }).onDuplicateKeyUpdate({ set: { score: String(input.score), comment: input.comment ?? null, enteredBy: input.enteredBy } });
  return { percentage: input.percentage, grade: input.grade };
}
export async function approveResults(schoolId: number, termId: number, classId: number, approvedBy: number) {
  const db = await database();
  await db.insert(resultPublications).values({ schoolId, termId, classId, status: "approved", approvedBy, approvedAt: new Date() }).onDuplicateKeyUpdate({ set: { status: "approved", approvedBy, approvedAt: new Date() } });
  return { success: true };
}
export async function publishResults(schoolId: number, termId: number, classId: number, publishedBy: number) {
  const db = await database();
  const publication = (await db.select().from(resultPublications).where(and(eq(resultPublications.schoolId, schoolId), eq(resultPublications.termId, termId), eq(resultPublications.classId, classId))).limit(1))[0];
  if (!publication || publication.status !== "approved") throw new Error("Result approval is required before publication.");
  await db.update(resultPublications).set({ status: "published", publishedBy, publishedAt: new Date() }).where(eq(resultPublications.id, publication.id));
  return { success: true };
}

export async function getStudentReportCard(schoolId: number, studentId: number, termId: number) {
  const db = await database();
  const student = (await db.select().from(studentProfiles).where(and(eq(studentProfiles.id, studentId), eq(studentProfiles.schoolId, schoolId))).limit(1))[0];
  if (!student) throw new Error("Student not found.");
  const assessmentRows = await db.select().from(assessments).where(and(eq(assessments.schoolId, schoolId), eq(assessments.termId, termId)));
  const scoreRows = assessmentRows.length ? await db.select().from(scores).where(and(eq(scores.schoolId, schoolId), eq(scores.studentId, studentId))) : [];
  const scoreMap = new Map(scoreRows.map(item => [item.assessmentId, item]));
  const subjectRows = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
  const subjectMap = new Map(subjectRows.map(item => [item.id, item.name]));
  const entries = assessmentRows.map(item => {
    const score = scoreMap.get(item.id);
    const percentage = score ? Number(((Number(score.score) / item.maximumScore) * 100).toFixed(2)) : null;
    return { assessment: item.title, subject: subjectMap.get(item.subjectId) ?? `Subject #${item.subjectId}`, score: score ? Number(score.score) : null, maximumScore: item.maximumScore, percentage };
  });
  const recorded = entries.filter(entry => entry.percentage !== null);
  const average = recorded.length ? Number((recorded.reduce((sum, entry) => sum + (entry.percentage ?? 0), 0) / recorded.length).toFixed(2)) : null;
  return { student, termId, entries, average };
}

export async function listFinanceData(schoolId: number) {
  const db = await database();
  const [fees, invoiceList, paymentList, bankAccountRows] = await Promise.all([
    db.select().from(feeStructures).where(eq(feeStructures.schoolId, schoolId)).orderBy(desc(feeStructures.createdAt)),
    db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).orderBy(desc(invoices.createdAt)),
    db.select().from(payments).where(eq(payments.schoolId, schoolId)).orderBy(desc(payments.createdAt)),
    db.select().from(schoolBankAccounts).where(eq(schoolBankAccounts.schoolId, schoolId)).orderBy(desc(schoolBankAccounts.isPrimary), desc(schoolBankAccounts.updatedAt)),
  ]);
  const bankAccounts = bankAccountRows.map(account => ({ id: account.id, bankName: account.bankName, accountName: account.accountName, accountNumberMasked: `••••••${account.accountNumberLast4}`, accountType: account.accountType, status: account.status, isPrimary: account.isPrimary, paymentReferenceGuidance: account.paymentReferenceGuidance, updatedAt: account.updatedAt }));
  return { feeStructures: fees, invoices: invoiceList, payments: paymentList, bankAccounts };
}

export async function createSchoolBankAccount(input: { schoolId: number; bankName: string; accountName: string; accountNumber: string; accountType: "current" | "savings" | "corporate" | "other"; status: "draft" | "active"; isPrimary: boolean; paymentReferenceGuidance?: string; configuredBy: number }) {
  const db = await database();
  const accountNumber = normaliseNigerianBankAccountNumber(input.accountNumber);
  if (input.isPrimary) await db.update(schoolBankAccounts).set({ isPrimary: false }).where(eq(schoolBankAccounts.schoolId, input.schoolId));
  const created = await db.insert(schoolBankAccounts).values({ schoolId: input.schoolId, bankName: input.bankName.trim(), accountName: input.accountName.trim(), encryptedAccountNumber: sealBankAccountNumber(accountNumber), accountNumberLast4: accountNumber.slice(-4), accountType: input.accountType, status: input.status, isPrimary: input.isPrimary, paymentReferenceGuidance: input.paymentReferenceGuidance?.trim() || null, configuredBy: input.configuredBy });
  const bankAccountId = Number(created[0].insertId);
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.configuredBy, eventType: "school_bank_account_created", targetType: "school_bank_account", targetId: bankAccountId, metadata: { bankName: input.bankName.trim(), accountType: input.accountType, status: input.status, isPrimary: input.isPrimary, accountNumberState: "encrypted" } });
  return { bankAccountId, accountNumberMasked: maskBankAccountNumber(accountNumber) };
}

export async function updateSchoolBankAccountStatus(input: { schoolId: number; bankAccountId: number; status: "active" | "archived"; isPrimary?: boolean; configuredBy: number }) {
  const db = await database();
  const account = (await db.select().from(schoolBankAccounts).where(and(eq(schoolBankAccounts.id, input.bankAccountId), eq(schoolBankAccounts.schoolId, input.schoolId))).limit(1))[0];
  if (!account) throw new Error("Bank account not found.");
  const isPrimary = input.status === "active" && input.isPrimary === true;
  if (isPrimary) await db.update(schoolBankAccounts).set({ isPrimary: false }).where(eq(schoolBankAccounts.schoolId, input.schoolId));
  await db.update(schoolBankAccounts).set({ status: input.status, isPrimary: isPrimary || (input.status === "archived" ? false : account.isPrimary) }).where(and(eq(schoolBankAccounts.id, input.bankAccountId), eq(schoolBankAccounts.schoolId, input.schoolId)));
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.configuredBy, eventType: "school_bank_account_status_updated", targetType: "school_bank_account", targetId: input.bankAccountId, metadata: { status: input.status, isPrimary } });
  return { success: true };
}

export const createFeeStructure = async (input: Record<string, unknown>) => (await database()).insert(feeStructures).values({ ...input, amount: String(input.amount), status: "active" } as typeof feeStructures.$inferInsert);
export async function createInvoice(input: { schoolId: number; studentId: number; termId?: number; issueDate: string; dueDate?: string; lineItems: { description: string; quantity: number; unitAmount: number; feeStructureId?: number }[]; discount?: number; note?: string; createdBy: number }) {
  const db = await database();
  const subtotal = input.lineItems.reduce((sum, item) => sum + item.quantity * item.unitAmount, 0);
  const discount = input.discount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const created = await db.insert(invoices).values({ schoolId: input.schoolId, studentId: input.studentId, termId: input.termId, invoiceNo: makeNumber("INV"), issueDate: asDate(input.issueDate)!, dueDate: asDate(input.dueDate), subtotal: String(subtotal), discount: String(discount), total: String(total), amountPaid: "0", status: "issued", note: input.note, createdBy: input.createdBy });
  const invoiceId = Number(created[0].insertId);
  await db.insert(invoiceLineItems).values(input.lineItems.map(item => ({ invoiceId, feeStructureId: item.feeStructureId, description: item.description, quantity: item.quantity, unitAmount: String(item.unitAmount), lineTotal: String(item.quantity * item.unitAmount) })));
  return { invoiceId };
}
export async function recordPayment(input: { schoolId: number; invoiceId: number; amount: number; paidOn: string; method: "cash" | "bank_transfer" | "card" | "pos" | "cheque" | "other"; reference?: string; note?: string; recordedBy: number }) {
  const db = await database();
  const invoice = (await db.select().from(invoices).where(and(eq(invoices.id, input.invoiceId), eq(invoices.schoolId, input.schoolId))).limit(1))[0];
  if (!invoice) throw new Error("Invoice not found.");
  const currentPaid = Number(invoice.amountPaid);
  const newPaid = currentPaid + input.amount;
  const total = Number(invoice.total);
  if (newPaid > total + 0.009) throw new Error("Payment exceeds the outstanding balance.");
  await db.insert(payments).values({ schoolId: input.schoolId, invoiceId: input.invoiceId, receiptNo: makeNumber("RCT"), amount: String(input.amount), paidOn: asDate(input.paidOn)!, method: input.method, reference: input.reference, note: input.note, recordedBy: input.recordedBy });
  await db.update(invoices).set({ amountPaid: String(newPaid), status: newPaid >= total ? "paid" : "partial" }).where(eq(invoices.id, input.invoiceId));
  return { success: true, outstanding: Math.max(0, total - newPaid) };
}

type CashAssuranceCaseStatus = "open" | "contact_due" | "awaiting_promise" | "payment_under_review" | "disputed" | "escalated" | "settled" | "closed";
type CashAssurancePriority = "low" | "normal" | "high" | "urgent";

function isActiveCashAssuranceCase(status: CashAssuranceCaseStatus) {
  return status !== "settled" && status !== "closed";
}

function invoiceOutstanding(invoice: { total: string | number; amountPaid: string | number }) {
  return Math.max(0, Number(invoice.total) - Number(invoice.amountPaid));
}

async function getCashAssuranceCaseOrThrow(schoolId: number, caseId: number) {
  const item = (await (await database()).select().from(cashAssuranceCases).where(and(eq(cashAssuranceCases.id, caseId), eq(cashAssuranceCases.schoolId, schoolId))).limit(1))[0];
  if (!item) throw new Error("Cash Assurance case not found.");
  return item;
}

async function addCashAssuranceEvent(input: { schoolId: number; caseId: number; eventType: string; actorUserId?: number; actorType?: "user" | "guardian" | "system"; note?: string }) {
  await (await database()).insert(cashAssuranceEvents).values({ schoolId: input.schoolId, caseId: input.caseId, eventType: input.eventType.slice(0, 96), actorType: input.actorType ?? "user", actorUserId: input.actorUserId ?? null, note: input.note?.slice(0, 2000) ?? null });
}

export async function listCashAssuranceData(schoolId: number) {
  const db = await database();
  const [invoiceRows, caseRows, links, evidenceRows, promiseRows, eventRows, students] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).orderBy(desc(invoices.updatedAt)),
    db.select().from(cashAssuranceCases).where(eq(cashAssuranceCases.schoolId, schoolId)).orderBy(desc(cashAssuranceCases.updatedAt)),
    db.select().from(cashAssuranceCaseInvoices),
    db.select().from(paymentEvidence).where(eq(paymentEvidence.schoolId, schoolId)).orderBy(desc(paymentEvidence.createdAt)),
    db.select().from(paymentPromises).where(eq(paymentPromises.schoolId, schoolId)).orderBy(desc(paymentPromises.createdAt)),
    db.select().from(cashAssuranceEvents).where(eq(cashAssuranceEvents.schoolId, schoolId)).orderBy(desc(cashAssuranceEvents.createdAt)).limit(100),
    db.select().from(studentProfiles).where(eq(studentProfiles.schoolId, schoolId)),
  ]);
  const invoiceById = new Map(invoiceRows.map(item => [item.id, item]));
  const studentById = new Map(students.map(item => [item.id, item]));
  const linksByCase = new Map<number, typeof links>();
  for (const link of links) {
    if (!caseRows.some(item => item.id === link.caseId)) continue;
    linksByCase.set(link.caseId, [...(linksByCase.get(link.caseId) ?? []), link]);
  }
  const cases = caseRows.map(item => {
    const caseInvoices = (linksByCase.get(item.id) ?? []).map(link => {
      const invoice = invoiceById.get(link.invoiceId);
      return invoice ? { ...invoice, outstanding: invoiceOutstanding(invoice), snapshotOutstanding: Number(link.snapshotOutstandingAmount) } : null;
    }).filter(Boolean);
    const outstanding = caseInvoices.reduce((sum, invoice) => sum + Number(invoice?.outstanding ?? 0), 0);
    const latestPromise = promiseRows.find(promise => promise.caseId === item.id) ?? null;
    const evidence = evidenceRows.filter(row => row.caseId === item.id);
    return { ...item, student: studentById.get(item.studentId) ?? null, invoices: caseInvoices, outstanding, latestPromise, evidence };
  });
  const outstandingInvoices = invoiceRows.filter(item => item.status !== "void").map(item => invoiceOutstanding(item));
  const today = new Date();
  const overdue = invoiceRows.filter(item => item.status !== "void" && item.dueDate && new Date(item.dueDate) < today).reduce((sum, item) => sum + invoiceOutstanding(item), 0);
  return {
    dashboard: {
      outstanding: outstandingInvoices.reduce((sum, amount) => sum + amount, 0),
      overdue,
      activeCases: cases.filter(item => isActiveCashAssuranceCase(item.status as CashAssuranceCaseStatus)).length,
      highPriorityCases: cases.filter(item => isActiveCashAssuranceCase(item.status as CashAssuranceCaseStatus) && ["high", "urgent"].includes(item.priority)).length,
      evidenceUnderReview: evidenceRows.filter(item => item.status === "submitted" || item.status === "under_review").length,
    },
    cases,
    events: eventRows,
    paymentEvidence: evidenceRows,
    promises: promiseRows,
  };
}

export async function openCashAssuranceCase(input: { schoolId: number; studentId: number; invoiceId: number; priority: CashAssurancePriority; assignedTo?: number; nextActionOn?: string; note?: string; openedBy: number }) {
  const db = await database();
  const [student, invoice] = await Promise.all([
    db.select().from(studentProfiles).where(and(eq(studentProfiles.id, input.studentId), eq(studentProfiles.schoolId, input.schoolId))).limit(1),
    db.select().from(invoices).where(and(eq(invoices.id, input.invoiceId), eq(invoices.schoolId, input.schoolId), eq(invoices.studentId, input.studentId))).limit(1),
  ]);
  if (!student[0]) throw new Error("Student not found in this school workspace.");
  if (!invoice[0]) throw new Error("Invoice does not belong to the selected student in this school.");
  if (invoice[0].status === "void" || invoiceOutstanding(invoice[0]) <= 0.009) throw new Error("Only an outstanding invoice can be added to a Cash Assurance case.");
  const existingLinks = await db.select().from(cashAssuranceCaseInvoices).where(eq(cashAssuranceCaseInvoices.invoiceId, input.invoiceId));
  const linkedCases = await Promise.all(existingLinks.map(link => getCashAssuranceCaseOrThrow(input.schoolId, link.caseId).catch(() => null)));
  if (linkedCases.some(item => item && isActiveCashAssuranceCase(item.status as CashAssuranceCaseStatus))) throw new Error("This invoice already has an active Cash Assurance case.");
  const relationships = await db.select().from(studentGuardians).where(eq(studentGuardians.studentId, input.studentId));
  const primaryGuardian = relationships.find(item => item.isPrimary) ?? relationships[0];
  const created = await db.insert(cashAssuranceCases).values({ schoolId: input.schoolId, studentId: input.studentId, guardianId: primaryGuardian?.guardianId ?? null, priority: input.priority, assignedTo: input.assignedTo ?? null, nextActionAt: asDate(input.nextActionOn), openedBy: input.openedBy });
  const caseId = Number(created[0].insertId);
  await db.insert(cashAssuranceCaseInvoices).values({ caseId, invoiceId: input.invoiceId, snapshotOutstandingAmount: String(invoiceOutstanding(invoice[0])) });
  await addCashAssuranceEvent({ schoolId: input.schoolId, caseId, eventType: "case_opened", actorUserId: input.openedBy, note: input.note });
  return { caseId };
}

export async function recordCashAssurancePromise(input: { schoolId: number; caseId: number; promisedAmount: number; promisedOn: string; note?: string; recordedBy: number }) {
  const db = await database();
  const item = await getCashAssuranceCaseOrThrow(input.schoolId, input.caseId);
  if (!isActiveCashAssuranceCase(item.status as CashAssuranceCaseStatus) || item.status === "disputed") throw new Error("A payment promise cannot be added to this case in its current status.");
  const inserted = await db.insert(paymentPromises).values({ schoolId: input.schoolId, caseId: input.caseId, promisedAmount: String(input.promisedAmount), promisedOn: asDate(input.promisedOn)!, note: input.note ?? null, recordedBy: input.recordedBy });
  await db.update(cashAssuranceCases).set({ status: "awaiting_promise", nextActionAt: asDate(input.promisedOn) }).where(eq(cashAssuranceCases.id, input.caseId));
  await addCashAssuranceEvent({ schoolId: input.schoolId, caseId: input.caseId, eventType: "payment_promise_recorded", actorUserId: input.recordedBy, note: input.note });
  return { promiseId: Number(inserted[0].insertId) };
}

export async function submitPaymentEvidence(input: { schoolId: number; caseId: number; invoiceId: number; amountClaimed: number; claimedPaidOn?: string; source: "manual_receipt" | "bank_reference" | "provider_event" | "other"; providerReference?: string; note?: string; createdBy: number; evidenceFile?: { key: string; url: string; name: string; mimeType: string; size: number } }) {
  const db = await database();
  const [item, invoice, link] = await Promise.all([
    getCashAssuranceCaseOrThrow(input.schoolId, input.caseId),
    db.select().from(invoices).where(and(eq(invoices.id, input.invoiceId), eq(invoices.schoolId, input.schoolId))).limit(1),
    db.select().from(cashAssuranceCaseInvoices).where(and(eq(cashAssuranceCaseInvoices.caseId, input.caseId), eq(cashAssuranceCaseInvoices.invoiceId, input.invoiceId))).limit(1),
  ]);
  if (!invoice[0] || !link[0] || invoice[0].studentId !== item.studentId) throw new Error("Payment evidence must reference an invoice linked to this case.");
  if (item.status === "disputed" || !isActiveCashAssuranceCase(item.status as CashAssuranceCaseStatus)) throw new Error("Payment evidence cannot be added to this case in its current status.");
  if (input.amountClaimed > invoiceOutstanding(invoice[0]) + 0.009) throw new Error("Claimed amount exceeds the invoice’s current outstanding balance.");
  const inserted = await db.insert(paymentEvidence).values({ schoolId: input.schoolId, caseId: input.caseId, invoiceId: input.invoiceId, amountClaimed: String(input.amountClaimed), claimedPaidOn: asDate(input.claimedPaidOn), source: input.source, providerReference: input.providerReference ?? null, note: input.note ?? null, evidenceFileKey: input.evidenceFile?.key ?? null, evidenceFileUrl: input.evidenceFile?.url ?? null, evidenceFileName: input.evidenceFile?.name ?? null, evidenceMimeType: input.evidenceFile?.mimeType ?? null, evidenceFileSize: input.evidenceFile?.size ?? null, createdBy: input.createdBy });
  await db.update(cashAssuranceCases).set({ status: "payment_under_review" }).where(eq(cashAssuranceCases.id, input.caseId));
  await addCashAssuranceEvent({ schoolId: input.schoolId, caseId: input.caseId, eventType: "payment_evidence_submitted", actorUserId: input.createdBy, note: input.note });
  return { evidenceId: Number(inserted[0].insertId) };
}

export async function reviewPaymentEvidence(input: { schoolId: number; evidenceId: number; status: "accepted" | "rejected"; linkedPaymentId?: number; reviewNote?: string; reviewedBy: number }) {
  const db = await database();
  const evidence = (await db.select().from(paymentEvidence).where(and(eq(paymentEvidence.id, input.evidenceId), eq(paymentEvidence.schoolId, input.schoolId))).limit(1))[0];
  if (!evidence) throw new Error("Payment evidence not found.");
  if (evidence.status === "accepted" || evidence.status === "rejected") throw new Error("This payment evidence has already been reviewed.");
  let linkedPaymentId: number | null = null;
  if (input.status === "accepted") {
    if (!input.linkedPaymentId) throw new Error("Link a validated payment before accepting this evidence.");
    const payment = (await db.select().from(payments).where(and(eq(payments.id, input.linkedPaymentId), eq(payments.schoolId, input.schoolId), eq(payments.invoiceId, evidence.invoiceId))).limit(1))[0];
    if (!payment || Number(payment.amount) + 0.009 < Number(evidence.amountClaimed)) throw new Error("The linked payment must be a validated payment for this invoice and cover the claimed amount.");
    linkedPaymentId = payment.id;
  }
  await db.update(paymentEvidence).set({ status: input.status, linkedPaymentId, reviewedBy: input.reviewedBy, reviewedAt: new Date(), reviewNote: input.reviewNote ?? null }).where(eq(paymentEvidence.id, evidence.id));
  const submitterMembership = (await db.select().from(schoolMemberships).where(and(eq(schoolMemberships.schoolId, input.schoolId), eq(schoolMemberships.userId, evidence.createdBy), eq(schoolMemberships.status, "active"))).limit(1))[0];
  if (submitterMembership && (submitterMembership.role === "parent" || submitterMembership.role === "student")) {
    await db.insert(familyPaymentEvidenceNotifications).values({ schoolId: input.schoolId, evidenceId: evidence.id, recipientUserId: evidence.createdBy, decision: input.status }).onDuplicateKeyUpdate({ set: { decision: input.status, readAt: null, createdAt: new Date() } });
  }
  const invoice = (await db.select().from(invoices).where(and(eq(invoices.id, evidence.invoiceId), eq(invoices.schoolId, input.schoolId))).limit(1))[0];
  const nextStatus: CashAssuranceCaseStatus = input.status === "accepted" && invoice && invoiceOutstanding(invoice) <= 0.009 ? "settled" : "open";
  await db.update(cashAssuranceCases).set({ status: nextStatus, pausedReason: null, closedBy: nextStatus === "settled" ? input.reviewedBy : null, closedAt: nextStatus === "settled" ? new Date() : null }).where(eq(cashAssuranceCases.id, evidence.caseId));
  await addCashAssuranceEvent({ schoolId: input.schoolId, caseId: evidence.caseId, eventType: input.status === "accepted" ? "payment_evidence_accepted" : "payment_evidence_rejected", actorUserId: input.reviewedBy, note: input.reviewNote });
  return { success: true, caseStatus: nextStatus };
}

export async function recordCashAssuranceDispute(input: { schoolId: number; caseId: number; note: string; recordedBy: number }) {
  const db = await database();
  const item = await getCashAssuranceCaseOrThrow(input.schoolId, input.caseId);
  if (!isActiveCashAssuranceCase(item.status as CashAssuranceCaseStatus)) throw new Error("A dispute cannot be added to a closed case.");
  await db.update(cashAssuranceCases).set({ status: "disputed", pausedReason: input.note }).where(eq(cashAssuranceCases.id, input.caseId));
  await addCashAssuranceEvent({ schoolId: input.schoolId, caseId: input.caseId, eventType: "dispute_recorded", actorUserId: input.recordedBy, note: input.note });
  return { success: true };
}

export async function resolveCashAssuranceDispute(input: { schoolId: number; caseId: number; note?: string; resolvedBy: number }) {
  const db = await database();
  const item = await getCashAssuranceCaseOrThrow(input.schoolId, input.caseId);
  if (item.status !== "disputed") throw new Error("Only a disputed case can be resolved.");
  await db.update(cashAssuranceCases).set({ status: "open", pausedReason: null }).where(eq(cashAssuranceCases.id, input.caseId));
  await addCashAssuranceEvent({ schoolId: input.schoolId, caseId: input.caseId, eventType: "dispute_resolved", actorUserId: input.resolvedBy, note: input.note });
  return { success: true };
}

type FamilyPortalRole = "parent" | "student";
type EvidenceUpload = { base64: string; fileName: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };

export type BiodataDocumentUpload = EvidenceUpload;
type BiodataProposal = {
  firstName: string; lastName: string; dateOfBirth: string; gender: "female" | "male" | "other" | "prefer_not_to_say" | "";
  residentialAddress: string; priorSchool: string; guardianName: string; guardianPhone: string; guardianEmail: string;
  stateOfOrigin: string; localGovernmentOfOrigin: string; confidence: "low" | "medium" | "high";
};

function safeBiodataText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function safeBiodataDate(value: unknown) {
  const date = safeBiodataText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ? date : "";
}

export async function extractBiodataFromDocument(upload: BiodataDocumentUpload) {
  const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  if (!supportedMimeTypes.has(upload.mimeType)) throw new Error("Upload a JPG, PNG, WEBP, or PDF document.");
  const byteLength = Buffer.byteLength(upload.base64, "base64");
  if (!byteLength || byteLength > 4 * 1024 * 1024) throw new Error("The document must be between 1 byte and 4 MB.");
  const documentUrl = `data:${upload.mimeType};base64,${upload.base64}`;
  let response;
  try {
    response = await invokeLLM({
      model: "gemini-3-flash-preview",
      maxTokens: 600,
      messages: [
        { role: "system", content: "Extract only biodata explicitly visible in the supplied resume or identity document. Never infer a field from a filename, document number, photo, address, school name, birthplace, nationality, or context. Do not return passport, national ID, license, voter, bank, tax, or document numbers. A State or Local Government Area of origin must be explicitly labeled as origin; never infer it from residence or birthplace. If any field is unclear, return an empty string. This is a suggestion only; never make an admissions, identity, or eligibility decision. Return only the requested JSON." },
        { role: "user", content: [{ type: "text", text: "Propose biodata fields from this document. Split a clearly stated full name into first and last names only when unambiguous. Return dates as YYYY-MM-DD when explicit. Return a guardian contact only when explicitly labeled guardian, parent, or next of kin. Set confidence for the overall extraction." }, upload.mimeType === "application/pdf" ? { type: "file_url", file_url: { url: documentUrl, mime_type: "application/pdf" } } : { type: "image_url", image_url: { url: documentUrl, detail: "high" } }] },
      ],
      outputSchema: {
        name: "biodata_document_proposal",
        strict: true,
        schema: {
          type: "object",
          properties: {
            firstName: { type: "string" }, lastName: { type: "string" }, dateOfBirth: { type: "string" }, gender: { type: "string", enum: ["female", "male", "other", "prefer_not_to_say", ""] },
            residentialAddress: { type: "string" }, priorSchool: { type: "string" }, guardianName: { type: "string" }, guardianPhone: { type: "string" }, guardianEmail: { type: "string" },
            stateOfOrigin: { type: "string" }, localGovernmentOfOrigin: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["firstName", "lastName", "dateOfBirth", "gender", "residentialAddress", "priorSchool", "guardianName", "guardianPhone", "guardianEmail", "stateOfOrigin", "localGovernmentOfOrigin", "confidence"],
          additionalProperties: false,
        },
      },
    });
  } catch {
    throw new Error("Document extraction is temporarily unavailable. Enter the biodata manually or try again shortly.");
  }
  const content = response.choices[0]?.message.content;
  const raw = typeof content === "string" ? content : (content ?? []).filter(part => part.type === "text").map(part => part.text).join("");
  let parsed: BiodataProposal;
  try { parsed = JSON.parse(raw) as BiodataProposal; } catch { throw new Error("The document could not be read clearly. Enter the biodata manually or try a clearer document."); }
  const gender = ["female", "male", "other", "prefer_not_to_say"].includes(parsed.gender) ? parsed.gender : "";
  return {
    proposal: {
      firstName: safeBiodataText(parsed.firstName, 120), lastName: safeBiodataText(parsed.lastName, 120), dateOfBirth: safeBiodataDate(parsed.dateOfBirth), gender,
      residentialAddress: safeBiodataText(parsed.residentialAddress, 500), priorSchool: safeBiodataText(parsed.priorSchool, 255), guardianName: safeBiodataText(parsed.guardianName, 255), guardianPhone: safeBiodataText(parsed.guardianPhone, 48), guardianEmail: safeBiodataText(parsed.guardianEmail, 254),
      stateOfOrigin: safeBiodataText(parsed.stateOfOrigin, 120), localGovernmentOfOrigin: safeBiodataText(parsed.localGovernmentOfOrigin, 120), confidence: parsed.confidence,
    },
    requiresConfirmation: true,
    documentStored: false,
  };
}

async function getFamilyStudentIds(schoolId: number, userId: number, role: FamilyPortalRole) {
  const db = await database();
  if (role === "student") {
    const student = (await db.select().from(studentProfiles).where(and(eq(studentProfiles.schoolId, schoolId), eq(studentProfiles.userId, userId))).limit(1))[0];
    return student ? [student.id] : [];
  }
  const guardian = (await db.select().from(guardians).where(and(eq(guardians.schoolId, schoolId), eq(guardians.userId, userId))).limit(1))[0];
  if (!guardian) return [];
  const relationships = await db.select().from(studentGuardians).where(eq(studentGuardians.guardianId, guardian.id));
  return relationships.map(item => item.studentId);
}

function sanitizedEvidenceFileName(value: string) {
  const safe = value.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
  return safe || "payment-evidence";
}

async function storeFamilyEvidenceUpload(schoolId: number, caseId: number, userId: number, upload: EvidenceUpload) {
  const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  if (!supportedMimeTypes.has(upload.mimeType)) throw new Error("Upload a JPG, PNG, WEBP, or PDF payment document.");
  const bytes = Buffer.from(upload.base64, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("Payment evidence must be a file between 1 byte and 5 MB.");
  const name = sanitizedEvidenceFileName(upload.fileName);
  const { key, url } = await storagePut(`schools/${schoolId}/cash-assurance/case-${caseId}/family-${userId}-${crypto.randomUUID()}-${name}`, bytes, upload.mimeType);
  return { key, url, name, mimeType: upload.mimeType, size: bytes.length };
}

export async function getFamilyCashAssuranceData(input: { schoolId: number; userId: number; role: FamilyPortalRole }) {
  const db = await database();
  const studentIds = await getFamilyStudentIds(input.schoolId, input.userId, input.role);
  if (!studentIds.length) return { cases: [], paymentEvidence: [], promises: [], paymentHistory: [] };
  const allCases = await db.select().from(cashAssuranceCases).where(eq(cashAssuranceCases.schoolId, input.schoolId)).orderBy(desc(cashAssuranceCases.updatedAt));
  const caseRows = allCases.filter(item => studentIds.includes(item.studentId));
  const caseIds = new Set(caseRows.map(item => item.id));
  const [links, allInvoices, allPromises, allEvidence, students, allPayments] = await Promise.all([
    db.select().from(cashAssuranceCaseInvoices),
    db.select().from(invoices).where(eq(invoices.schoolId, input.schoolId)),
    db.select().from(paymentPromises).where(eq(paymentPromises.schoolId, input.schoolId)).orderBy(desc(paymentPromises.createdAt)),
    db.select().from(paymentEvidence).where(eq(paymentEvidence.schoolId, input.schoolId)).orderBy(desc(paymentEvidence.createdAt)),
    db.select().from(studentProfiles).where(eq(studentProfiles.schoolId, input.schoolId)),
    db.select().from(payments).where(eq(payments.schoolId, input.schoolId)).orderBy(desc(payments.paidOn)),
  ]);
  const invoiceById = new Map(allInvoices.map(item => [item.id, item]));
  const studentById = new Map(students.map(item => [item.id, item]));
  const familyInvoiceIds = new Set(allInvoices.filter(item => studentIds.includes(item.studentId)).map(item => item.id));
  const evidence = allEvidence.filter(item => caseIds.has(item.caseId));
  const promises = allPromises.filter(item => caseIds.has(item.caseId));
  const safeEvidence = evidence.map(item => ({ id: item.id, caseId: item.caseId, invoiceId: item.invoiceId, amountClaimed: Number(item.amountClaimed), claimedPaidOn: item.claimedPaidOn, source: item.source, providerReference: item.providerReference, status: item.status, evidenceFileUrl: item.evidenceFileUrl, evidenceFileName: item.evidenceFileName, evidenceMimeType: item.evidenceMimeType, evidenceFileSize: item.evidenceFileSize, createdAt: item.createdAt, reviewedAt: item.reviewedAt }));
  const safePromises = promises.map(item => ({ id: item.id, caseId: item.caseId, promisedAmount: Number(item.promisedAmount), promisedOn: item.promisedOn, status: item.status, createdAt: item.createdAt }));
  const paymentHistory = allPayments.filter(item => familyInvoiceIds.has(item.invoiceId)).map(item => {
    const invoice = invoiceById.get(item.invoiceId);
    const student = invoice ? studentById.get(invoice.studentId) : null;
    return { id: item.id, receiptNo: item.receiptNo, amount: Number(item.amount), paidOn: item.paidOn, method: item.method, reference: item.reference, invoiceNo: invoice?.invoiceNo ?? null, student: student ? { id: student.id, firstName: student.firstName, lastName: student.lastName, admissionNo: student.admissionNo } : null };
  });
  return {
    cases: caseRows.map(item => {
      const linkedInvoices = links.filter(link => link.caseId === item.id).map(link => invoiceById.get(link.invoiceId)).filter(Boolean).map(invoice => ({ id: invoice!.id, invoiceNo: invoice!.invoiceNo, dueDate: invoice!.dueDate, total: Number(invoice!.total), amountPaid: Number(invoice!.amountPaid), outstanding: invoiceOutstanding(invoice!) }));
      return { id: item.id, student: studentById.get(item.studentId) ? { id: item.studentId, firstName: studentById.get(item.studentId)!.firstName, lastName: studentById.get(item.studentId)!.lastName, admissionNo: studentById.get(item.studentId)!.admissionNo } : null, status: item.status, priority: item.priority, pausedReason: item.pausedReason, invoices: linkedInvoices, outstanding: linkedInvoices.reduce((sum, invoice) => sum + invoice.outstanding, 0), promises: safePromises.filter(promise => promise.caseId === item.id), evidence: safeEvidence.filter(itemEvidence => itemEvidence.caseId === item.id) };
    }),
    paymentEvidence: safeEvidence,
    promises: safePromises,
    paymentHistory,
  };
}

export async function listFamilyPaymentEvidenceNotifications(input: { schoolId: number; userId: number; role: FamilyPortalRole }) {
  const db = await database();
  const studentIds = await getFamilyStudentIds(input.schoolId, input.userId, input.role);
  if (!studentIds.length) return [];
  const [notifications, evidenceRows, caseRows, students] = await Promise.all([
    db.select().from(familyPaymentEvidenceNotifications).where(and(eq(familyPaymentEvidenceNotifications.schoolId, input.schoolId), eq(familyPaymentEvidenceNotifications.recipientUserId, input.userId))).orderBy(desc(familyPaymentEvidenceNotifications.createdAt)),
    db.select().from(paymentEvidence).where(eq(paymentEvidence.schoolId, input.schoolId)),
    db.select().from(cashAssuranceCases).where(eq(cashAssuranceCases.schoolId, input.schoolId)),
    db.select().from(studentProfiles).where(eq(studentProfiles.schoolId, input.schoolId)),
  ]);
  const evidenceById = new Map(evidenceRows.map(item => [item.id, item]));
  const caseById = new Map(caseRows.map(item => [item.id, item]));
  const studentById = new Map(students.map(item => [item.id, item]));
  return notifications.flatMap(notification => {
    const evidence = evidenceById.get(notification.evidenceId);
    const item = evidence ? caseById.get(evidence.caseId) : undefined;
    if (!evidence || !item || !studentIds.includes(item.studentId) || evidence.createdBy !== input.userId || evidence.status !== notification.decision) return [];
    const student = studentById.get(item.studentId);
    return [{ id: notification.id, evidenceId: evidence.id, decision: notification.decision, readAt: notification.readAt, createdAt: notification.createdAt, amountClaimed: Number(evidence.amountClaimed), claimedPaidOn: evidence.claimedPaidOn, student: student ? { id: student.id, firstName: student.firstName, lastName: student.lastName } : null }];
  });
}

export async function markFamilyPaymentEvidenceNotificationRead(input: { schoolId: number; userId: number; role: FamilyPortalRole; notificationId: number }) {
  const notifications = await listFamilyPaymentEvidenceNotifications({ schoolId: input.schoolId, userId: input.userId, role: input.role });
  const notification = notifications.find(item => item.id === input.notificationId);
  if (!notification) throw new Error("Payment-evidence notification not found.");
  await (await database()).update(familyPaymentEvidenceNotifications).set({ readAt: new Date() }).where(and(eq(familyPaymentEvidenceNotifications.id, input.notificationId), eq(familyPaymentEvidenceNotifications.schoolId, input.schoolId), eq(familyPaymentEvidenceNotifications.recipientUserId, input.userId)));
  return { success: true, evidenceId: notification.evidenceId };
}

export async function submitFamilyPaymentEvidence(input: { schoolId: number; userId: number; role: FamilyPortalRole; caseId: number; invoiceId: number; amountClaimed: number; claimedPaidOn?: string; source: "manual_receipt" | "bank_reference" | "provider_event" | "other"; providerReference?: string; note?: string; upload?: EvidenceUpload }) {
  const allowedStudentIds = await getFamilyStudentIds(input.schoolId, input.userId, input.role);
  const item = await getCashAssuranceCaseOrThrow(input.schoolId, input.caseId);
  if (!allowedStudentIds.includes(item.studentId)) throw new Error("You can only submit payment evidence for a learner linked to your portal.");
  const evidenceFile = input.upload ? await storeFamilyEvidenceUpload(input.schoolId, input.caseId, input.userId, input.upload) : undefined;
  return submitPaymentEvidence({ schoolId: input.schoolId, caseId: input.caseId, invoiceId: input.invoiceId, amountClaimed: input.amountClaimed, claimedPaidOn: input.claimedPaidOn, source: input.source, providerReference: input.providerReference, note: input.note, createdBy: input.userId, evidenceFile });
}

export async function scanFamilyPaymentEvidence(input: { schoolId: number; userId: number; role: FamilyPortalRole; caseId: number; invoiceId: number; upload: EvidenceUpload }) {
  const allowedStudentIds = await getFamilyStudentIds(input.schoolId, input.userId, input.role);
  const item = await getCashAssuranceCaseOrThrow(input.schoolId, input.caseId);
  if (!allowedStudentIds.includes(item.studentId)) throw new Error("You can only scan evidence for a learner linked to your portal.");
  const db = await database();
  const linkedInvoice = (await db.select().from(cashAssuranceCaseInvoices).where(and(eq(cashAssuranceCaseInvoices.caseId, input.caseId), eq(cashAssuranceCaseInvoices.invoiceId, input.invoiceId))).limit(1))[0];
  if (!linkedInvoice) throw new Error("The selected invoice is not linked to this payment case.");
  const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  if (!supportedMimeTypes.has(input.upload.mimeType)) throw new Error("Scan a JPG, PNG, WEBP, or PDF payment document.");
  const byteLength = Buffer.byteLength(input.upload.base64, "base64");
  if (!byteLength || byteLength > 5 * 1024 * 1024) throw new Error("The receipt scan supports documents between 1 byte and 5 MB.");
  const documentUrl = `data:${input.upload.mimeType};base64,${input.upload.base64}`;
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    maxTokens: 400,
    messages: [
      { role: "system", content: "You extract only payment receipt information. Never make a payment decision. Do not infer a value from an invoice due date, filename, or unrelated text. If a value is unclear, use 0 for amount or an empty string for date. Return only the requested JSON." },
      { role: "user", content: [{ type: "text", text: "Inspect this payment receipt or transfer proof. Extract the single most likely amount actually paid in Nigerian Naira and the actual payment date in YYYY-MM-DD. Ignore invoice totals, balances, due dates, and reference numbers unless they identify the payment. Set confidence to low, medium, or high." }, input.upload.mimeType === "application/pdf" ? { type: "file_url", file_url: { url: documentUrl, mime_type: "application/pdf" } } : { type: "image_url", image_url: { url: documentUrl, detail: "high" } }] },
    ],
    outputSchema: {
      name: "receipt_extraction",
      strict: true,
      schema: {
        type: "object",
        properties: { amountNgn: { type: "number" }, paidOn: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] } },
        required: ["amountNgn", "paidOn", "confidence"],
        additionalProperties: false,
      },
    },
  });
  const content = response.choices[0]?.message.content;
  const raw = typeof content === "string" ? content : (content ?? []).filter(part => part.type === "text").map(part => part.text).join("");
  let parsed: { amountNgn: number; paidOn: string; confidence: "low" | "medium" | "high" };
  try { parsed = JSON.parse(raw) as typeof parsed; } catch { throw new Error("The receipt scan did not return a readable result. Enter the amount and date manually."); }
  const amountNgn = Number.isFinite(parsed.amountNgn) && parsed.amountNgn > 0 ? Math.round(parsed.amountNgn * 100) / 100 : null;
  const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(parsed.paidOn) && !Number.isNaN(Date.parse(`${parsed.paidOn}T00:00:00.000Z`)) ? parsed.paidOn : null;
  return { amountNgn, paidOn, confidence: parsed.confidence, requiresConfirmation: true };
}

export async function listStaff(schoolId: number) { return (await database()).select().from(staffProfiles).where(eq(staffProfiles.schoolId, schoolId)).orderBy(staffProfiles.lastName); }
export const createStaff = async (input: Record<string, unknown>) => (await database()).insert(staffProfiles).values(input as typeof staffProfiles.$inferInsert);
export const createDepartment = async (input: { schoolId: number; name: string; code?: string }) => (await database()).insert(departments).values(input);
export async function assignStaffDepartment(schoolId: number, staffId: number, departmentId: number | undefined) { await (await database()).update(staffProfiles).set({ departmentId: departmentId ?? null }).where(and(eq(staffProfiles.schoolId, schoolId), eq(staffProfiles.id, staffId))); return { success: true }; }
export const createStaffDuty = async (input: { schoolId: number; staffId: number; title: string; description?: string; startsOn?: string }) => (await database()).insert(staffDuties).values({ ...input, startsOn: asDate(input.startsOn) });
export const createLeaveRequest = async (input: Record<string, unknown>) => (await database()).insert(leaveRequests).values(input as typeof leaveRequests.$inferInsert);
export async function reviewLeaveRequest(leaveId: number, status: "approved" | "declined", reviewNote: string | undefined, reviewedBy: number) { await (await database()).update(leaveRequests).set({ status, reviewNote: reviewNote ?? null, reviewedBy }).where(eq(leaveRequests.id, leaveId)); return { success: true }; }
export async function createPayrollRecord(input: { schoolId: number; staffId: number; periodLabel: string; grossPay: number; deductions?: number }) { const deductions = input.deductions ?? 0; return (await database()).insert(payrollRecords).values({ ...input, grossPay: String(input.grossPay), deductions: String(deductions), netPay: String(input.grossPay - deductions) }); }
export async function createPerformanceNote(input: { schoolId: number; staffId: number; authorId: number; title: string; note: string; visibility: "private" | "shared" }) { return (await database()).insert(performanceNotes).values(input); }
export async function listStaffOperations(schoolId: number) {
  const db = await database();
  const [leaves, payroll, notes, departmentRows, duties] = await Promise.all([
    db.select().from(leaveRequests).where(eq(leaveRequests.schoolId, schoolId)).orderBy(desc(leaveRequests.createdAt)),
    db.select().from(payrollRecords).where(eq(payrollRecords.schoolId, schoolId)).orderBy(desc(payrollRecords.createdAt)),
    db.select().from(performanceNotes).where(eq(performanceNotes.schoolId, schoolId)).orderBy(desc(performanceNotes.createdAt)),
    db.select().from(departments).where(eq(departments.schoolId, schoolId)).orderBy(departments.name),
    db.select().from(staffDuties).where(eq(staffDuties.schoolId, schoolId)).orderBy(desc(staffDuties.createdAt)),
  ]);
  return { leaves, payroll, notes, departments: departmentRows, duties };
}

export async function listAnnouncements(schoolId: number) { return (await database()).select().from(announcements).where(eq(announcements.schoolId, schoolId)).orderBy(desc(announcements.createdAt)); }
export async function createAnnouncement(input: { schoolId: number; title: string; body: string; audience: "everyone" | "staff" | "students" | "guardians" | "class"; classId?: number; publish?: boolean; createdBy: number }) { const now = new Date(); const result = await (await database()).insert(announcements).values({ ...input, classId: input.classId, status: input.publish ? "published" : "draft", publishedAt: input.publish ? now : null }); return { announcementId: Number(result[0].insertId) }; }
export async function publishAnnouncement(announcementId: number) { await (await database()).update(announcements).set({ status: "published", publishedAt: new Date() }).where(eq(announcements.id, announcementId)); return { success: true }; }
export async function createMessageLog(input: { schoolId: number; channel: "in_app" | "email" | "sms" | "whatsapp"; audience: "everyone" | "staff" | "students" | "guardians" | "class"; subject?: string; body: string; recipientCount: number; providerMessageId?: string; createdBy: number }) {
  const db = await database();
  const isInApp = input.channel === "in_app";
  const result = await db.insert(messageLogs).values({ ...input, status: isInApp ? "sent" : "queued", sentAt: isInApp ? new Date() : null });
  if (isInApp) {
    await db.insert(announcements).values({ schoolId: input.schoolId, title: input.subject ?? "School message", body: input.body, audience: input.audience, status: "published", publishedAt: new Date(), createdBy: input.createdBy });
  }
  return { messageId: Number(result[0].insertId) };
}

export async function updateMessageLogDelivery(input: { schoolId: number; messageId: number; status: "sent" | "failed"; providerMessageId?: string }) {
  await (await database()).update(messageLogs).set({ status: input.status, providerMessageId: input.providerMessageId ?? null, sentAt: input.status === "sent" ? new Date() : null }).where(and(eq(messageLogs.id, input.messageId), eq(messageLogs.schoolId, input.schoolId)));
}

export async function listMessageLogs(schoolId: number) {
  return (await database()).select().from(messageLogs).where(eq(messageLogs.schoolId, schoolId)).orderBy(desc(messageLogs.createdAt));
}

async function getPublishedReportCards(schoolId: number, studentIds: number[]) {
  if (!studentIds.length) return [];
  const db = await database();
  const publications = await db.select().from(resultPublications).where(and(eq(resultPublications.schoolId, schoolId), eq(resultPublications.status, "published"))).orderBy(desc(resultPublications.publishedAt));
  const cards = await Promise.all(publications.flatMap(publication => studentIds.map(async studentId => {
    const card = await getStudentReportCard(schoolId, studentId, publication.termId);
    return { studentId, termId: publication.termId, publishedAt: publication.publishedAt, average: card.average, entries: card.entries };
  })));
  return cards.filter(card => card.entries.length > 0);
}

export async function getGuardianPortal(schoolId: number, userId: number) {
  const db = await database();
  const guardian = (await db.select().from(guardians).where(and(eq(guardians.schoolId, schoolId), eq(guardians.userId, userId))).limit(1))[0];
  if (!guardian) return { guardian: null, students: [], attendance: [], invoices: [], reportCards: [], announcements: await listAnnouncements(schoolId) };
  const wards = await db.select({ student: studentProfiles }).from(studentGuardians).innerJoin(studentProfiles, eq(studentGuardians.studentId, studentProfiles.id)).where(eq(studentGuardians.guardianId, guardian.id));
  const studentIds = wards.map(row => row.student.id);
  const [attendance, invoiceRows, reportCards] = await Promise.all([
    db.select().from(attendanceRecords).where(eq(attendanceRecords.schoolId, schoolId)).orderBy(desc(attendanceRecords.attendanceDate)),
    db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).orderBy(desc(invoices.createdAt)),
    getPublishedReportCards(schoolId, studentIds),
  ]);
  return { guardian, students: wards.map(row => row.student), attendance: attendance.filter(item => item.studentId && studentIds.includes(item.studentId)), invoices: invoiceRows.filter(item => studentIds.includes(item.studentId)), reportCards, announcements: await listAnnouncements(schoolId) };
}

export async function getStudentPortal(schoolId: number, userId: number) {
  const db = await database();
  const student = (await db.select().from(studentProfiles).where(and(eq(studentProfiles.schoolId, schoolId), eq(studentProfiles.userId, userId))).limit(1))[0];
  if (!student) return { student: null, attendance: [], invoices: [], reportCards: [], announcements: await listAnnouncements(schoolId) };
  const [attendance, invoiceRows, reportCards] = await Promise.all([
    db.select().from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.studentId, student.id))).orderBy(desc(attendanceRecords.attendanceDate)),
    db.select().from(invoices).where(and(eq(invoices.schoolId, schoolId), eq(invoices.studentId, student.id))).orderBy(desc(invoices.createdAt)),
    getPublishedReportCards(schoolId, [student.id]),
  ]);
  return { student, attendance, invoices: invoiceRows, reportCards, announcements: await listAnnouncements(schoolId) };
}
