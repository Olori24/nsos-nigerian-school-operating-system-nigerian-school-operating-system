import { and, desc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import {
  academicMigrationBatches,
  academicSessions,
  academicTerms,
  automationJobEvents,
  automationJobs,
  advertisingCampaigns,
  affiliateClicks,
  affiliateConversions,
  affiliateLeads,
  affiliatePartners,
  affiliatePayoutItems,
  affiliatePayouts,
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
  guardianPortalInvitations,
  guardians,
  invoiceLineItems,
  invoices,
  institutionBlueprints,
  institutionKnowledgeAnalyses,
  institutionKnowledgeSourceRevisions,
  institutionKnowledgeSources,
  institutionOperatingProfiles,
  leaveRequests,
  lessonPlans,
  messageLogs,
  payments,
  payrollRecords,
  performanceNotes,
  paymentEvidence,
  paymentPromises,
  platformBillingRecords,
  learningPrograms,
  learningEvidenceSources,
  learningExperienceProfiles,
  programCourseMaterials,
  programCertificates,
  programCertificationPolicies,
  programCohorts,
  programCurriculumMilestones,
  programCurriculumModules,
  programCurriculumPathways,
  programMilestoneEvidenceSubmissions,
  programMilestoneProgress,
  programAttendanceRecords,
  programEnrollments,
  programFeeStructures,
  programInstructorAssignments,
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
  schoolOperatorInsights,
  schoolOperatorWorkflowPreferences,
  schoolWebsites,
  schoolWebsiteMedia,
  schools,
  scores,
  staffDuties,
  staffMigrationBatches,
  staffProfiles,
  staffSetupInvitations,
  studentGuardians,
  studentMigrationBatches,
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
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";
import { generateSupervisedTutorResponse } from "../aiTutor";
import { generateReviewableAdCopy } from "../advertisingCopy";
import type { AcademicAutomationInput, AutomationJobType, AutomationPlan, FinanceAutomationInput, OnlineSchoolLaunchInput, StaffAutomationInput, ValidAutomationInput } from "../automationDesk";
import { reviseInstitutionBlueprint, type InstitutionBlueprint, type InstitutionBlueprintEdits } from "../institutionBuilder";
import type { KnowledgeBusinessAnalysis, KnowledgeSourceFormat, KnowledgeSourceType } from "../knowledgeBusinessEngine";
import type { CourseStudioDraft } from "../courseStudio";
import type { SchoolRole } from "../roles";
import { storagePut } from "../storage";
import { deriveTenantOnboardingStatus } from "../tenantOnboarding";
import { getNigerianCurriculumTemplate, type NigerianCurriculumTemplateId, listNigerianCurriculumTemplates } from "../nigerianCurriculum";
import { MAX_SCHEME_FILE_BYTES, normaliseReviewedSchemeRows, safeSchemeFileName, type ReviewedSchemeRow } from "../schemeOfWork";

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

export type ProviderChannel = "payment" | "sms" | "whatsapp" | "email" | "in_app";
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

const providerChannelDefaults: Record<ProviderChannel, string> = { payment: "paystack", sms: "termii", whatsapp: "whatsapp_cloud", email: "resend", in_app: "in_app" };
const providersByChannel: Record<ProviderChannel, readonly string[]> = { payment: ["paystack", "flutterwave", "stripe", "manual"], sms: ["termii", "twilio"], whatsapp: ["whatsapp_cloud", "twilio"], email: ["resend", "sendgrid"], in_app: ["in_app"] };

function providerCategoryForChannel(channel: ProviderChannel): "payment" | "notification" {
  return channel === "payment" ? "payment" : "notification";
}

export function providerReadiness(channel: ProviderChannel, provider: string, hasCredentials: boolean, status: "draft" | "ready" | "disabled") {
  if (status === "disabled") return "Disabled";
  if (!hasCredentials && provider !== "manual" && provider !== "in_app") return "Credentials required";
  if (channel === "payment") return "Ready for payment adapter";
  if (channel === "email") return "Ready for email adapter";
  if (channel === "whatsapp") return "Ready for WhatsApp adapter";
  if (channel === "sms") return "Ready for SMS adapter";
  return "Ready for in-app messages";
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


function affiliateCode(value: string) {
  const code = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,47}$/.test(code)) throw new Error("Affiliate code must be 3-48 characters and contain only letters, numbers, hyphens, or underscores.");
  return code;
}

function affiliateDestination(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Affiliate destination must use HTTP or HTTPS.");
  return url.toString();
}

function affiliateHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseAffiliateCookie(cookieHeader: string | undefined) {
  const match = cookieHeader?.split(";").map(value => value.trim()).find(value => value.startsWith("nsos_affiliate_click="));
  return match ? decodeURIComponent(match.slice("nsos_affiliate_click=".length)).slice(0, 64) : null;
}

export function getAffiliateClickCookie(cookieHeader: string | undefined) {
  return parseAffiliateCookie(cookieHeader);
}

export async function createAffiliatePartner(input: {
  code: string;
  name: string;
  destinationUrl: string;
  commissionType: "percentage" | "fixed";
  commissionValue: string;
  currency?: string;
  attributionDays?: number;
  termsVersion?: string;
  createdBy: number;
}) {
  const db = await database();
  const code = affiliateCode(input.code);
  const destinationUrl = affiliateDestination(input.destinationUrl);
  const commissionValue = Number(input.commissionValue);
  if (!Number.isFinite(commissionValue) || commissionValue < 0) throw new Error("Commission value must be zero or greater.");
  if (input.commissionType === "percentage" && commissionValue > 100) throw new Error("Percentage commission cannot exceed 100.");
  const attributionDays = Math.min(Math.max(input.attributionDays ?? 30, 1), 180);
  const result = await db.insert(affiliatePartners).values({
    code,
    name: input.name.trim().slice(0, 160),
    destinationUrl,
    status: "active",
    commissionType: input.commissionType,
    commissionValue: commissionValue.toFixed(2),
    currency: (input.currency ?? "NGN").trim().toUpperCase().slice(0, 8),
    attributionDays,
    termsVersion: input.termsVersion?.trim().slice(0, 64) || null,
    createdBy: input.createdBy,
  });
  return getAffiliatePartnerById(Number(result[0].insertId));
}

export async function getAffiliatePartnerById(id: number) {
  return (await (await database()).select().from(affiliatePartners).where(eq(affiliatePartners.id, id)).limit(1))[0] ?? null;
}

export async function getAffiliatePartnerByCode(code: string) {
  return (await (await database()).select().from(affiliatePartners).where(and(eq(affiliatePartners.code, affiliateCode(code)), eq(affiliatePartners.status, "active"))).limit(1))[0] ?? null;
}

export async function listAffiliatePartners() {
  return (await database()).select().from(affiliatePartners).orderBy(desc(affiliatePartners.createdAt));
}

export async function updateAffiliatePartner(input: {
  id: number;
  name?: string;
  destinationUrl?: string;
  status?: "active" | "paused" | "archived";
  commissionType?: "percentage" | "fixed";
  commissionValue?: string;
  currency?: string;
  attributionDays?: number;
  termsVersion?: string | null;
}) {
  const db = await database();
  const existing = await getAffiliatePartnerById(input.id);
  if (!existing) throw new Error("Affiliate partner not found.");
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name.trim().slice(0, 160);
  if (input.destinationUrl !== undefined) set.destinationUrl = affiliateDestination(input.destinationUrl);
  if (input.status !== undefined) set.status = input.status;
  if (input.commissionType !== undefined) set.commissionType = input.commissionType;
  if (input.commissionValue !== undefined) {
    const value = Number(input.commissionValue);
    if (!Number.isFinite(value) || value < 0) throw new Error("Commission value must be zero or greater.");
    const type = input.commissionType ?? existing.commissionType;
    if (type === "percentage" && value > 100) throw new Error("Percentage commission cannot exceed 100.");
    set.commissionValue = value.toFixed(2);
  }
  if (input.currency !== undefined) set.currency = input.currency.trim().toUpperCase().slice(0, 8);
  if (input.attributionDays !== undefined) set.attributionDays = Math.min(Math.max(input.attributionDays, 1), 180);
  if (input.termsVersion !== undefined) set.termsVersion = input.termsVersion?.trim().slice(0, 64) || null;
  if (Object.keys(set).length) await db.update(affiliatePartners).set(set).where(eq(affiliatePartners.id, input.id));
  return getAffiliatePartnerById(input.id);
}

export async function recordAffiliateClick(input: {
  partnerId: number;
  clickId: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
  landingPath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}) {
  const partner = await getAffiliatePartnerById(input.partnerId);
  if (!partner || partner.status !== "active") throw new Error("Affiliate partner is unavailable.");
  const clickId = input.clickId.trim().slice(0, 64);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(clickId)) throw new Error("Invalid affiliate click identifier.");
  await (await database()).insert(affiliateClicks).values({
    partnerId: input.partnerId,
    clickId,
    ipHash: input.ip ? affiliateHash(input.ip) : null,
    userAgentHash: input.userAgent ? affiliateHash(input.userAgent) : null,
    referrer: input.referrer?.slice(0, 2048) || null,
    landingPath: input.landingPath?.slice(0, 2048) || null,
    utmSource: input.utmSource?.slice(0, 160) || null,
    utmMedium: input.utmMedium?.slice(0, 160) || null,
    utmCampaign: input.utmCampaign?.slice(0, 160) || null,
    utmContent: input.utmContent?.slice(0, 160) || null,
    utmTerm: input.utmTerm?.slice(0, 160) || null,
  }).onDuplicateKeyUpdate({ set: { partnerId: input.partnerId } });
  return { clickId, destinationUrl: partner.destinationUrl, attributionDays: partner.attributionDays };
}

export async function getAffiliateClickById(clickId: string) {
  return (await (await database()).select({ click: affiliateClicks, partner: affiliatePartners })
    .from(affiliateClicks)
    .innerJoin(affiliatePartners, eq(affiliateClicks.partnerId, affiliatePartners.id))
    .where(and(eq(affiliateClicks.clickId, clickId), eq(affiliatePartners.status, "active")))
    .limit(1))[0] ?? null;
}

export async function recordAffiliateLead(input: {
  partnerId: number;
  clickId?: string | null;
  email: string;
  leadSource?: string;
  consentedAt?: Date;
}) {
  const partner = await getAffiliatePartnerById(input.partnerId);
  if (!partner || partner.status !== "active") return null;
  const emailHash = affiliateHash(normaliseAuthEmail(input.email));
  const db = await database();
  await db.insert(affiliateLeads).values({
    partnerId: partner.id,
    clickId: input.clickId?.slice(0, 64) || null,
    emailHash,
    leadSource: input.leadSource?.slice(0, 120) || null,
    consentedAt: input.consentedAt ?? new Date(),
  }).onDuplicateKeyUpdate({ set: { clickId: input.clickId?.slice(0, 64) || null, leadSource: input.leadSource?.slice(0, 120) || null, updatedAt: new Date() } });
  return (await db.select().from(affiliateLeads).where(and(eq(affiliateLeads.partnerId, partner.id), eq(affiliateLeads.emailHash, emailHash))).limit(1))[0] ?? null;
}

function calculateAffiliateCommission(partner: typeof affiliatePartners.$inferSelect, amount: number) {
  const value = Number(partner.commissionValue);
  return partner.commissionType === "percentage" ? Number((amount * value / 100).toFixed(2)) : Number(value.toFixed(2));
}

export async function recordAffiliateConversion(input: {
  partnerId: number;
  leadId?: number | null;
  clickId?: string | null;
  externalReference: string;
  eventType: string;
  amount: number;
  occurredAt?: Date;
  note?: string;
}) {
  const partner = await getAffiliatePartnerById(input.partnerId);
  if (!partner) throw new Error("Affiliate partner not found.");
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error("Conversion amount must be zero or greater.");
  const commissionAmount = calculateAffiliateCommission(partner, input.amount);
  const db = await database();
  const existing = (await db.select().from(affiliateConversions).where(eq(affiliateConversions.externalReference, input.externalReference.trim().slice(0, 160))).limit(1))[0];
  if (existing) return existing;
  const result = await db.insert(affiliateConversions).values({
    partnerId: partner.id,
    leadId: input.leadId ?? null,
    clickId: input.clickId?.slice(0, 64) || null,
    externalReference: input.externalReference.trim().slice(0, 160),
    eventType: input.eventType.trim().slice(0, 80),
    amount: input.amount.toFixed(2),
    commissionAmount: commissionAmount.toFixed(2),
    currency: partner.currency,
    status: "pending",
    occurredAt: input.occurredAt ?? new Date(),
    note: input.note?.slice(0, 2000) || null,
  });
  return (await db.select().from(affiliateConversions).where(eq(affiliateConversions.id, Number(result[0].insertId))).limit(1))[0];
}

export async function approveAffiliateConversion(id: number, approvedBy: number) {
  const db = await database();
  await db.update(affiliateConversions).set({ status: "approved", approvedBy, approvedAt: new Date() }).where(and(eq(affiliateConversions.id, id), eq(affiliateConversions.status, "pending")));
  return (await db.select().from(affiliateConversions).where(eq(affiliateConversions.id, id)).limit(1))[0] ?? null;
}

export async function createAffiliatePayout(input: { partnerId: number; periodStart: string; periodEnd: string; createdBy: number; note?: string }) {
  const db = await database();
  const partner = await getAffiliatePartnerById(input.partnerId);
  if (!partner) throw new Error("Affiliate partner not found.");
  const start = asDate(input.periodStart);
  const end = asDate(input.periodEnd);
  if (!start || !end || start > end) throw new Error("Payout period is invalid.");
  const approved = await db.select().from(affiliateConversions).where(and(eq(affiliateConversions.partnerId, partner.id), eq(affiliateConversions.status, "approved"), sql`${affiliateConversions.occurredAt} >= ${start}`, sql`${affiliateConversions.occurredAt} < ${new Date(end.getTime() + 86_400_000)}`));
  const amount = approved.reduce((sum, item) => sum + Number(item.commissionAmount), 0);
  if (amount <= 0) throw new Error("No approved affiliate commissions are available for this period.");
  const payoutResult = await db.insert(affiliatePayouts).values({
    partnerId: partner.id,
    periodStart: start,
    periodEnd: end,
    amount: amount.toFixed(2),
    currency: partner.currency,
    status: "pending",
    createdBy: input.createdBy,
    note: input.note?.slice(0, 2000) || null,
  });
  const payoutId = Number(payoutResult[0].insertId);
  for (const conversion of approved) {
    await db.insert(affiliatePayoutItems).values({ payoutId, conversionId: conversion.id, amount: conversion.commissionAmount });
    await db.update(affiliateConversions).set({ status: "paid" }).where(and(eq(affiliateConversions.id, conversion.id), eq(affiliateConversions.status, "approved")));
  }
  return (await db.select().from(affiliatePayouts).where(eq(affiliatePayouts.id, payoutId)).limit(1))[0];
}

export async function listAffiliatePayouts() {
  return (await database()).select().from(affiliatePayouts).orderBy(desc(affiliatePayouts.createdAt));
}

export async function updateAffiliatePayoutStatus(input: { id: number; status: "approved" | "paid" | "void"; approvedBy?: number; paymentReference?: string; note?: string }) {
  const db = await database();
  const payout = (await db.select().from(affiliatePayouts).where(eq(affiliatePayouts.id, input.id)).limit(1))[0];
  if (!payout) throw new Error("Affiliate payout not found.");
  if (input.status === "approved" && payout.status !== "pending") throw new Error("Only pending payouts can be approved.");
  if (input.status === "paid" && payout.status !== "approved") throw new Error("Only approved payouts can be marked paid.");
  if (input.status === "void" && payout.status === "paid") throw new Error("Paid payouts cannot be voided.");
  if (input.status === "void" && payout.status !== "void") {
    const items = await db.select({ conversionId: affiliatePayoutItems.conversionId }).from(affiliatePayoutItems).where(eq(affiliatePayoutItems.payoutId, input.id));
    for (const item of items) await db.update(affiliateConversions).set({ status: "approved" }).where(and(eq(affiliateConversions.id, item.conversionId), eq(affiliateConversions.status, "paid")));
  }
  await db.update(affiliatePayouts).set({
    status: input.status,
    approvedBy: input.approvedBy ?? payout.approvedBy,
    paymentReference: input.paymentReference?.slice(0, 160) || payout.paymentReference,
    note: input.note?.slice(0, 2000) ?? payout.note,
    paidAt: input.status === "paid" ? new Date() : payout.paidAt,
  }).where(eq(affiliatePayouts.id, input.id));
  return (await db.select().from(affiliatePayouts).where(eq(affiliatePayouts.id, input.id)).limit(1))[0];
}

export async function listAffiliateConversions(partnerId?: number) {
  return (await database()).select().from(affiliateConversions).where(partnerId ? eq(affiliateConversions.partnerId, partnerId) : undefined).orderBy(desc(affiliateConversions.occurredAt)).limit(500);
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
    .select({ id: schools.id, name: schools.name, shortCode: schools.shortCode, state: schools.state, operatingType: schools.operatingType, role: schoolMemberships.role })
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

export async function createSchool(input: { name: string; shortCode: string; operatingType?: "school" | "vocational_institute" | "coaching_centre" | "online_training_provider" | "hybrid_learning_provider" | "corporate_academy"; state?: string; email?: string; phone?: string; createdBy: number }) {
  const db = await database();
  const created = await db.insert(schools).values({ ...input, shortCode: input.shortCode.trim().toUpperCase(), currency: "NGN", timezone: "Africa/Lagos" });
  const schoolId = Number(created[0].insertId);
  await db.insert(schoolMemberships).values({ schoolId, userId: input.createdBy, role: "owner", status: "active" });
  await db.insert(schoolSubscriptions).values({ schoolId, status: "trial", billingCycle: "manual", assignedBy: input.createdBy, note: "Commercial plan not yet assigned." });
  await recordSecurityAuditEvent({ schoolId, actorUserId: input.createdBy, eventType: "institution_workspace_created", targetType: "learning_organisation", targetId: schoolId, metadata: { operatingType: input.operatingType ?? "school", ownerMembershipCreated: true, peopleCreated: false, financialRecordsCreated: false } });
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
  return (["payment", "sms", "whatsapp", "email", "in_app"] as const).map(channel => {
    const row = rows.find(item => item.channel === channel);
    const hasCredentials = Boolean(row?.encryptedCredentials);
    const hasWebhookSecret = Boolean(row?.encryptedCredentials && openProviderCredentials(row.encryptedCredentials).webhookSecret);
    return row
      ? { id: row.id, channel, provider: row.provider, status: row.status, configuration: row.configuration as Record<string, unknown>, hasCredentials, hasWebhookSecret, readiness: providerReadiness(channel, row.provider, hasCredentials, row.status), lastValidatedAt: row.lastValidatedAt, updatedAt: row.updatedAt }
      : { id: null, channel, provider: providerChannelDefaults[channel], status: "draft" as const, configuration: {}, hasCredentials: false, hasWebhookSecret: false, readiness: "Not configured", lastValidatedAt: null, updatedAt: null };
  });
}

export async function getEmailServiceReadiness(schoolId: number) {
  const db = await database();
  const recent = await db.select({ id: messageLogs.id, status: messageLogs.status, createdAt: messageLogs.createdAt, sentAt: messageLogs.sentAt }).from(messageLogs).where(and(eq(messageLogs.schoolId, schoolId), eq(messageLogs.channel, "email"))).orderBy(desc(messageLogs.createdAt)).limit(12);
  const sender = ENV.authEmailFrom.trim();
  const senderAddress = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  const senderDomain = senderAddress.includes("@") ? senderAddress.split("@").pop()?.toLowerCase() ?? null : null;
  const failedCount = recent.filter(item => item.status === "failed").length;
  const acceptedCount = recent.filter(item => item.status === "sent").length;
  const managedSenderNeedsVerification = !senderDomain || senderDomain === "resend.dev";
  const status = !sender ? "not_configured" : failedCount > 0 ? "action_required" : managedSenderNeedsVerification ? "awaiting_domain_verification" : "monitoring";
  return { status, senderAddress: senderAddress || null, senderDomain, recentAttemptCount: recent.length, failedCount, acceptedCount, managedSenderNeedsVerification, lastAttemptAt: recent[0]?.createdAt ?? null, launchChecklist: ["Confirm the nsos.ng registration and DNS access.", "Add the provider-issued sender-domain DNS records.", "Verify the sender domain in the email provider.", "Update the NSOS sender address and send a controlled invitation test."] };
}

export async function saveProviderConfiguration(input: { schoolId: number; channel: ProviderChannel; provider: string; status: "draft" | "ready" | "disabled"; configuration: Record<string, unknown>; credentials?: ProviderCredentials; clearCredentials?: boolean; configuredBy: number }) {
  const db = await database();
  if (!providersByChannel[input.channel].includes(input.provider)) throw new Error("Select a provider that supports the chosen NSOS communication channel.");
  const existing = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, input.schoolId), eq(providerConfigurations.channel, input.channel))).limit(1))[0];
  const encryptedCredentials = input.clearCredentials ? null : sealProviderCredentials(input.credentials ?? {}) ?? existing?.encryptedCredentials ?? null;
  if (input.status === "ready" && providerRequiresCredentials(input.provider) && !encryptedCredentials) throw new Error("Store provider credentials before marking this configuration ready.");
  const values = { schoolId: input.schoolId, category: providerCategoryForChannel(input.channel), channel: input.channel, provider: input.provider, status: input.status, configuration: input.configuration, encryptedCredentials, configuredBy: input.configuredBy, lastValidatedAt: null };
  await db.insert(providerConfigurations).values(values).onDuplicateKeyUpdate({ set: values });
  await recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: input.configuredBy, eventType: input.clearCredentials ? "provider_credentials_cleared" : "provider_configuration_saved", targetType: "provider_configuration", targetId: `${input.channel}:${input.provider}`, metadata: { channel: input.channel, provider: input.provider, status: input.status, credentialsState: input.clearCredentials ? "cleared" : encryptedCredentials ? "stored" : "not_provided" } });
  return listProviderConfigurations(input.schoolId);
}

export async function getSmsWebhookVerificationSecret(schoolId: number, provider: "termii" | "twilio") {
  const db = await database();
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, schoolId), eq(providerConfigurations.channel, "sms"), eq(providerConfigurations.provider, provider), eq(providerConfigurations.status, "ready"))).limit(1))[0];
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

export async function testProviderConnection(schoolId: number, channel: ProviderChannel) {
  const db = await database();
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, schoolId), eq(providerConfigurations.channel, channel))).limit(1))[0];
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
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rollingThirtyDayStart = new Date(today);
  rollingThirtyDayStart.setUTCDate(rollingThirtyDayStart.getUTCDate() - 29);
  const [tutors, subjectList, supervisors, openEscalations, feedbackSummaries, usageToday, usageThirtyDays] = await Promise.all([
    db.select({ tutor: aiTutors, subjectName: subjects.name, subjectCode: subjects.code, supervisorName: users.name }).from(aiTutors).innerJoin(subjects, eq(aiTutors.subjectId, subjects.id)).leftJoin(users, eq(aiTutors.supervisorUserId, users.id)).where(eq(aiTutors.schoolId, schoolId)).orderBy(desc(aiTutors.updatedAt)),
    db.select().from(subjects).where(and(eq(subjects.schoolId, schoolId), eq(subjects.status, "active"))).orderBy(subjects.name),
    db.select({ userId: schoolMemberships.userId, name: users.name, role: schoolMemberships.role }).from(schoolMemberships).innerJoin(users, eq(schoolMemberships.userId, users.id)).where(and(eq(schoolMemberships.schoolId, schoolId), eq(schoolMemberships.status, "active"), or(eq(schoolMemberships.role, "owner"), eq(schoolMemberships.role, "admin"), eq(schoolMemberships.role, "teacher")))).orderBy(users.name),
    db.select({ tutorId: aiTutorEscalations.tutorId, count: sql<number>`count(*)` }).from(aiTutorEscalations).where(and(eq(aiTutorEscalations.schoolId, schoolId), eq(aiTutorEscalations.status, "open"))).groupBy(aiTutorEscalations.tutorId),
    db.select({ tutorId: aiTutorFeedback.tutorId, total: sql<number>`count(*)`, helpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'helpful' then 1 else 0 end)`, partlyHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'partly_helpful' then 1 else 0 end)`, notHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'not_helpful' then 1 else 0 end)` }).from(aiTutorFeedback).where(eq(aiTutorFeedback.schoolId, schoolId)).groupBy(aiTutorFeedback.tutorId),
    db.select({ questions: sql<number>`coalesce(sum(${aiTutorSessionSummaries.questionCount}), 0)`, supportRequests: sql<number>`coalesce(sum(${aiTutorSessionSummaries.escalationCount}), 0)` }).from(aiTutorSessionSummaries).where(and(eq(aiTutorSessionSummaries.schoolId, schoolId), sql`${aiTutorSessionSummaries.sessionDate} >= ${today}`)),
    db.select({ questions: sql<number>`coalesce(sum(${aiTutorSessionSummaries.questionCount}), 0)`, supportRequests: sql<number>`coalesce(sum(${aiTutorSessionSummaries.escalationCount}), 0)` }).from(aiTutorSessionSummaries).where(and(eq(aiTutorSessionSummaries.schoolId, schoolId), sql`${aiTutorSessionSummaries.sessionDate} >= ${rollingThirtyDayStart}`)),
  ]);
  const escalationCounts = new Map(openEscalations.map(item => [item.tutorId, Number(item.count)]));
  const feedbackByTutor = new Map(feedbackSummaries.map(item => [item.tutorId, { total: Number(item.total), helpful: Number(item.helpful ?? 0), partlyHelpful: Number(item.partlyHelpful ?? 0), notHelpful: Number(item.notHelpful ?? 0) }]));
  const activeTutors = tutors.filter(item => item.tutor.status === "active").map(item => item.tutor);
  return { tutors: tutors.map(item => ({ ...item.tutor, subjectName: item.subjectName, subjectCode: item.subjectCode, supervisorName: item.supervisorName ?? "Assigned school supervisor", openEscalations: escalationCounts.get(item.tutor.id) ?? 0, feedback: feedbackByTutor.get(item.tutor.id) ?? { total: 0, helpful: 0, partlyHelpful: 0, notHelpful: 0 } })), subjects: subjectList, supervisors, usage: { questionsToday: Number(usageToday[0]?.questions ?? 0), questionsLast30Days: Number(usageThirtyDays[0]?.questions ?? 0), supportRequestsToday: Number(usageToday[0]?.supportRequests ?? 0), supportRequestsLast30Days: Number(usageThirtyDays[0]?.supportRequests ?? 0), activeTutorCount: activeTutors.length, configuredDailyQuestionLimits: activeTutors.map(tutor => ({ tutorId: tutor.id, limit: tutor.dailyQuestionLimit })), note: "This is a tenant aggregate usage envelope, not a token, provider invoice, or currency-cost estimate. Learner conversations are not retained." } };
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
  if (!student) return { tutors: [], studentLinked: false, learningRecommendation: null };
  const enrollment = (await db.select({ level: classes.level }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.studentId, student.id), eq(enrollments.status, "active"))).orderBy(desc(enrollments.enrolledOn)).limit(1))[0];
  const activeProgrammes = await db.select({ title: learningPrograms.title }).from(programEnrollments).innerJoin(learningPrograms, eq(programEnrollments.programId, learningPrograms.id)).where(and(eq(programEnrollments.schoolId, schoolId), eq(programEnrollments.studentId, student.id), eq(programEnrollments.status, "active"))).orderBy(desc(programEnrollments.updatedAt)).limit(3);
  const activeTutors = await db.select({ tutor: aiTutors, subjectName: subjects.name }).from(aiTutors).innerJoin(subjects, eq(aiTutors.subjectId, subjects.id)).where(and(eq(aiTutors.schoolId, schoolId), eq(aiTutors.status, "active"))).orderBy(subjects.name);
  const preferences = await db.select().from(aiTutorTeachingPreferences).where(and(eq(aiTutorTeachingPreferences.schoolId, schoolId), eq(aiTutorTeachingPreferences.studentId, student.id)));
  const preferenceByTutor = new Map(preferences.map(item => [item.tutorId, item]));
  const feedbackSummary = await db.select({ tutorId: aiTutorFeedback.tutorId, total: sql<number>`count(*)`, helpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'helpful' then 1 else 0 end)`, partlyHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'partly_helpful' then 1 else 0 end)`, notHelpful: sql<number>`sum(case when ${aiTutorFeedback.helpfulness} = 'not_helpful' then 1 else 0 end)` }).from(aiTutorFeedback).where(and(eq(aiTutorFeedback.schoolId, schoolId), eq(aiTutorFeedback.studentId, student.id))).groupBy(aiTutorFeedback.tutorId);
  const feedbackByTutor = new Map(feedbackSummary.map(item => [item.tutorId, { total: Number(item.total), helpful: Number(item.helpful ?? 0), partlyHelpful: Number(item.partlyHelpful ?? 0), notHelpful: Number(item.notHelpful ?? 0) }]));
  return { studentLinked: true, learningRecommendation: activeProgrammes.length ? { title: "Review your current learning milestone", detail: `You have ${activeProgrammes.length} active programme${activeProgrammes.length === 1 ? "" : "s"}: ${activeProgrammes.map(item => item.title).join(", ")}. Open your learner progress view to review the next human-managed milestone and choose practice with your instructor’s guidance.`, source: "own_active_programmes" as const } : { title: "Set a learning goal with your school", detail: "No active programme is linked to this account yet. Ask your school for the appropriate programme and support route; NSOS will not enrol you automatically.", source: "own_active_programmes" as const }, tutors: activeTutors.filter(item => { const levels = item.tutor.allowedLevels as string[]; return levels.some(level => level.toLowerCase() === "all learners") || (!!enrollment?.level && levels.includes(enrollment.level)); }).map(item => { const preference = preferenceByTutor.get(item.tutor.id); const derivedStyle = deriveTeachingStyle(feedbackByTutor.get(item.tutor.id)); return { id: item.tutor.id, name: item.tutor.name, subjectName: item.subjectName, curriculumScope: item.tutor.curriculumScope, allowedLevels: item.tutor.allowedLevels, classLevel: enrollment?.level ?? "All learners", dailyQuestionLimit: item.tutor.dailyQuestionLimit, adaptationEnabled: preference?.adaptationEnabled ?? true, teachingStyle: preference?.adaptationEnabled === false ? "balanced" : (preference?.preferredStyle ?? derivedStyle) }; }) };
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
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, input.schoolId), eq(providerConfigurations.channel, "sms"))).limit(1))[0];
  if (!configuration) throw new Error("Configure an SMS provider before sending a test message.");
  if (configuration.status !== "ready") throw new Error("Save this SMS provider as ready and test its connection before sending an SMS.");
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
  const configuration = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, input.schoolId), eq(providerConfigurations.channel, "sms"))).limit(1))[0];
  if (!configuration || (configuration.provider !== "termii" && configuration.provider !== "twilio")) throw new Error("The configured SMS provider cannot confirm delivery for this test.");
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

type WebsiteMediaPurpose = "logo" | "hero";
type WebsiteMediaUpload = { purpose: WebsiteMediaPurpose; label: string; fileName: string; mimeType: string; base64: string };
const websiteImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectedWebsiteImageMimeType(bytes: Buffer) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

function websiteMediaExtension(mimeType: string) { return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp"; }

export async function listSchoolWebsiteMedia(schoolId: number) {
  return (await (await database()).select({ id: schoolWebsiteMedia.id, purpose: schoolWebsiteMedia.purpose, label: schoolWebsiteMedia.label, url: schoolWebsiteMedia.url, fileName: schoolWebsiteMedia.fileName, mimeType: schoolWebsiteMedia.mimeType, byteSize: schoolWebsiteMedia.byteSize, createdAt: schoolWebsiteMedia.createdAt }).from(schoolWebsiteMedia).where(eq(schoolWebsiteMedia.schoolId, schoolId)).orderBy(desc(schoolWebsiteMedia.createdAt)).limit(24));
}

export async function uploadSchoolWebsiteMedia(input: { schoolId: number; uploadedBy: number } & WebsiteMediaUpload) {
  const label = migrationText(input.label, 120);
  const fileName = migrationText(input.fileName, 180);
  if (!label) throw new Error("Give this approved website image a short label before uploading it.");
  if (!fileName) throw new Error("The selected image must include a file name.");
  if (!websiteImageMimeTypes.has(input.mimeType)) throw new Error("Use a PNG, JPG, or WEBP image for a school website asset.");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(input.base64)) throw new Error("The selected image could not be read safely. Choose the original file and try again.");
  const bytes = Buffer.from(input.base64.replace(/\s/g, ""), "base64");
  if (bytes.length < 64 || bytes.length > 5 * 1024 * 1024) throw new Error("Website images must be between 64 bytes and 5 MB.");
  const detectedMimeType = detectedWebsiteImageMimeType(bytes);
  if (!detectedMimeType || detectedMimeType !== input.mimeType) throw new Error("The image file signature does not match its declared format. Choose the original PNG, JPG, or WEBP file.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const db = await database();
  const duplicate = (await db.select({ id: schoolWebsiteMedia.id }).from(schoolWebsiteMedia).where(and(eq(schoolWebsiteMedia.schoolId, input.schoolId), eq(schoolWebsiteMedia.sha256, sha256))).limit(1))[0];
  if (duplicate) throw new Error("This exact image has already been added to this school’s website media library.");
  const { key, url } = await storagePut(`schools/${input.schoolId}/website-media/${input.purpose}/${sha256.slice(0, 20)}.${websiteMediaExtension(detectedMimeType)}`, bytes, detectedMimeType);
  const created = await db.insert(schoolWebsiteMedia).values({ schoolId: input.schoolId, uploadedBy: input.uploadedBy, purpose: input.purpose, label, storageKey: key, url, fileName, mimeType: detectedMimeType, byteSize: bytes.length, sha256 });
  return { id: Number(created[0].insertId), purpose: input.purpose, label, url, fileName, mimeType: detectedMimeType, byteSize: bytes.length };
}

async function selectedWebsiteMedia(schoolId: number, input: { logoMediaId?: number | null; heroMediaId?: number | null }) {
  const requested = [{ id: input.logoMediaId, purpose: "logo" as const }, { id: input.heroMediaId, purpose: "hero" as const }].filter((item): item is { id: number; purpose: WebsiteMediaPurpose } => Boolean(item.id));
  if (!requested.length) return { logoMediaId: input.logoMediaId ?? null, heroMediaId: input.heroMediaId ?? null };
  const found = await (await database()).select({ id: schoolWebsiteMedia.id, purpose: schoolWebsiteMedia.purpose }).from(schoolWebsiteMedia).where(and(eq(schoolWebsiteMedia.schoolId, schoolId), inArray(schoolWebsiteMedia.id, requested.map(item => item.id))));
  for (const requestedItem of requested) {
    const media = found.find(item => item.id === requestedItem.id);
    if (!media || media.purpose !== requestedItem.purpose) throw new Error(`Select a school-owned ${requestedItem.purpose} image from this website media library.`);
  }
  return { logoMediaId: input.logoMediaId ?? null, heroMediaId: input.heroMediaId ?? null };
}

async function publicSelectedWebsiteMedia(schoolId: number, website: { logoMediaId: number | null; heroMediaId: number | null }) {
  const ids = [website.logoMediaId, website.heroMediaId].filter((value): value is number => Boolean(value));
  if (!ids.length) return { logoUrl: null, heroUrl: null };
  const rows = await (await database()).select({ id: schoolWebsiteMedia.id, purpose: schoolWebsiteMedia.purpose, url: schoolWebsiteMedia.url }).from(schoolWebsiteMedia).where(and(eq(schoolWebsiteMedia.schoolId, schoolId), inArray(schoolWebsiteMedia.id, ids)));
  return { logoUrl: rows.find(row => row.id === website.logoMediaId && row.purpose === "logo")?.url ?? null, heroUrl: rows.find(row => row.id === website.heroMediaId && row.purpose === "hero")?.url ?? null };
}

export async function getSchoolWebsite(schoolId: number) {
  const db = await database();
  const school = (await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1))[0];
  if (!school) throw new Error("School not found.");
  const website = (await db.select().from(schoolWebsites).where(eq(schoolWebsites.schoolId, schoolId)).limit(1))[0];
  const effectiveWebsite = website ?? { schoolId, headline: `${school.name}: learning for a brighter future.`, introduction: "", primaryColor: "#0f5c4f", contactEmail: school.email, contactPhone: school.phone, campusLocation: school.address ?? school.state, customDomain: null, domainStatus: "not_configured", admissionsEnabled: true, logoMediaId: null, heroMediaId: null, visualTheme: "modern" as const, published: false };
  return { school, website: { ...effectiveWebsite, ...(await publicSelectedWebsiteMedia(schoolId, effectiveWebsite)) }, media: await listSchoolWebsiteMedia(schoolId) };
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
  requirePassportPhoto: false,
  requireAdmissionFeeReceipt: false,
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

export function publicAdmissionTemplate(template: { admissionTitle: string; headerTagline: string | null; headerLogoUrl: string | null; headerAddressLine: string | null; headerContactLine: string | null; admissionFields: unknown; declarationText: string | null; requireDeclaration: boolean; requirePassportPhoto?: boolean; requireAdmissionFeeReceipt?: boolean } | undefined) {
  return {
    admissionTitle: template?.admissionTitle ?? defaultDocumentTemplate.admissionTitle,
    headerTagline: template?.headerTagline ?? defaultDocumentTemplate.headerTagline,
    headerLogoUrl: normalisePublicHeaderLogoUrl(template?.headerLogoUrl ?? undefined),
    headerAddressLine: template?.headerAddressLine?.trim() || null,
    headerContactLine: template?.headerContactLine?.trim() || null,
    admissionFields: templateFields(template?.admissionFields),
    declarationText: template?.declarationText ?? defaultDocumentTemplate.declarationText,
    requireDeclaration: template?.requireDeclaration ?? defaultDocumentTemplate.requireDeclaration,
    requirePassportPhoto: template?.requirePassportPhoto ?? defaultDocumentTemplate.requirePassportPhoto,
    requireAdmissionFeeReceipt: template?.requireAdmissionFeeReceipt ?? defaultDocumentTemplate.requireAdmissionFeeReceipt,
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

export async function saveSchoolDocumentTemplate(input: { schoolId: number; admissionTitle: string; headerTagline?: string; headerLogoUrl?: string; headerAddressLine?: string; headerContactLine?: string; admissionFields: string[]; declarationText?: string; requireDeclaration: boolean; requirePassportPhoto: boolean; requireAdmissionFeeReceipt: boolean; termlyFeeTitle: string; feeSchedule: FeeScheduleEntry[]; updatedBy: number }) {
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
    requirePassportPhoto: input.requirePassportPhoto,
    requireAdmissionFeeReceipt: input.requireAdmissionFeeReceipt,
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

export async function saveSchoolWebsite(input: { schoolId: number; headline?: string; introduction?: string; primaryColor?: string; contactEmail?: string; contactPhone?: string; campusLocation?: string; customDomain?: string; admissionsEnabled?: boolean; logoMediaId?: number | null; heroMediaId?: number | null; visualTheme?: "modern" | "academic" | "community"; published?: boolean }) {
  const db = await database();
  const customDomain = normaliseDomain(input.customDomain);
  if (customDomain && !isValidCustomDomain(customDomain)) throw new Error("Enter a valid domain name without a protocol or path.");
  const existing = (await db.select().from(schoolWebsites).where(eq(schoolWebsites.schoolId, input.schoolId)).limit(1))[0];
  const domainChanged = existing?.customDomain !== customDomain;
  const domainVerificationToken = customDomain ? (!domainChanged && existing?.domainVerificationToken ? existing.domainVerificationToken : crypto.randomUUID().replace(/-/g, "")) : null;
  const domainStatus = customDomain ? (domainChanged ? "pending" as const : existing?.domainStatus ?? "pending" as const) : "not_configured" as const;
  const media = await selectedWebsiteMedia(input.schoolId, input);
  const values = { ...input, ...media, customDomain, domainVerificationToken, domainStatus };
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

async function publicWebsiteResponse(row: { school: typeof schools.$inferSelect; website: typeof schoolWebsites.$inferSelect }) {
  return { ...row, website: { ...row.website, ...(await publicSelectedWebsiteMedia(row.school.id, row.website)) }, admissionsUrl: row.website.admissionsEnabled ? `/apply/${row.school.shortCode}` : null };
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

export type StoredObjectAccessRecord = { schoolId: number; scope: "public_website_media" | "website_media" | "admission_document" | "knowledge_source" | "curriculum_scheme" | "payment_evidence"; createdBy?: number };

function schoolIdFromStoredObjectKey(key: string) {
  const match = /^schools\/([1-9]\d*)\//.exec(key);
  return match ? Number(match[1]) : undefined;
}

export async function getStoredObjectAccessRecord(key: string): Promise<StoredObjectAccessRecord | undefined> {
  const schoolId = schoolIdFromStoredObjectKey(key);
  if (!schoolId) return undefined;
  const db = await database();

  if (key.includes("/website-media/")) {
    const media = (await db.select({ id: schoolWebsiteMedia.id, schoolId: schoolWebsiteMedia.schoolId, published: schoolWebsites.published, logoMediaId: schoolWebsites.logoMediaId, heroMediaId: schoolWebsites.heroMediaId }).from(schoolWebsiteMedia).leftJoin(schoolWebsites, eq(schoolWebsiteMedia.schoolId, schoolWebsites.schoolId)).where(and(eq(schoolWebsiteMedia.schoolId, schoolId), eq(schoolWebsiteMedia.storageKey, key))).limit(1))[0];
    if (!media) return undefined;
    const publicMedia = media.published === true && (media.logoMediaId === media.id || media.heroMediaId === media.id);
    return { schoolId, scope: publicMedia ? "public_website_media" : "website_media" };
  }

  if (key.includes("/admissions/")) {
    const document = (await db.select({ schoolId: admissionsApplications.schoolId }).from(admissionDocuments).innerJoin(admissionsApplications, eq(admissionDocuments.applicationId, admissionsApplications.id)).where(and(eq(admissionsApplications.schoolId, schoolId), eq(admissionDocuments.storageKey, key))).limit(1))[0];
    return document ? { schoolId: document.schoolId, scope: "admission_document" } : undefined;
  }

  if (key.includes("/knowledge-library/")) {
    const source = (await db.select({ schoolId: institutionKnowledgeSources.schoolId }).from(institutionKnowledgeSources).where(and(eq(institutionKnowledgeSources.schoolId, schoolId), eq(institutionKnowledgeSources.storageKey, key))).limit(1))[0]
      ?? (await db.select({ schoolId: institutionKnowledgeSourceRevisions.schoolId }).from(institutionKnowledgeSourceRevisions).where(and(eq(institutionKnowledgeSourceRevisions.schoolId, schoolId), eq(institutionKnowledgeSourceRevisions.storageKey, key))).limit(1))[0];
    return source ? { schoolId: source.schoolId, scope: "knowledge_source" } : undefined;
  }

  if (key.includes("/curriculum-schemes/")) {
    const imported = (await db.select({ schoolId: schemeOfWorkImports.schoolId }).from(schemeOfWorkImports).where(and(eq(schemeOfWorkImports.schoolId, schoolId), eq(schemeOfWorkImports.fileKey, key))).limit(1))[0];
    return imported ? { schoolId: imported.schoolId, scope: "curriculum_scheme" } : undefined;
  }

  if (key.includes("/cash-assurance/")) {
    const evidence = (await db.select({ schoolId: paymentEvidence.schoolId, createdBy: paymentEvidence.createdBy }).from(paymentEvidence).where(and(eq(paymentEvidence.schoolId, schoolId), eq(paymentEvidence.evidenceFileKey, key))).limit(1))[0];
    return evidence ? { schoolId: evidence.schoolId, scope: "payment_evidence", createdBy: evidence.createdBy } : undefined;
  }

  return undefined;
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

export type InstitutionOperatingProfileInput = { mission?: string; targetLearners?: string; brandTone?: string; teachingPhilosophy?: string; curriculumStrategy?: string; pricingApproach?: string; policyNotes?: string; operatingGoals?: string };
export type SchoolOperatorInsightInput = { insightType: "readiness" | "learning" | "admissions" | "revenue" | "lifecycle" | "health" | "certificate"; severity: "info" | "attention" | "review"; dedupeKey: string; title: string; detail: string; evidence: { metric: string; value: number; comparison?: string; source: string }; actionDestination?: string };
export type SchoolOperatorInsight = typeof schoolOperatorInsights.$inferSelect;
export type SchoolOperatorWorkflowPreferenceInput = { reviewFocus: "balanced" | "learning" | "admissions" | "revenue" | "operational_readiness"; reviewCadence: "daily" | "weekly" | "monthly"; evidenceDetail: "concise" | "standard"; showDismissedInsights: boolean };

const operatorProfileDefault = { mission: null, targetLearners: null, brandTone: null, teachingPhilosophy: null, curriculumStrategy: null, pricingApproach: null, policyNotes: null, operatingGoals: null };
const operatorWorkflowPreferenceDefault: SchoolOperatorWorkflowPreferenceInput = { reviewFocus: "balanced", reviewCadence: "weekly", evidenceDetail: "standard", showDismissedInsights: false };

export async function getInstitutionOperatingProfile(schoolId: number) {
  const row = (await (await database()).select().from(institutionOperatingProfiles).where(eq(institutionOperatingProfiles.schoolId, schoolId)).limit(1))[0];
  return row ?? { schoolId, ...operatorProfileDefault, updatedBy: null, createdAt: null, updatedAt: null };
}

export async function saveInstitutionOperatingProfile(input: { schoolId: number; updatedBy: number; profile: InstitutionOperatingProfileInput }) {
  const values = { schoolId: input.schoolId, updatedBy: input.updatedBy, mission: input.profile.mission?.trim() || null, targetLearners: input.profile.targetLearners?.trim() || null, brandTone: input.profile.brandTone?.trim() || null, teachingPhilosophy: input.profile.teachingPhilosophy?.trim() || null, curriculumStrategy: input.profile.curriculumStrategy?.trim() || null, pricingApproach: input.profile.pricingApproach?.trim() || null, policyNotes: input.profile.policyNotes?.trim() || null, operatingGoals: input.profile.operatingGoals?.trim() || null };
  await (await database()).insert(institutionOperatingProfiles).values(values).onDuplicateKeyUpdate({ set: values });
  return getInstitutionOperatingProfile(input.schoolId);
}

export async function getSchoolOperatorWorkflowPreferences(schoolId: number) {
  const row = (await (await database()).select().from(schoolOperatorWorkflowPreferences).where(eq(schoolOperatorWorkflowPreferences.schoolId, schoolId)).limit(1))[0];
  return row ?? { schoolId, ...operatorWorkflowPreferenceDefault, updatedBy: null, createdAt: null, updatedAt: null };
}

export async function saveSchoolOperatorWorkflowPreferences(input: { schoolId: number; updatedBy: number; preferences: SchoolOperatorWorkflowPreferenceInput }) {
  const values = { schoolId: input.schoolId, updatedBy: input.updatedBy, ...input.preferences };
  await (await database()).insert(schoolOperatorWorkflowPreferences).values(values).onDuplicateKeyUpdate({ set: { reviewFocus: values.reviewFocus, reviewCadence: values.reviewCadence, evidenceDetail: values.evidenceDetail, showDismissedInsights: values.showDismissedInsights, updatedBy: values.updatedBy } });
  return getSchoolOperatorWorkflowPreferences(input.schoolId);
}

async function upsertSchoolOperatorInsight(input: { schoolId: number } & SchoolOperatorInsightInput) {
  const values = { ...input, actionDestination: input.actionDestination ?? null, sourceVersion: "deterministic-v1" as const, generatedAt: new Date() };
  await (await database()).insert(schoolOperatorInsights).values(values).onDuplicateKeyUpdate({ set: { severity: values.severity, title: values.title, detail: values.detail, evidence: values.evidence, actionDestination: values.actionDestination, sourceVersion: values.sourceVersion, generatedAt: values.generatedAt } });
}

export async function listSchoolOperatorInsights(schoolId: number) {
  return (await (await database()).select().from(schoolOperatorInsights).where(eq(schoolOperatorInsights.schoolId, schoolId)).orderBy(desc(schoolOperatorInsights.generatedAt)).limit(30));
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

export async function getOperationsCommandCenter(schoolId: number) {
  const [onboarding, email, providers, studentBatches, staffBatches, academicBatches] = await Promise.all([
    getTenantOnboardingStatus(schoolId),
    getEmailServiceReadiness(schoolId),
    listProviderConfigurations(schoolId),
    listStudentMigrationBatches(schoolId),
    listStaffMigrationBatches(schoolId),
    listAcademicMigrationBatches(schoolId),
  ]);
  const completedBatches = (batches: Array<{ status: string; createdAt: Date; completedAt: Date | null }>) => ({
    completed: batches.filter(batch => batch.status === "completed").length,
    latestCompletedAt: batches.find(batch => batch.status === "completed")?.completedAt ?? null,
    latestCreatedAt: batches[0]?.createdAt ?? null,
  });
  const channelStatus = providers.map(provider => ({ channel: provider.channel, provider: provider.provider, status: provider.status, readiness: provider.readiness, configured: provider.status === "ready" }));
  return {
    onboarding,
    nextAction: onboarding.nextStep ? { label: onboarding.nextStep.actionLabel ?? onboarding.nextStep.label, destination: onboarding.nextStep.destination ?? null, description: onboarding.nextStep.description } : null,
    communications: {
      channels: channelStatus,
      readyChannels: channelStatus.filter(channel => channel.configured).length,
      email: { status: email.status, managedSenderNeedsVerification: email.managedSenderNeedsVerification, failedCount: email.failedCount, acceptedCount: email.acceptedCount, launchChecklist: email.launchChecklist },
    },
    migrations: {
      students: completedBatches(studentBatches),
      staff: completedBatches(staffBatches),
      academics: completedBatches(academicBatches),
    },
  };
}

export type AcademyLaunchReadinessStatus = "ready" | "warning" | "blocked";
export type AcademyLaunchReadinessInput = { profileConfigured: boolean; programCount: number; moduleCount: number; materialCount: number; activeTutorCount: number; websitePublished: boolean; admissionsEnabled: boolean; paymentProviderReady: boolean; emailSenderNeedsVerification: boolean; emailFailedCount: number; activeCertificationPolicyCount: number };

export function deriveAcademyLaunchReadiness(input: AcademyLaunchReadinessInput) {
  const checks: Array<{ id: string; label: string; status: AcademyLaunchReadinessStatus; detail: string; destination: "learning" | "website" | "admissions" | "finance" | "communications" | "ai-tutors" | "institution-builder" }> = [
    { id: "operating-profile", label: "Owner-approved academy direction", status: input.profileConfigured ? "ready" : "warning", detail: input.profileConfigured ? "Private mission and learner context are available for planning." : "Save the owner-approved mission, learners, and learning approach before relying on AI planning.", destination: "institution-builder" },
    { id: "learning-foundation", label: "Internal learning foundation", status: input.programCount > 0 && input.moduleCount > 0 && input.materialCount > 0 ? "ready" : "blocked", detail: input.programCount > 0 && input.moduleCount > 0 && input.materialCount > 0 ? `${input.programCount} programme${input.programCount === 1 ? "" : "s"}, ${input.moduleCount} module${input.moduleCount === 1 ? "" : "s"}, and ${input.materialCount} internal material${input.materialCount === 1 ? "" : "s"} are available for owner review.` : "Prepare and review programme, module, and material drafts before treating the learning offer as ready.", destination: "learning" },
    { id: "supervised-tutors", label: "Supervised AI Tutor coverage", status: input.activeTutorCount > 0 ? "ready" : "warning", detail: input.activeTutorCount > 0 ? `${input.activeTutorCount} active supervised AI tutor${input.activeTutorCount === 1 ? " is" : "s are"} configured within existing tutor boundaries.` : "No active AI tutor is configured. Tutor setup must remain supervised, scope-bound, and separate from assessment decisions.", destination: "ai-tutors" },
    { id: "public-presence", label: "Public website and admissions decision", status: input.websitePublished && input.admissionsEnabled ? "ready" : "blocked", detail: input.websitePublished && input.admissionsEnabled ? "A published website with admissions enabled is visible through the existing protected publication controls." : "Review website content, public claims, publication, and admissions visibility separately. A private draft is not a public academy.", destination: "website" },
    { id: "payment-readiness", label: "Verified payment-provider readiness", status: input.paymentProviderReady ? "ready" : "blocked", detail: input.paymentProviderReady ? "A payment provider is configured as ready; complete controlled merchant and payment-to-enrollment validation before accepting learners." : "A verified payment provider is required before any paid enrollment journey can be treated as available.", destination: "finance" },
    { id: "email-readiness", label: "Transactional email readiness", status: input.emailSenderNeedsVerification ? "blocked" : input.emailFailedCount > 0 ? "warning" : "ready", detail: input.emailSenderNeedsVerification ? "A verified sender domain is still required; NSOS must not represent email delivery as launch-ready." : input.emailFailedCount > 0 ? `${input.emailFailedCount} recorded delivery failure${input.emailFailedCount === 1 ? " needs" : "s need"} review before relying on email.` : "No current sender-verification block or recorded email-delivery failure is present in this tenant aggregate.", destination: "communications" },
    { id: "private-certificate-policy", label: "Private certificate-policy readiness", status: input.activeCertificationPolicyCount > 0 ? "warning" : "blocked", detail: input.activeCertificationPolicyCount > 0 ? "A private certificate policy is active. Issuance remains human-confirmed and public verification is not available." : "No active private certificate policy is configured. Define issuer and human-reviewed completion criteria before preparing any record.", destination: "learning" },
    { id: "staging-and-recovery", label: "Staging, recovery, and capacity evidence", status: "blocked", detail: "An isolated synthetic staging run, restore rehearsal, and recorded progressive-load evidence are required before a capacity or broad-launch claim.", destination: "institution-builder" },
  ];
  const summary = checks.reduce((totals, check) => ({ ...totals, [check.status]: totals[check.status] + 1 }), { ready: 0, warning: 0, blocked: 0 });
  return { checks, summary, status: summary.blocked > 0 ? "blocked" as const : summary.warning > 0 ? "warning" as const : "ready" as const, source: "deterministic-tenant-configuration-v1" as const };
}

export async function getAcademyLaunchReadiness(schoolId: number) {
  const db = await database();
  const [profile, programs, modules, materials, activeTutors, website, activePolicies, providers, email] = await Promise.all([
    getInstitutionOperatingProfile(schoolId),
    db.select({ value: sql<number>`count(*)` }).from(learningPrograms).where(eq(learningPrograms.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(programCurriculumModules).where(eq(programCurriculumModules.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(programCourseMaterials).where(eq(programCourseMaterials.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(aiTutors).where(and(eq(aiTutors.schoolId, schoolId), eq(aiTutors.status, "active"))),
    db.select({ published: schoolWebsites.published, admissionsEnabled: schoolWebsites.admissionsEnabled }).from(schoolWebsites).where(eq(schoolWebsites.schoolId, schoolId)).limit(1),
    db.select({ value: sql<number>`count(*)` }).from(programCertificationPolicies).where(and(eq(programCertificationPolicies.schoolId, schoolId), eq(programCertificationPolicies.status, "active"))),
    listProviderConfigurations(schoolId),
    getEmailServiceReadiness(schoolId),
  ]);
  const payment = providers.find(provider => provider.channel === "payment");
  return deriveAcademyLaunchReadiness({ profileConfigured: Boolean(profile?.mission && profile?.targetLearners), programCount: Number(programs[0]?.value ?? 0), moduleCount: Number(modules[0]?.value ?? 0), materialCount: Number(materials[0]?.value ?? 0), activeTutorCount: activeTutors.length, websitePublished: Boolean(website[0]?.published), admissionsEnabled: Boolean(website[0]?.admissionsEnabled), paymentProviderReady: Boolean(payment?.status === "ready" && payment.hasCredentials), emailSenderNeedsVerification: email.managedSenderNeedsVerification, emailFailedCount: email.failedCount, activeCertificationPolicyCount: Number(activePolicies[0]?.value ?? 0) });
}

export type SchoolOperatorTrendInsight = SchoolOperatorInsightInput | null;

export function buildSchoolOperatorTrendInsight(input: {
  insightType: SchoolOperatorInsightInput["insightType"];
  metric: string;
  recent: number;
  previous: number;
  source: string;
  actionDestination: string;
  title: string;
  unit?: "percentage_points" | "percent" | "count";
  higherIsConcern?: boolean;
  threshold?: number;
}) : SchoolOperatorTrendInsight {
  if (!Number.isFinite(input.recent) || !Number.isFinite(input.previous) || input.previous === 0) return null;
  const delta = Number((input.recent - input.previous).toFixed(2));
  const relativeDelta = Number(((delta / Math.abs(input.previous)) * 100).toFixed(2));
  const threshold = input.threshold ?? 5;
  const concernDelta = input.higherIsConcern === false ? -relativeDelta : relativeDelta;
  if (Math.abs(concernDelta) < threshold || concernDelta <= 0) return null;
  const direction = delta < 0 ? "fell" : "rose";
  const unitLabel = input.unit === "percentage_points" ? " percentage points" : input.unit === "count" ? "" : "%";
  const displayedDelta = input.unit === "percent" ? relativeDelta : delta;
  const severity: SchoolOperatorInsightInput["severity"] = concernDelta >= threshold * 2 ? "attention" : "review";
  return {
    insightType: input.insightType,
    severity,
    dedupeKey: `trend-${input.metric}`,
    title: input.title,
    detail: `${input.metric.replaceAll("_", " ")} ${direction} by ${Math.abs(displayedDelta)}${unitLabel} versus the previous comparison window. Review the underlying records before taking action.`,
    evidence: {
      metric: input.metric,
      value: input.recent,
      comparison: `previous_window=${input.previous};delta=${delta};relative_delta=${relativeDelta}%`,
      source: input.source,
    },
    actionDestination: input.actionDestination,
  };
}

export async function refreshSchoolOperatorInsights(schoolId: number) {
  const db = await database();
  const now = new Date();
  const recentStart = new Date(now.getTime() - 30 * 86_400_000);
  const previousStart = new Date(now.getTime() - 60 * 86_400_000);
  const [dashboard, onboarding, commandCenter, programs, activeEnrollments, completedEnrollments, certificates, failedJobs, submittedEvidence, returnedEvidence, website, recentAttendance, previousAttendance, recentAcademics, previousAcademics, recentAdmissions, previousAdmissions] = await Promise.all([
    getDashboardSummary(schoolId),
    getTenantOnboardingStatus(schoolId),
    getOperationsCommandCenter(schoolId),
    db.select({ value: sql<number>`count(*)` }).from(learningPrograms).where(eq(learningPrograms.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(programEnrollments).where(and(eq(programEnrollments.schoolId, schoolId), eq(programEnrollments.status, "active"))),
    db.select({ value: sql<number>`count(*)` }).from(programEnrollments).where(and(eq(programEnrollments.schoolId, schoolId), eq(programEnrollments.status, "completed"))),
    db.select({ value: sql<number>`count(*)` }).from(programCertificates).where(eq(programCertificates.schoolId, schoolId)),
    db.select({ value: sql<number>`count(*)` }).from(automationJobs).where(and(eq(automationJobs.schoolId, schoolId), eq(automationJobs.status, "failed"))),
    db.select({ value: sql<number>`count(*)` }).from(programMilestoneEvidenceSubmissions).where(and(eq(programMilestoneEvidenceSubmissions.schoolId, schoolId), eq(programMilestoneEvidenceSubmissions.status, "submitted"))),
    db.select({ value: sql<number>`count(*)` }).from(programMilestoneEvidenceSubmissions).where(and(eq(programMilestoneEvidenceSubmissions.schoolId, schoolId), eq(programMilestoneEvidenceSubmissions.status, "reviewed_returned"))),
    db.select({ published: schoolWebsites.published }).from(schoolWebsites).where(eq(schoolWebsites.schoolId, schoolId)).limit(1),
    db.select({ present: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceRecords.status} IN ('present','late') THEN 1 ELSE 0 END),0)`, total: sql<number>`COUNT(*)` }).from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.attendeeType, "student"), sql`${attendanceRecords.attendanceDate} >= ${recentStart}`, sql`${attendanceRecords.attendanceDate} < ${now}`)),
    db.select({ present: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceRecords.status} IN ('present','late') THEN 1 ELSE 0 END),0)`, total: sql<number>`COUNT(*)` }).from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.attendeeType, "student"), sql`${attendanceRecords.attendanceDate} >= ${previousStart}`, sql`${attendanceRecords.attendanceDate} < ${recentStart}`)),
    db.select({ average: sql<number>`COALESCE(AVG((CAST(${scores.score} AS DECIMAL(12,4)) / NULLIF(${assessments.maximumScore},0))*100),0)`, count: sql<number>`COUNT(*)` }).from(scores).innerJoin(assessments, eq(scores.assessmentId, assessments.id)).where(and(eq(scores.schoolId, schoolId), eq(assessments.schoolId, schoolId), eq(assessments.status, "published"), sql`${assessments.heldOn} >= ${recentStart}`, sql`${assessments.heldOn} < ${now}`)),
    db.select({ average: sql<number>`COALESCE(AVG((CAST(${scores.score} AS DECIMAL(12,4)) / NULLIF(${assessments.maximumScore},0))*100),0)`, count: sql<number>`COUNT(*)` }).from(scores).innerJoin(assessments, eq(scores.assessmentId, assessments.id)).where(and(eq(scores.schoolId, schoolId), eq(assessments.schoolId, schoolId), eq(assessments.status, "published"), sql`${assessments.heldOn} >= ${previousStart}`, sql`${assessments.heldOn} < ${recentStart}`)),
    db.select({ total: sql<number>`COUNT(*)` }).from(admissionsApplications).where(and(eq(admissionsApplications.schoolId, schoolId), sql`${admissionsApplications.submittedAt} >= ${recentStart}`, sql`${admissionsApplications.submittedAt} < ${now}`)),
    db.select({ total: sql<number>`COUNT(*)` }).from(admissionsApplications).where(and(eq(admissionsApplications.schoolId, schoolId), sql`${admissionsApplications.submittedAt} >= ${previousStart}`, sql`${admissionsApplications.submittedAt} < ${recentStart}`)),
  ]);
  const programmeCount = Number(programs[0]?.value ?? 0);
  const activeEnrollmentCount = Number(activeEnrollments[0]?.value ?? 0);
  const completedEnrollmentCount = Number(completedEnrollments[0]?.value ?? 0);
  const certificateCount = Number(certificates[0]?.value ?? 0);
  const failedJobCount = Number(failedJobs[0]?.value ?? 0);
  const submittedEvidenceCount = Number(submittedEvidence[0]?.value ?? 0);
  const returnedEvidenceCount = Number(returnedEvidence[0]?.value ?? 0);
  const websitePublished = Boolean(website[0]?.published);
  const recentAttendanceRate = Number(recentAttendance[0]?.total ?? 0) > 0 ? Number(((Number(recentAttendance[0]?.present ?? 0) / Number(recentAttendance[0]?.total ?? 1)) * 100).toFixed(2)) : 0;
  const previousAttendanceRate = Number(previousAttendance[0]?.total ?? 0) > 0 ? Number(((Number(previousAttendance[0]?.present ?? 0) / Number(previousAttendance[0]?.total ?? 1)) * 100).toFixed(2)) : 0;
  const recentAcademicAverage = Number(recentAcademics[0]?.count ?? 0) > 0 ? Number(recentAcademics[0]?.average ?? 0) : 0;
  const previousAcademicAverage = Number(previousAcademics[0]?.count ?? 0) > 0 ? Number(previousAcademics[0]?.average ?? 0) : 0;
  const recentAdmissionCount = Number(recentAdmissions[0]?.total ?? 0);
  const previousAdmissionCount = Number(previousAdmissions[0]?.total ?? 0);
  const signals: SchoolOperatorInsightInput[] = [];
  const trendInsights = [
    buildSchoolOperatorTrendInsight({ insightType: "health", metric: "attendance_rate_30d", recent: recentAttendanceRate, previous: previousAttendanceRate, source: "attendance_records", actionDestination: "attendance", title: "Attendance trend needs review", unit: "percentage_points", higherIsConcern: false, threshold: 3 }),
    buildSchoolOperatorTrendInsight({ insightType: "learning", metric: "published_assessment_average_30d", recent: recentAcademicAverage, previous: previousAcademicAverage, source: "published_scores", actionDestination: "results", title: "Published assessment performance shifted", unit: "percentage_points", higherIsConcern: false, threshold: 5 }),
    buildSchoolOperatorTrendInsight({ insightType: "admissions", metric: "admission_submissions_30d", recent: recentAdmissionCount, previous: previousAdmissionCount, source: "admissions_applications", actionDestination: "admissions", title: "Admissions enquiry volume shifted", unit: "percent", higherIsConcern: false, threshold: Math.max(1, previousAdmissionCount * 0.25) }),
  ].filter((item): item is SchoolOperatorInsightInput => Boolean(item));
  signals.push(...trendInsights);
  if (onboarding.completionPercent < 100) signals.push({ insightType: "readiness", severity: "attention", dedupeKey: "onboarding-incomplete", title: "Institution setup still needs review", detail: `${onboarding.completedSteps} of ${onboarding.totalSteps} readiness steps are complete. Review the next protected setup step before treating the institution as launch-ready.`, evidence: { metric: "onboarding_completion_percent", value: onboarding.completionPercent, source: "tenant_onboarding" }, actionDestination: onboarding.nextStep?.destination ?? "overview" });
  if (programmeCount === 0) signals.push({ insightType: "learning", severity: "attention", dedupeKey: "no-programmes", title: "No internal learning programme is ready", detail: "Prepare a private learning foundation in School Builder or Course Studio, then review activation separately.", evidence: { metric: "learning_programme_count", value: 0, source: "learning_programmes" }, actionDestination: "learning" });
  else if (activeEnrollmentCount === 0) signals.push({ insightType: "lifecycle", severity: "info", dedupeKey: "no-active-enrolments", title: "Programmes have no active learner enrolments", detail: "Review admissions and enrolment readiness. NSOS cannot infer demand, contact people, or enrol learners automatically.", evidence: { metric: "active_programme_enrolments", value: 0, source: "program_enrolments" }, actionDestination: "admissions" });
  else signals.push({ insightType: "learning", severity: "info", dedupeKey: "active-learning", title: "Active learning delivery is visible", detail: `${activeEnrollmentCount} active programme enrolment${activeEnrollmentCount === 1 ? " is" : "s are"} available for human-reviewed learning operations. Review progress and support in Learning Centre.`, evidence: { metric: "active_programme_enrolments", value: activeEnrollmentCount, source: "program_enrolments" }, actionDestination: "learning" });
  if (submittedEvidenceCount > 0) signals.push({ insightType: "learning", severity: "attention", dedupeKey: "milestone-evidence-awaiting-review", title: "Learning evidence is awaiting human review", detail: `${submittedEvidenceCount} private milestone-evidence submission${submittedEvidenceCount === 1 ? " is" : "s are"} awaiting a permitted reviewer. Open Learning Centre to review only the records you are authorised to access.`, evidence: { metric: "submitted_milestone_evidence", value: submittedEvidenceCount, source: "program_milestone_evidence" }, actionDestination: "learning" });
  if (returnedEvidenceCount > 0) signals.push({ insightType: "learning", severity: "info", dedupeKey: "milestone-evidence-returned", title: "Some learning evidence has follow-up guidance", detail: `${returnedEvidenceCount} private milestone-evidence submission${returnedEvidenceCount === 1 ? " has" : "s have"} been returned through the existing human review workflow. NSOS does not automatically contact, grade, or complete learners.`, evidence: { metric: "returned_milestone_evidence", value: returnedEvidenceCount, source: "program_milestone_evidence" }, actionDestination: "learning" });
  if (dashboard.pendingAdmissions > 0) signals.push({ insightType: "admissions", severity: "attention", dedupeKey: "pending-admissions", title: "Admissions need owner review", detail: `${dashboard.pendingAdmissions} submitted or under-review application${dashboard.pendingAdmissions === 1 ? " is" : "s are"} awaiting the protected admissions workflow.`, evidence: { metric: "pending_admissions", value: dashboard.pendingAdmissions, source: "admissions_applications" }, actionDestination: "admissions" });
  if (dashboard.outstanding > 0) signals.push({ insightType: "revenue", severity: "attention", dedupeKey: "outstanding-balance", title: "Outstanding balances need finance review", detail: "Open Finance to review tenant invoices and payment evidence. NSOS does not chase, alter pricing, record payments, or send reminders from this insight.", evidence: { metric: "outstanding_invoice_value", value: dashboard.outstanding, source: "invoices" }, actionDestination: "finance" });
  if (programmeCount > 0 && !websitePublished) signals.push({ insightType: "readiness", severity: "info", dedupeKey: "programme-website-readiness", title: "Learning offers need a reviewed public-presence decision", detail: "Internal programmes exist, but this institution does not currently have a published NSOS website. Review an editable website draft and its separate publication controls; NSOS will not publish, advertise, spend, collect leads, or send a campaign from this insight.", evidence: { metric: "published_website", value: 0, source: "school_websites" }, actionDestination: "website" });
  if (commandCenter.communications.email.failedCount > 0) signals.push({ insightType: "health", severity: "review", dedupeKey: "failed-email-delivery", title: "Email delivery needs configuration review", detail: `${commandCenter.communications.email.failedCount} tenant email delivery record${commandCenter.communications.email.failedCount === 1 ? " needs" : "s need"} review. NSOS will not retry or change the sender automatically.`, evidence: { metric: "failed_email_records", value: commandCenter.communications.email.failedCount, source: "email_service_readiness" }, actionDestination: "communications" });
  if (failedJobCount > 0) signals.push({ insightType: "health", severity: "review", dedupeKey: "failed-automation-jobs", title: "Automation history has failed jobs", detail: `${failedJobCount} automation job${failedJobCount === 1 ? " needs" : "s need"} a manual target-workspace review. NSOS does not retry failed automation automatically.`, evidence: { metric: "failed_automation_jobs", value: failedJobCount, source: "automation_jobs" }, actionDestination: "automation" });
  if (completedEnrollmentCount > 0 && certificateCount === 0) signals.push({ insightType: "certificate", severity: "info", dedupeKey: "certificate-readiness", title: "Completion records may need certificate-policy review", detail: "Review the controlled private-record and certificate policy workflow. NSOS does not issue certificates or create public verification claims from this insight.", evidence: { metric: "completed_programme_enrolments", value: completedEnrollmentCount, source: "program_enrolments" }, actionDestination: "learning" });
  await Promise.all(signals.map(signal => upsertSchoolOperatorInsight({ schoolId, ...signal })));
  return listSchoolOperatorInsights(schoolId);
}

export async function dismissSchoolOperatorInsight(input: { schoolId: number; insightId: number; dismissedBy: number }) {
  const db = await database();
  const existing = (await db.select({ id: schoolOperatorInsights.id }).from(schoolOperatorInsights).where(and(eq(schoolOperatorInsights.id, input.insightId), eq(schoolOperatorInsights.schoolId, input.schoolId))).limit(1))[0];
  if (!existing) throw new Error("School Operator insight was not found in this institution.");
  await db.update(schoolOperatorInsights).set({ status: "dismissed", dismissedBy: input.dismissedBy, dismissedAt: new Date() }).where(and(eq(schoolOperatorInsights.id, input.insightId), eq(schoolOperatorInsights.schoolId, input.schoolId)));
  return listSchoolOperatorInsights(input.schoolId);
}

export type SchoolOperatorHealthSignal = {
  id: string;
  label: string;
  status: "healthy" | "watch" | "attention";
  value: number;
  unit: "percent" | "count" | "currency";
  detail: string;
  source: string;
  actionDestination: string;
};

export function buildSchoolOperatorHealthSignals(input: {
  attendanceRate: number;
  pendingAdmissions: number;
  outstanding: number;
  failedEmailCount: number;
  failedAutomationJobs: number;
  onboardingCompletionPercent: number;
}): SchoolOperatorHealthSignal[] {
  return [
    { id: "attendance", label: "Attendance", status: input.attendanceRate >= 90 ? "healthy" : input.attendanceRate >= 80 ? "watch" : "attention", value: input.attendanceRate, unit: "percent", detail: input.attendanceRate > 0 ? "Current student attendance rate from recorded attendance." : "No current attendance records are available.", source: "attendance_records", actionDestination: "attendance" },
    { id: "admissions", label: "Admissions", status: input.pendingAdmissions === 0 ? "healthy" : input.pendingAdmissions <= 5 ? "watch" : "attention", value: input.pendingAdmissions, unit: "count", detail: input.pendingAdmissions === 0 ? "No submitted or under-review applications are waiting." : "Applications are waiting for protected admissions review.", source: "admissions_applications", actionDestination: "admissions" },
    { id: "finance", label: "Finance", status: input.outstanding === 0 ? "healthy" : "attention", value: input.outstanding, unit: "currency", detail: input.outstanding === 0 ? "No outstanding invoice value is currently recorded." : "Outstanding invoice value is present and requires finance review.", source: "invoices", actionDestination: "finance" },
    { id: "communications", label: "Communications", status: input.failedEmailCount === 0 ? "healthy" : "attention", value: input.failedEmailCount, unit: "count", detail: input.failedEmailCount === 0 ? "No recorded tenant email delivery failures." : "Recorded email delivery failures require configuration review.", source: "email_service_readiness", actionDestination: "communications" },
    { id: "automation", label: "Automation", status: input.failedAutomationJobs === 0 ? "healthy" : "attention", value: input.failedAutomationJobs, unit: "count", detail: input.failedAutomationJobs === 0 ? "No failed automation jobs are recorded." : "Failed automation jobs require manual review.", source: "automation_jobs", actionDestination: "automation" },
    { id: "setup", label: "Institution setup", status: input.onboardingCompletionPercent >= 100 ? "healthy" : input.onboardingCompletionPercent >= 80 ? "watch" : "attention", value: input.onboardingCompletionPercent, unit: "percent", detail: input.onboardingCompletionPercent >= 100 ? "Core onboarding readiness is complete." : "The institution still has onboarding readiness steps to review.", source: "tenant_onboarding", actionDestination: "overview" },
  ];
}

export type SchoolOperatorAttentionItem = SchoolOperatorInsight & { priority: number };

export function prioritizeSchoolOperatorInsights(
  insights: SchoolOperatorInsight[],
  focus: "balanced" | "learning" | "admissions" | "revenue" | "operational_readiness" = "balanced",
) {
  const focusTypes: Record<typeof focus, string[]> = {
    balanced: [],
    learning: ["learning", "lifecycle", "certificate"],
    admissions: ["admissions"],
    revenue: ["revenue"],
    operational_readiness: ["readiness", "health"],
  };
  const severityWeight: Record<SchoolOperatorInsight["severity"], number> = { attention: 60, review: 45, info: 20 };
  return insights
    .filter(insight => insight.status === "open")
    .map(insight => ({
      ...insight,
      priority: severityWeight[insight.severity] + (focusTypes[focus].includes(insight.insightType) ? 20 : 0) + (insight.actionDestination ? 10 : 0),
    }))
    .sort((a, b) => b.priority - a.priority || b.generatedAt.getTime() - a.generatedAt.getTime());
}

export type SchoolOperatorQuestionResult = {
  question: string;
  answer: string;
  confidence: "high" | "limited";
  evidence: Array<{ metric: string; value: number | string; source: string }>;
  suggestedDestination?: string;
  limitations: string[];
};

export type SchoolOperatorQuestionTopic =
  | "attendance"
  | "admissions"
  | "finance"
  | "health"
  | "attention"
  | "onboarding"
  | "academic"
  | "general";

export function resolveSchoolOperatorQuestionTopic(question: string): SchoolOperatorQuestionTopic {
  const normalized = question.trim().toLowerCase();
  if (/(attendance|present|absent|late)/.test(normalized)) return "attendance";
  if (/(admission|applicant|application)/.test(normalized)) return "admissions";
  if (/(fee|finance|revenue|money|outstanding|invoice)/.test(normalized)) return "finance";
  if (/(health|healthy|status|doing|operating state)/.test(normalized)) return "health";
  if (/(attention|urgent|priority|needs.*review|review)/.test(normalized)) return "attention";
  if (/(setup|onboard|ready|launch)/.test(normalized)) return "onboarding";
  if (/(academic|assessment|score|result|learning|performance)/.test(normalized)) return "academic";
  return "general";
}

export async function answerSchoolOperatorQuestion(input: { schoolId: number; question: string }) : Promise<SchoolOperatorQuestionResult> {
  const question = input.question.trim().slice(0, 500);
  if (!question) throw new Error("Ask a question about the school's current operating state.");
  const workspace = await getSchoolOperatorWorkspace(input.schoolId);
  const normalized = question.toLowerCase();
  const evidence = (workspace.insights.filter(item => item.status === "open").slice(0, 3).map(item => ({
    metric: item.evidence.metric,
    value: item.evidence.value,
    source: item.evidence.source,
  })));
  if (resolveSchoolOperatorQuestionTopic(normalized) === "attendance") {
    return { question, answer: `The current recorded attendance rate is ${workspace.dashboard.attendanceRate}%. This is calculated from the school's current attendance records; it is not a prediction about individual learners.`, confidence: "high", evidence: [{ metric: "attendance_rate", value: workspace.dashboard.attendanceRate, source: "attendance_records" }], suggestedDestination: "attendance", limitations: ["The answer reflects recorded attendance data available to NSOS."] };
  }
  if (resolveSchoolOperatorQuestionTopic(normalized) === "admissions") {
    return { question, answer: `There are ${workspace.dashboard.pendingAdmissions} pending admissions in the current school dashboard. Review them in the protected admissions workspace before taking action.`, confidence: "high", evidence: [{ metric: "pending_admissions", value: workspace.dashboard.pendingAdmissions, source: "admissions_applications" }], suggestedDestination: "admissions", limitations: ["This is a current aggregate count, not an admissions prediction or recommendation."] };
  }
  if (resolveSchoolOperatorQuestionTopic(normalized) === "finance") {
    return { question, answer: `The current recorded outstanding value is ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(workspace.dashboard.outstanding)}. NSOS does not initiate collection or payment actions from School Intelligence.`, confidence: "high", evidence: [{ metric: "outstanding", value: workspace.dashboard.outstanding, source: "invoices" }], suggestedDestination: "finance", limitations: ["This is the current recorded invoice aggregate; it is not a cash-flow forecast."] };
  }
  if (resolveSchoolOperatorQuestionTopic(normalized) === "health") {
    const attention = workspace.healthSignals.filter(signal => signal.status === "attention").map(signal => signal.label);
    const watch = workspace.healthSignals.filter(signal => signal.status === "watch").map(signal => signal.label);
    const answer = attention.length ? `Current School Health has ${attention.length} area${attention.length === 1 ? "" : "s"} requiring review: ${attention.join(", ")}.${watch.length ? ` Watch areas: ${watch.join(", ")}.` : ""}` : watch.length ? `No School Health area is currently marked for attention. Watch areas: ${watch.join(", ")}.` : "No School Health area is currently marked for attention or watch.";
    return { question, answer, confidence: "high", evidence: workspace.healthSignals.map(signal => ({ metric: signal.id, value: signal.value, source: signal.source })), suggestedDestination: attention.length ? (workspace.healthSignals.find(signal => signal.status === "attention")?.actionDestination ?? "overview") : "overview", limitations: ["Health signals are aggregate review cues, not ratings or predictions."] };
  }
  if (resolveSchoolOperatorQuestionTopic(normalized) === "attention") {
    const queue = workspace.attentionQueue.slice(0, 5);
    const answer = queue.length ? `The current attention queue contains ${queue.length} surfaced open item${queue.length === 1 ? "" : "s"}. The highest-priority item is “${queue[0].title}”. Review it in its protected workspace; NSOS will not execute the action from this answer.` : "There are no open School Intelligence items currently in the attention queue.";
    return { question, answer, confidence: "high", evidence: queue.map(item => ({ metric: item.evidence.metric, value: item.evidence.value, source: item.evidence.source })), suggestedDestination: queue[0]?.actionDestination, limitations: ["Priority is a deterministic review ordering, not a prediction of harm or outcome."] };
  }
  if (resolveSchoolOperatorQuestionTopic(normalized) === "onboarding") {
    return { question, answer: `Institution onboarding is ${workspace.onboarding.completionPercent}% complete. Academy launch readiness currently has ${workspace.launchReadiness.summary.ready} ready, ${workspace.launchReadiness.summary.warning} warning, and ${workspace.launchReadiness.summary.blocked} blocked checks.`, confidence: "high", evidence: [{ metric: "onboarding_completion_percent", value: workspace.onboarding.completionPercent, source: "tenant_onboarding" }, { metric: "launch_ready_checks", value: workspace.launchReadiness.summary.ready, source: "academy_launch_readiness" }], suggestedDestination: "overview", limitations: ["Readiness checks describe configuration evidence only; they are not an approval to launch publicly."] };
  }
  if (resolveSchoolOperatorQuestionTopic(normalized) === "academic") {
    const academic = workspace.insights.find(item => item.evidence.metric === "published_assessment_average_30d");
    return { question, answer: academic ? academic.detail : "NSOS does not currently have enough published assessment comparison data to answer that question. No academic outcome should be inferred from the absence of an insight.", confidence: academic ? "high" : "limited", evidence: academic ? [{ metric: academic.evidence.metric, value: academic.evidence.value, source: academic.evidence.source }] : evidence, suggestedDestination: "learning", limitations: ["NSOS does not infer individual learner performance or risk from aggregate data."] };
  }
  return { question, answer: "I can answer from the current School Intelligence evidence on attendance, admissions, finance, School Health, attention items, onboarding/readiness, and published assessment trends. Ask a specific question in one of those areas.", confidence: "limited", evidence, suggestedDestination: "overview", limitations: ["This version deliberately avoids free-form guessing and unsupported claims."] };
}

export async function getSchoolOperatorWorkspace(schoolId: number) {
  const [profile, workflowPreferences, dashboard, onboarding, commandCenter, insights, launchReadiness, failedAutomation] = await Promise.all([
    getInstitutionOperatingProfile(schoolId),
    getSchoolOperatorWorkflowPreferences(schoolId),
    getDashboardSummary(schoolId),
    getTenantOnboardingStatus(schoolId),
    getOperationsCommandCenter(schoolId),
    listSchoolOperatorInsights(schoolId),
    getAcademyLaunchReadiness(schoolId),
    (async () => (await database()).select({ value: sql<number>`count(*)` }).from(automationJobs).where(and(eq(automationJobs.schoolId, schoolId), eq(automationJobs.status, "failed"))))(),
  ]);
  const healthSignals = buildSchoolOperatorHealthSignals({
    attendanceRate: dashboard.attendanceRate,
    pendingAdmissions: dashboard.pendingAdmissions,
    outstanding: dashboard.outstanding,
    failedEmailCount: commandCenter.communications.email.failedCount,
    failedAutomationJobs: Number(failedAutomation[0]?.value ?? 0),
    onboardingCompletionPercent: onboarding.completionPercent,
  });
  const attentionQueue = prioritizeSchoolOperatorInsights(insights, workflowPreferences.reviewFocus);
  return {
    profile,
    workflowPreferences,
    dashboard,
    onboarding,
    commandCenter,
    insights,
    attentionQueue,
    healthSignals,
    reviewSummary: {
      open: insights.filter(item => item.status === "open").length,
      attention: insights.filter(item => item.status === "open" && item.severity === "attention").length,
      review: insights.filter(item => item.status === "open" && item.severity === "review").length,
      generatedAt: insights.reduce((latest, item) => item.generatedAt > latest ? item.generatedAt : latest, new Date(0)),
    },
    launchReadiness,
    source: "deterministic-v2" as const,
    limitations: ["Insights use current tenant-scoped aggregate records, not forecasts or individual risk labels.", "Health signals are aggregate review cues, not ratings or predictions.", "Workflow preferences only shape this private review experience; they cannot remove confirmation gates, role checks, rate limits, or action boundaries.", "NSOS does not send messages, change academics, finance, ownership, credentials, or public settings from this workspace."],
  };
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