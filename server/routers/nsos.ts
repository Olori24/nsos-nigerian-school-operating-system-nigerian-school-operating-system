import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { sendAdmissionLetterEmail, sendGuardianPortalInvitationEmail, sendStaffSetupInvitationEmail } from "../auth";
import { buildAdmissionLetter } from "../admissionLetter";
import { buildAiSetupPlan } from "../aiOnboardingAgent";
import { generateAiWebsiteDraft } from "../aiWebsiteAgent";
import { buildAutomationPlan, jobCanRun, validateAutomationInput } from "../automationDesk";
import { buildCourseStudioDraft } from "../courseStudio";
import { destinationsForRole, getCopilotGuidance } from "../copilot";
import { buildEnterpriseConciergePlan } from "../enterpriseConcierge";
import { buildSetupAgentAssessment } from "../setupAgent";
import { calculatePercentage, resolveGrade } from "../grade-calculations";
import { listNigerianLgas, listNigerianOriginStates, normaliseNigerianOrigin } from "../nigerianOrigin";
import { can, isManagementRole, schoolRoles, type SchoolRole } from "../roles";
import { platformOwnerProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const schoolInput = z.object({ schoolId: z.number().int().positive() });
const roleInput = z.enum(schoolRoles);

function validatedNigerianOrigin(input: { stateOfOrigin?: string; localGovernmentOfOrigin?: string }) {
  try {
    return normaliseNigerianOrigin(input);
  } catch (error) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Select a valid State and Local Government Area of Origin." });
  }
}

async function accessSchool(userId: number, schoolId: number, permission: string) {
  const membership = await db.getSchoolMembership(userId, schoolId);
  if (!membership || membership.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this school workspace." });
  }
  if (!can(membership.role as SchoolRole, permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your school role does not permit this action." });
  }
  return membership;
}

async function consumeLearningOperationsRate(schoolId: number, userId: number, route: string) {
  const rate = await db.consumeSharedRateLimit({ namespace: "nsos-learning-operations", route, clientKey: `${schoolId}:${userId}`, limit: 18, windowMs: 10 * 60_000 });
  if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Learning operations are taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
}

const managementProcedure = (permission: string) =>
  protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
    const membership = await accessSchool(ctx.user.id, input.schoolId, permission);
    return next({ ctx: { ...ctx, schoolRole: membership.role as SchoolRole } });
  });

const familyPortalProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "portal.read");
  if (membership.role !== "parent" && membership.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "This portal action is available only to linked parents and students." });
  return next({ ctx: { ...ctx, schoolRole: membership.role as "parent" | "student" } });
});

const websiteAdminProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "communications.read");
  if (!isManagementRole(membership.role as SchoolRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Only school owners and administrators can manage the public website or custom domain." });
  return next({ ctx: { ...ctx, schoolRole: membership.role as SchoolRole } });
});

const providerAdminProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "communications.read");
  if (!isManagementRole(membership.role as SchoolRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Only school owners and administrators can configure payment or notification providers." });
  return next({ ctx: { ...ctx, schoolRole: membership.role as SchoolRole } });
});

const onboardingAdminProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "students.read");
  if (!isManagementRole(membership.role as SchoolRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Only school owners and administrators can view tenant onboarding progress." });
  return next({ ctx: { ...ctx, schoolRole: membership.role as SchoolRole } });
});

const studentMigrationAdminProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "students.write");
  if (!isManagementRole(membership.role as SchoolRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Only school owners and administrators can migrate approved student records." });
  return next({ ctx: { ...ctx, schoolRole: membership.role as SchoolRole } });
});

const advertisingAdminProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "communications.read");
  if (!isManagementRole(membership.role as SchoolRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Only school owners and administrators can manage advertising accounts or approve campaign spend." });
  return next({ ctx: { ...ctx, schoolRole: membership.role as SchoolRole } });
});

const aiTutorAdminProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "academics.read");
  if (!isManagementRole(membership.role as SchoolRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Only school owners and administrators can configure supervised AI tutors." });
  return next({ ctx: { ...ctx, schoolRole: membership.role as SchoolRole } });
});

const aiTutorStudentProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "portal.read");
  if (membership.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "AI study tutors are available only through a linked student account." });
  return next({ ctx: { ...ctx, schoolRole: "student" as const } });
});

const aiTutorTeacherProcedure = protectedProcedure.input(schoolInput).use(async ({ ctx, input, next }) => {
  const membership = await accessSchool(ctx.user.id, input.schoolId, "academics.read");
  if (membership.role !== "teacher") throw new TRPCError({ code: "FORBIDDEN", message: "AI tutor adaptation analytics are available only to active teacher accounts." });
  return next({ ctx: { ...ctx, schoolRole: "teacher" as const } });
});

const customDomainInput = z.string().trim().toLowerCase().regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i, "Enter a valid domain name without a protocol or path.").optional();
const admissionTemplateFieldInput = z.enum(["middleName", "dateOfBirth", "placeOfBirth", "nationality", "homeTown", "gender", "residentialAddress", "postalAddress", "priorSchool", "currentClass", "religion", "medicalHistory", "familyDoctor", "guardianOccupation", "guardianOfficeAddress"]);
const feeScheduleInput = z.object({ category: z.string().trim().min(2).max(120), tuitionFee: z.number().positive().max(10_000_000) });
const courseStudioDraftInput = z.object({
  courseTitle: z.string().trim().min(3).max(180),
  courseSummary: z.string().trim().min(50).max(1600),
  deliveryMode: z.enum(["in_person", "live_online", "self_paced", "blended"]),
  durationLabel: z.string().trim().min(2).max(120),
  modules: z.array(z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().min(10).max(1200), learningType: z.enum(["topic", "practical", "project", "practice", "resource"]), milestones: z.array(z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().min(10).max(1000) })).min(1).max(4) })).min(2).max(6),
  materials: z.array(z.object({ title: z.string().trim().min(2).max(180), materialType: z.enum(["facilitator_guide", "practice_activity", "project_brief", "discussion_prompt", "reflection_prompt", "resource_checklist"]), modulePosition: z.number().int().positive().max(6), content: z.string().trim().min(30).max(4500) })).min(2).max(6),
});
const studentMigrationRowInput = z.object({ sourceRow: z.number().int().positive(), admissionNo: z.string().max(64), firstName: z.string().max(120), lastName: z.string().max(120), middleName: z.string().max(120).optional(), dateOfBirth: z.string().max(10).optional(), gender: z.string().max(24).optional(), email: z.string().max(320).optional(), phone: z.string().max(48).optional(), guardianFirstName: z.string().max(120).optional(), guardianLastName: z.string().max(120).optional(), guardianRelationship: z.string().max(80).optional(), guardianEmail: z.string().max(320).optional(), guardianPhone: z.string().max(48).optional() });
const staffMigrationRowInput = z.object({ sourceRow: z.number().int().positive(), employeeNo: z.string().max(48), firstName: z.string().max(120), lastName: z.string().max(120), jobTitle: z.string().max(120), employmentType: z.string().max(24).optional(), email: z.string().max(320).optional(), phone: z.string().max(48).optional(), joinedOn: z.string().max(10).optional(), address: z.string().max(2000).optional() });
const academicMigrationRowInput = z.object({ sourceRow: z.number().int().positive(), kind: z.string().max(16), name: z.string().max(160), code: z.string().max(32).optional(), level: z.string().max(64).optional(), arm: z.string().max(32).optional(), capacity: z.union([z.string().max(8), z.number().int().positive()]).optional(), description: z.string().max(5000).optional() });

export const nsosRouter = router({
  schools: router({
    list: protectedProcedure.query(({ ctx }) => db.listUserSchools(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(3).max(255), shortCode: z.string().min(2).max(32), operatingType: z.enum(["school", "vocational_institute", "coaching_centre", "online_training_provider", "hybrid_learning_provider"]).default("school"), state: z.string().max(100).optional(), email: z.string().email().optional(), phone: z.string().max(48).optional() }))
      .mutation(({ ctx, input }) => db.createSchool({ ...input, shortCode: input.shortCode.trim().toUpperCase(), createdBy: ctx.user.id })),
    context: protectedProcedure.input(schoolInput).query(async ({ ctx, input }) => {
      const membership = await accessSchool(ctx.user.id, input.schoolId, "communications.read");
      return db.getSchoolContext(input.schoolId, membership.role as SchoolRole);
    }),
    invite: managementProcedure("communications.read")
      .input(schoolInput.extend({ userId: z.number().int().positive(), role: roleInput }))
      .mutation(async ({ ctx, input }) => {
        if (!isManagementRole(ctx.schoolRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Only school administrators can assign roles." });
        const result = await db.upsertMembership(input.schoolId, input.userId, input.role);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "school_membership_assigned", targetType: "school_membership", targetId: input.userId, metadata: { assignedRole: input.role } });
        return result;
      }),
  }),

  platformRevenue: router({
    overview: platformOwnerProcedure.query(() => db.getPlatformRevenueOverview()),
    createPlan: platformOwnerProcedure
      .input(z.object({ code: z.string().min(2).max(48), name: z.string().min(2).max(120), description: z.string().max(2000).optional(), monthlyAmount: z.number().min(0).max(100_000_000), annualAmount: z.number().min(0).max(1_000_000_000), studentLimit: z.number().int().positive().max(1_000_000).optional() }))
      .mutation(({ ctx, input }) => db.createSubscriptionPlan({ ...input, createdBy: ctx.user.id })),
    assignSubscription: platformOwnerProcedure
      .input(z.object({ schoolId: z.number().int().positive(), planId: z.number().int().positive().optional(), status: z.enum(["trial", "active", "payment_due", "suspended", "cancelled"]), billingCycle: z.enum(["monthly", "annual", "manual"]), startsAt: z.string().min(10).max(10).optional(), endsAt: z.string().min(10).max(10).optional(), note: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.assignSchoolSubscription({ ...input, assignedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "platform_subscription_assigned", targetType: "school_subscription", metadata: { status: input.status, billingCycle: input.billingCycle, planAssigned: Boolean(input.planId) } });
        return result;
      }),
    issueBillingRecord: platformOwnerProcedure
      .input(z.object({ schoolId: z.number().int().positive(), issueDate: z.string().min(10).max(10), dueDate: z.string().min(10).max(10).optional(), note: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.issuePlatformBillingRecord({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "platform_billing_record_issued", targetType: "platform_billing_record", targetId: result.billingRecordId, metadata: { action: "issued" } });
        return result;
      }),
    recordBillingPayment: platformOwnerProcedure
      .input(z.object({ billingRecordId: z.number().int().positive(), paidAt: z.string().min(10).max(10), paymentMethod: z.enum(["bank_transfer", "card", "manual"]), providerReference: z.string().max(160).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.recordPlatformBillingPayment({ ...input, settledBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: result.schoolId, actorUserId: ctx.user.id, eventType: "platform_billing_record_paid", targetType: "platform_billing_record", targetId: result.billingRecordId, metadata: { paymentMethod: input.paymentMethod, paymentRecorded: true } });
        return result;
      }),
    schoolSubscription: websiteAdminProcedure.input(schoolInput).query(({ input }) => db.getSchoolSubscription(input.schoolId)),
  }),

  website: router({
    config: websiteAdminProcedure.input(schoolInput).query(({ input }) => db.getSchoolWebsite(input.schoolId)),
    media: websiteAdminProcedure.input(schoolInput).query(({ input }) => db.listSchoolWebsiteMedia(input.schoolId)),
    uploadMedia: websiteAdminProcedure
      .input(schoolInput.extend({ purpose: z.enum(["logo", "hero"]), label: z.string().trim().min(2).max(120), fileName: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(80).max(7_100_000) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "website-media", route: "upload", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 8, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Website image uploads are taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const media = await db.uploadSchoolWebsiteMedia({ ...input, uploadedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "school_website_media_uploaded", targetType: "school_website_media", targetId: media.id, metadata: { purpose: media.purpose, mimeType: media.mimeType, byteSize: media.byteSize } });
        return media;
      }),
    save: websiteAdminProcedure
      .input(schoolInput.extend({ headline: z.string().max(255).optional(), introduction: z.string().max(5000).optional(), primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), contactEmail: z.string().email().optional(), contactPhone: z.string().max(48).optional(), campusLocation: z.string().max(255).optional(), customDomain: customDomainInput, admissionsEnabled: z.boolean().optional(), logoMediaId: z.number().int().positive().nullable().optional(), heroMediaId: z.number().int().positive().nullable().optional(), visualTheme: z.enum(["modern", "academic", "community"]).optional(), published: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.saveSchoolWebsite(input);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "school_website_configuration_saved", targetType: "school_website", metadata: { admissionsEnabled: input.admissionsEnabled, published: input.published, customDomainConfigured: Boolean(input.customDomain) } });
        return result;
      }),
    applySetupAgentDraft: websiteAdminProcedure
      .input(schoolInput.extend({ headline: z.string().trim().min(5).max(255), introduction: z.string().trim().min(20).max(5000), primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), contactEmail: z.string().email().optional(), contactPhone: z.string().trim().min(5).max(48).optional(), campusLocation: z.string().trim().min(2).max(255).optional(), admissionsEnabled: z.boolean(), logoMediaId: z.number().int().positive().nullable().optional(), heroMediaId: z.number().int().positive().nullable().optional(), visualTheme: z.enum(["modern", "academic", "community"]).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.saveSchoolWebsite({ schoolId: input.schoolId, headline: input.headline, introduction: input.introduction, primaryColor: input.primaryColor, contactEmail: input.contactEmail, contactPhone: input.contactPhone, campusLocation: input.campusLocation, admissionsEnabled: input.admissionsEnabled, logoMediaId: input.logoMediaId, heroMediaId: input.heroMediaId, visualTheme: input.visualTheme, published: false });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "website_setup_agent_draft_applied", targetType: "school_website", metadata: { appliedAsDraft: true, admissionsEnabled: input.admissionsEnabled, contactEmailProvided: Boolean(input.contactEmail), contactPhoneProvided: Boolean(input.contactPhone), campusLocationProvided: Boolean(input.campusLocation), logoMediaSelected: Boolean(input.logoMediaId), heroMediaSelected: Boolean(input.heroMediaId), visualTheme: input.visualTheme ?? "modern" } });
        return result;
      }),
    generateAgentDraft: websiteAdminProcedure
      .input(schoolInput.extend({ brief: z.string().trim().min(10).max(700) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-ai-agent", route: "website-draft", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 10, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Try another website draft in about ${rate.retryAfterSeconds} seconds.` });
        const { school, website } = await db.getSchoolWebsite(input.schoolId);
        const draft = await generateAiWebsiteDraft({ schoolName: school.name, state: school.state, existingHeadline: website.headline, existingIntroduction: website.introduction, brief: input.brief });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "website_ai_draft_generated", targetType: "school_website", metadata: { generatedAsDraft: true, source: draft.source, requiresConfirmation: true } });
        return draft;
      }),
    verifyDomain: websiteAdminProcedure.input(schoolInput).mutation(async ({ ctx, input }) => {
      const result = await db.verifySchoolWebsiteDomain(input.schoolId);
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "school_domain_verified", targetType: "school_website", metadata: { verification: "active" } });
      return result;
    }),
    publicSite: publicProcedure.input(z.object({ shortCode: z.string().min(2).max(32) })).query(({ input }) => db.getPublicSchoolWebsite(input.shortCode)),
    publicDomain: publicProcedure.input(z.object({ domain: z.string().min(3).max(255) })).query(({ input }) => db.getPublicSchoolWebsiteByDomain(input.domain)),
  }),

  documentTemplates: router({
    get: websiteAdminProcedure.input(schoolInput).query(({ input }) => db.getSchoolDocumentTemplate(input.schoolId)),
    save: websiteAdminProcedure
      .input(schoolInput.extend({ admissionTitle: z.string().trim().min(3).max(160), headerTagline: z.string().trim().max(255).optional(), headerLogoUrl: z.string().trim().url().max(2048).refine(value => new URL(value).protocol === "https:", "Use an HTTPS logo URL.").optional(), headerAddressLine: z.string().trim().max(500).optional(), headerContactLine: z.string().trim().max(500).optional(), admissionFields: z.array(admissionTemplateFieldInput).max(15), declarationText: z.string().trim().max(3000).optional(), requireDeclaration: z.boolean(), requirePassportPhoto: z.boolean(), requireAdmissionFeeReceipt: z.boolean(), termlyFeeTitle: z.string().trim().min(3).max(160), feeSchedule: z.array(feeScheduleInput).min(1).max(24) }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.saveSchoolDocumentTemplate({ ...input, updatedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "school_document_template_saved", targetType: "school_document_template", metadata: { admissionFieldCount: input.admissionFields.length, feeBandCount: input.feeSchedule.length, requiresDeclaration: input.requireDeclaration, requiresPassportPhoto: input.requirePassportPhoto, requiresAdmissionFeeReceipt: input.requireAdmissionFeeReceipt, brandedHeaderConfigured: Boolean(input.headerLogoUrl || input.headerAddressLine || input.headerContactLine) } });
        return result;
      }),
    adoptFeeSchedule: websiteAdminProcedure
      .input(schoolInput.extend({ termId: z.number().int().positive(), classId: z.number().int().positive().optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createDraftFeesFromTemplate(input);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "termly_fee_template_adopted", targetType: "fee_structure", metadata: { termId: input.termId, classScoped: Boolean(input.classId), createdCount: result.createdCount, status: "draft" } });
        return result;
      }),
  }),

  copilot: router({
    ask: protectedProcedure
      .input(schoolInput.extend({ message: z.string().trim().min(2).max(600) }))
      .mutation(async ({ ctx, input }) => {
        const membership = await accessSchool(ctx.user.id, input.schoolId, "communications.read");
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-copilot", route: "navigation", clientKey: String(ctx.user.id), limit: 24, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Copilot is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const role = membership.role as SchoolRole;
        const guidance = await getCopilotGuidance({ role, message: input.message });
        try {
          await db.saveCopilotRecentSearch({ userId: ctx.user.id, schoolId: input.schoolId, query: input.message, destinationId: guidance.destination });
        } catch (error) {
          console.warn("[Copilot] Recent-search persistence failed", error);
        }
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "copilot_navigation_requested", targetType: "copilot_navigation", targetId: guidance.destination ?? undefined, metadata: { source: guidance.source, role, destinationProvided: Boolean(guidance.destination) } });
        return { ...guidance, destinations: destinationsForRole(role).map(destination => ({ id: destination.id, label: destination.label, description: destination.description })) };
      }),
    recent: protectedProcedure
      .input(schoolInput.extend({ limit: z.number().int().min(1).max(12).optional() }))
      .query(async ({ ctx, input }) => {
        await accessSchool(ctx.user.id, input.schoolId, "communications.read");
        return db.listCopilotRecentSearches({ userId: ctx.user.id, schoolId: input.schoolId, limit: input.limit });
      }),
    clearRecent: protectedProcedure
      .input(schoolInput)
      .mutation(async ({ ctx, input }) => {
        await accessSchool(ctx.user.id, input.schoolId, "communications.read");
        const result = await db.clearCopilotRecentSearches({ userId: ctx.user.id, schoolId: input.schoolId });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "copilot_recent_searches_cleared", targetType: "copilot_recent_searches", metadata: { deletedCount: result.deletedCount } });
        return result;
      }),
  }),

  enterpriseConcierge: router({
    plan: protectedProcedure
      .input(schoolInput.extend({ request: z.string().trim().min(2).max(600) }))
      .mutation(async ({ ctx, input }) => {
        const membership = await accessSchool(ctx.user.id, input.schoolId, "communications.read");
        const role = membership.role as SchoolRole;
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-enterprise-concierge", route: "plan", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 18, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The Enterprise Concierge is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const assessment = isManagementRole(role) ? buildSetupAgentAssessment(await db.getTenantOnboardingStatus(input.schoolId)) : undefined;
        const operatingType = await db.getLearningOperatingType(input.schoolId);
        const plan = await buildEnterpriseConciergePlan({ request: input.request, role, assessment, operatingType });
        try {
          await db.saveCopilotRecentSearch({ userId: ctx.user.id, schoolId: input.schoolId, query: input.request, destinationId: plan.action.destination });
        } catch (error) {
          console.warn("[EnterpriseConcierge] Recent-search persistence failed", error);
        }
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "enterprise_concierge_plan_generated", targetType: "enterprise_concierge", targetId: plan.action.id, metadata: { source: plan.source, role, actionKind: plan.action.kind, actionId: plan.action.id, requiresConfirmation: plan.action.requiresConfirmation } });
        return plan;
      }),
  }),

  automationDesk: router({
    jobs: onboardingAdminProcedure.input(schoolInput).query(({ ctx, input }) => db.listAutomationJobs({ schoolId: input.schoolId, userId: ctx.user.id })),
    detail: onboardingAdminProcedure.input(schoolInput.extend({ jobId: z.number().int().positive() })).query(({ ctx, input }) => db.getAutomationJobDetail({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId })),
    create: onboardingAdminProcedure
      .input(schoolInput.extend({ request: z.string().trim().min(2).max(600), idempotencyKey: z.string().trim().min(12).max(96) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-automation-desk", route: "job-create", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 12, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The Automation Desk is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const assessment = buildSetupAgentAssessment(await db.getTenantOnboardingStatus(input.schoolId));
        const operatingType = await db.getLearningOperatingType(input.schoolId);
        const plan = await buildAutomationPlan({ request: input.request, assessment, operatingType });
        const launchInput = plan.jobType === "online_school_launch" && plan.launchDraft ? { draft: { courseTitle: plan.launchDraft.courseTitle, courseSummary: plan.launchDraft.courseSummary, deliveryMode: plan.launchDraft.deliveryMode, durationLabel: plan.launchDraft.durationLabel, modules: plan.launchDraft.modules, materials: plan.launchDraft.materials }, validationMode: "private_configuration_only" as const } : undefined;
        const job = await db.createAutomationJob({ schoolId: input.schoolId, createdBy: ctx.user.id, jobType: plan.jobType, requestSummary: plan.title, plan, input: launchInput, idempotencyKey: input.idempotencyKey });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "automation_job_prepared", targetType: "automation_job", targetId: job.id, metadata: { jobType: plan.jobType, source: plan.source, status: job.status, promptStored: false, requiresConfirmation: true, executable: jobCanRun(plan.jobType), privateLaunch: plan.jobType === "online_school_launch", configurationValidationOnly: plan.jobType === "online_school_launch", publicAction: false, accountCreated: false, messageSent: false, paymentAction: false, credentialIssued: false } });
        return job;
      }),
    saveInput: onboardingAdminProcedure
      .input(schoolInput.extend({ jobId: z.number().int().positive(), input: z.record(z.string(), z.unknown()), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const detail = await db.getAutomationJobDetail({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId });
        if (!jobCanRun(detail.job.jobType)) throw new TRPCError({ code: "BAD_REQUEST", message: "This goal needs its dedicated editable workspace and cannot run as a one-tap automation job." });
        const validated = validateAutomationInput(detail.job.jobType, input.input);
        const job = await db.saveAutomationJobInput({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId, value: validated });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "automation_job_input_reviewed", targetType: "automation_job", targetId: input.jobId, metadata: { jobType: job.jobType, inputStored: true, rawPromptStored: false, confirmationRequired: true } });
        return job;
      }),
    approveAndRun: onboardingAdminProcedure
      .input(schoolInput.extend({ jobId: z.number().int().positive(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-automation-desk", route: "job-run", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 6, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The Automation Desk is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const existing = await db.getAutomationJobDetail({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId });
        if (!jobCanRun(existing.job.jobType)) throw new TRPCError({ code: "BAD_REQUEST", message: "This goal needs its dedicated editable workspace and cannot run as a one-tap automation job." });
        if (existing.job.status === "completed") return existing.job;
        await db.approveAutomationJob({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId });
        await db.claimAutomationJobExecution({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId });
        try {
          const result = await db.executeAutomationJob({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId });
          const job = await db.completeAutomationJob({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId, result });
          await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "automation_job_completed", targetType: "automation_job", targetId: input.jobId, metadata: { jobType: job.jobType, destination: result.destination, referenceCount: result.references.length, confirmationRequired: true, publicAction: false, accountCreated: false, invitationSent: false, feeActivated: false, paymentAction: false, providerChanged: false, credentialIssued: false } });
          return job;
        } catch (error) {
          await db.failAutomationJob({ schoolId: input.schoolId, userId: ctx.user.id, jobId: input.jobId, failureCode: "execution_failed" });
          await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "automation_job_failed", targetType: "automation_job", targetId: input.jobId, metadata: { failureCode: "execution_failed", outcomeConfirmed: false, automaticRetry: false } });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? `${error.message} Review the target workspace before attempting a new job.` : "The automation job stopped. Review the target workspace before attempting a new job." });
        }
      }),
  }),

  setupAgent: router({
    assess: onboardingAdminProcedure.input(schoolInput).query(async ({ input }) => buildSetupAgentAssessment(await db.getTenantOnboardingStatus(input.schoolId))),
    plan: onboardingAdminProcedure
      .input(schoolInput.extend({ request: z.string().trim().min(2).max(600) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-ai-agent", route: "onboarding-plan", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 16, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The AI onboarding agent is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const assessment = buildSetupAgentAssessment(await db.getTenantOnboardingStatus(input.schoolId));
        const plan = await buildAiSetupPlan({ request: input.request, assessment });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "ai_onboarding_plan_generated", targetType: "setup_agent", targetId: plan.recommendedActionId, metadata: { source: plan.source, recommendedActionId: plan.recommendedActionId, requiresConfirmation: true } });
        return plan;
      }),
    history: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.listCopilotSetupAgentHistory(input.schoolId)),
    staffInvitations: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.listCopilotSetupAgentStaffInvitations(input.schoolId)),
    financeDrafts: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.listCopilotSetupAgentFinanceDrafts(input.schoolId)),
    applyAcademicFoundation: onboardingAdminProcedure
      .input(schoolInput.extend({ sessionName: z.string().trim().min(3).max(64), sessionStartsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), sessionEndsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), termName: z.string().trim().min(3).max(64), termStartsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), termEndsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), classes: z.array(z.object({ name: z.string().trim().min(2).max(120), level: z.string().trim().max(64).optional() })).min(1).max(30), templateId: z.enum(["basic_primary", "basic_junior_secondary", "senior_secondary_review"]), includeOptional: z.boolean().default(false), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-setup-agent", route: "academic-foundation", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 6, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The setup agent is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        return db.runCopilotSetupAgentAcademicFoundation({ ...input, executedBy: ctx.user.id });
      }),
    prepareStaffInvitation: onboardingAdminProcedure
      .input(schoolInput.extend({ firstName: z.string().trim().min(1).max(120), lastName: z.string().trim().min(1).max(120), email: z.string().trim().email().max(320), employeeNo: z.string().trim().min(2).max(48), jobTitle: z.string().trim().min(2).max(120), role: z.enum(["admin", "staff", "teacher", "finance"]), employmentType: z.enum(["full_time", "part_time", "contract", "temporary"]).default("full_time"), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-setup-agent", route: "staff-invitation-prepare", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 8, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The setup agent is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        return db.prepareCopilotSetupAgentStaffInvitation({ ...input, preparedBy: ctx.user.id });
      }),
    sendStaffInvitation: onboardingAdminProcedure
      .input(schoolInput.extend({ invitationId: z.number().int().positive(), origin: z.string().trim().min(1).max(512), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-setup-agent", route: "staff-invitation-send", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 5, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The setup agent is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const invitation = await db.claimCopilotSetupAgentStaffInvitationForDelivery({ schoolId: input.schoolId, invitationId: input.invitationId });
        try {
          await sendStaffSetupInvitationEmail({ email: invitation.email, schoolName: invitation.schoolName, role: invitation.role, jobTitle: invitation.jobTitle, origin: input.origin });
          return await db.markCopilotSetupAgentStaffInvitationSent({ schoolId: input.schoolId, invitationId: input.invitationId, sentBy: ctx.user.id });
        } catch (error) {
          await db.releaseCopilotSetupAgentStaffInvitationDelivery({ schoolId: input.schoolId, invitationId: input.invitationId });
          throw error;
        }
      }),
    prepareFinanceDraft: onboardingAdminProcedure
      .input(schoolInput.extend({ name: z.string().trim().min(2).max(255), amount: z.number().positive().max(10_000_000), termId: z.number().int().positive().optional(), classId: z.number().int().positive().optional(), mandatory: z.boolean().default(true), dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-setup-agent", route: "finance-draft-prepare", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 8, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The setup agent is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        return db.prepareCopilotSetupAgentFinanceDraft({ ...input, preparedBy: ctx.user.id });
      }),
    activateFinanceDraft: onboardingAdminProcedure
      .input(schoolInput.extend({ feeStructureId: z.number().int().positive(), approvalNote: z.string().trim().max(160).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "nsos-setup-agent", route: "finance-draft-activate", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 6, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The setup agent is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        return db.activateCopilotSetupAgentFinanceDraft({ schoolId: input.schoolId, feeStructureId: input.feeStructureId, approvedBy: ctx.user.id, approvalNote: input.approvalNote });
      }),
  }),

  learningOperations: router({
    workspace: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.getLearningOperationsWorkspace(input.schoolId)),
    courseStudio: onboardingAdminProcedure
      .input(schoolInput.extend({ brief: z.string().trim().min(12).max(700), audience: z.string().trim().min(2).max(220), deliveryMode: z.enum(["in_person", "live_online", "self_paced", "blended"]).optional(), durationPreference: z.string().trim().max(120).optional() }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "course-studio-prepare");
        const operatingType = await db.getLearningOperatingType(input.schoolId);
        const draft = await buildCourseStudioDraft({ brief: input.brief, audience: input.audience, deliveryMode: input.deliveryMode, durationPreference: input.durationPreference, operatingType });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "course_studio_draft_prepared", targetType: "learning_programme_draft", metadata: { operatingType, source: draft.source, moduleCount: draft.modules.length, materialCount: draft.materials.length, promptStored: false, persisted: false, publicCoursePublished: false, accountCreated: false, enrollmentCreated: false, messageSent: false, paymentAction: false, credentialIssued: false } });
        return draft;
      }),
    applyCourseStudioDraft: onboardingAdminProcedure
      .input(schoolInput.extend({ draft: courseStudioDraftInput, confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "course-studio-apply");
        const result = await db.applyCourseStudioDraft({ schoolId: input.schoolId, createdBy: ctx.user.id, draft: input.draft });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "course_studio_draft_applied", targetType: "learning_program", targetId: result.programId, metadata: { moduleCount: result.moduleCount, milestoneCount: result.milestoneCount, materialCount: result.materialCount, confirmationRequired: true, publicCoursePublished: false, accountCreated: false, enrollmentCreated: false, messageSent: false, paymentAction: false, automaticCompletion: false, credentialIssued: false } });
        return result;
      }),
    setOperatingType: onboardingAdminProcedure
      .input(schoolInput.extend({ operatingType: z.enum(["school", "vocational_institute", "coaching_centre", "online_training_provider", "hybrid_learning_provider"]), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "operating-type");
        const result = await db.updateLearningOperatingType(input);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_operating_type_updated", targetType: "learning_organisation", metadata: { operatingType: input.operatingType, confirmationRequired: true } });
        return result;
      }),
    createProgram: onboardingAdminProcedure
      .input(schoolInput.extend({ title: z.string().trim().min(3).max(180), code: z.string().trim().max(48).optional(), description: z.string().trim().max(4000).optional(), deliveryMode: z.enum(["in_person", "live_online", "self_paced", "blended"]), durationLabel: z.string().trim().max(120).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "program-create");
        const result = await db.createLearningProgram({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_draft_created", targetType: "learning_program", targetId: result.programId, metadata: { deliveryMode: input.deliveryMode, codeProvided: Boolean(input.code), descriptionProvided: Boolean(input.description), confirmationRequired: true } });
        return result;
      }),
    activateProgram: onboardingAdminProcedure
      .input(schoolInput.extend({ programId: z.number().int().positive(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "program-activate");
        const result = await db.activateLearningProgram({ schoolId: input.schoolId, programId: input.programId, activatedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_activated", targetType: "learning_program", targetId: input.programId, metadata: { confirmationRequired: true, publicPublication: false, paymentCollection: false } });
        return result;
      }),
    createCurriculumModule: onboardingAdminProcedure
      .input(schoolInput.extend({ programId: z.number().int().positive(), title: z.string().trim().min(2).max(180), code: z.string().trim().max(48).optional(), description: z.string().trim().max(4000).optional(), learningType: z.enum(["topic", "practical", "project", "practice", "resource"]), sortOrder: z.number().int().positive().max(10_000), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "curriculum-module-create");
        const result = await db.createProgramCurriculumModule({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_curriculum_module_draft_created", targetType: "program_curriculum_module", targetId: result.moduleId, metadata: { programId: input.programId, learningType: input.learningType, order: input.sortOrder, descriptionProvided: Boolean(input.description), confirmationRequired: true, publicCoursePublished: false, accountCreated: false, messageSent: false, credentialIssued: false } });
        return result;
      }),
    activateCurriculumModule: onboardingAdminProcedure
      .input(schoolInput.extend({ moduleId: z.number().int().positive(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "curriculum-module-activate");
        const result = await db.activateProgramCurriculumModule({ schoolId: input.schoolId, moduleId: input.moduleId, activatedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_curriculum_module_activated", targetType: "program_curriculum_module", targetId: input.moduleId, metadata: { confirmationRequired: true, publicCoursePublished: false, credentialIssued: false } });
        return result;
      }),
    createCurriculumMilestone: onboardingAdminProcedure
      .input(schoolInput.extend({ programId: z.number().int().positive(), moduleId: z.number().int().positive(), title: z.string().trim().min(2).max(180), description: z.string().trim().max(4000).optional(), sortOrder: z.number().int().positive().max(10_000), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "curriculum-milestone-create");
        const result = await db.createProgramCurriculumMilestone({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_curriculum_milestone_draft_created", targetType: "program_curriculum_milestone", targetId: result.milestoneId, metadata: { programId: input.programId, moduleId: input.moduleId, order: input.sortOrder, descriptionProvided: Boolean(input.description), confirmationRequired: true, learnerProgressCreated: false, credentialIssued: false } });
        return result;
      }),
    activateCurriculumMilestone: onboardingAdminProcedure
      .input(schoolInput.extend({ milestoneId: z.number().int().positive(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "curriculum-milestone-activate");
        const result = await db.activateProgramCurriculumMilestone({ schoolId: input.schoolId, milestoneId: input.milestoneId, activatedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_curriculum_milestone_activated", targetType: "program_curriculum_milestone", targetId: input.milestoneId, metadata: { confirmationRequired: true, learnerProgressCreated: false, credentialIssued: false } });
        return result;
      }),
    recordMilestoneProgress: onboardingAdminProcedure
      .input(schoolInput.extend({ enrollmentId: z.number().int().positive(), milestoneId: z.number().int().positive(), status: z.enum(["not_started", "in_progress", "reviewed_complete"]), note: z.string().trim().max(500).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "milestone-progress-record");
        const result = await db.recordProgramMilestoneProgress({ schoolId: input.schoolId, enrollmentId: input.enrollmentId, milestoneId: input.milestoneId, status: input.status, note: input.note, updatedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_curriculum_milestone_progress_reviewed", targetType: "program_milestone_progress", targetId: input.milestoneId, metadata: { enrollmentId: input.enrollmentId, status: input.status, noteProvided: Boolean(input.note), confirmationRequired: true, automaticCompletion: false, credentialIssued: false, messageSent: false } });
        return result;
      }),
    createCohort: onboardingAdminProcedure
      .input(schoolInput.extend({ programId: z.number().int().positive(), name: z.string().trim().min(2).max(160), startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), deliveryReference: z.string().trim().max(255).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "cohort-create");
        const result = await db.createProgramCohort({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_cohort_created", targetType: "program_cohort", targetId: result.cohortId, metadata: { programId: input.programId, datesProvided: Boolean(input.startsOn || input.endsOn), deliveryReferenceProvided: Boolean(input.deliveryReference), confirmationRequired: true } });
        return result;
      }),
    assignInstructor: onboardingAdminProcedure
      .input(schoolInput.extend({ programId: z.number().int().positive(), cohortId: z.number().int().positive().optional(), staffId: z.number().int().positive(), assignmentRole: z.enum(["lead", "assistant"]), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "instructor-assign");
        const result = await db.assignProgramInstructor({ ...input, assignedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_instructor_assigned", targetType: "program_instructor_assignment", targetId: result.assignmentId, metadata: { programId: input.programId, cohortScoped: Boolean(input.cohortId), assignmentRole: input.assignmentRole, confirmationRequired: true, accountCreated: false } });
        return result;
      }),
    enrolLearner: onboardingAdminProcedure
      .input(schoolInput.extend({ programId: z.number().int().positive(), cohortId: z.number().int().positive().optional(), studentId: z.number().int().positive(), enrolledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "learner-enrol");
        const result = await db.enrolLearnerInProgram({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_learner_enrolled", targetType: "program_enrollment", targetId: result.enrollmentId, metadata: { programId: input.programId, cohortScoped: Boolean(input.cohortId), confirmationRequired: true, accountCreated: false, invitationSent: false } });
        return result;
      }),
    confirmCompletion: onboardingAdminProcedure
      .input(schoolInput.extend({ enrollmentId: z.number().int().positive(), completionNote: z.string().trim().max(500).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "completion-confirm");
        const result = await db.confirmProgramCompletion({ schoolId: input.schoolId, enrollmentId: input.enrollmentId, completionNote: input.completionNote, confirmedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_completion_confirmed", targetType: "program_enrollment", targetId: input.enrollmentId, metadata: { completionNoteProvided: Boolean(input.completionNote), confirmationRequired: true, credentialIssued: false } });
        return result;
      }),
    recordAttendance: onboardingAdminProcedure
      .input(schoolInput.extend({ enrollmentId: z.number().int().positive(), attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), status: z.enum(["present", "late", "absent", "excused"]), note: z.string().trim().max(500).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "attendance-record");
        const result = await db.recordProgramAttendance({ schoolId: input.schoolId, enrollmentId: input.enrollmentId, attendanceDate: input.attendanceDate, status: input.status, note: input.note, recordedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_attendance_recorded", targetType: "program_enrollment", targetId: input.enrollmentId, metadata: { attendanceDate: input.attendanceDate, status: input.status, noteProvided: Boolean(input.note), confirmationRequired: true } });
        return result;
      }),
    createFeeStructure: onboardingAdminProcedure
      .input(schoolInput.extend({ programId: z.number().int().positive(), cohortId: z.number().int().positive().optional(), name: z.string().trim().min(2).max(180), amount: z.number().positive().max(100_000_000), mandatory: z.boolean(), dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "fee-structure-create");
        const result = await db.createProgramFeeStructure({ schoolId: input.schoolId, programId: input.programId, cohortId: input.cohortId, name: input.name, amount: input.amount.toFixed(2), mandatory: input.mandatory, dueOn: input.dueOn, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_fee_structure_draft_created", targetType: "program_fee_structure", targetId: result.feeStructureId, metadata: { programId: input.programId, cohortScoped: Boolean(input.cohortId), mandatory: input.mandatory, dueDateProvided: Boolean(input.dueOn), confirmationRequired: true, invoiceCreated: false, paymentCollection: false } });
        return result;
      }),
    activateFeeStructure: onboardingAdminProcedure
      .input(schoolInput.extend({ feeStructureId: z.number().int().positive(), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await consumeLearningOperationsRate(input.schoolId, ctx.user.id, "fee-structure-activate");
        const result = await db.activateProgramFeeStructure({ schoolId: input.schoolId, feeStructureId: input.feeStructureId, activatedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "learning_program_fee_structure_activated", targetType: "program_fee_structure", targetId: input.feeStructureId, metadata: { confirmationRequired: true, invoiceCreated: false, paymentCollection: false } });
        return result;
      }),
  }),

  providers: router({
    list: providerAdminProcedure.input(schoolInput).query(({ input }) => db.listProviderConfigurations(input.schoolId)),
    emailReadiness: providerAdminProcedure.input(schoolInput).query(({ input }) => db.getEmailServiceReadiness(input.schoolId)),
    save: providerAdminProcedure.input(schoolInput.extend({ channel: z.enum(["payment", "sms", "whatsapp", "email", "in_app"]), provider: z.enum(["paystack", "flutterwave", "stripe", "manual", "termii", "twilio", "resend", "sendgrid", "whatsapp_cloud", "in_app"]), status: z.enum(["draft", "ready", "disabled"]), configuration: z.record(z.string(), z.unknown()).default({}), credentials: z.object({ apiKey: z.string().max(500).optional(), secretKey: z.string().max(500).optional(), webhookSecret: z.string().max(500).optional() }).optional(), clearCredentials: z.boolean().optional() }))
      .mutation(({ ctx, input }) => db.saveProviderConfiguration({ ...input, configuredBy: ctx.user.id })),
    testConnection: providerAdminProcedure.input(schoolInput.extend({ channel: z.enum(["payment", "sms", "whatsapp", "email", "in_app"]) })).mutation(({ input }) => db.testProviderConnection(input.schoolId, input.channel)),
    webhookUrls: providerAdminProcedure.input(schoolInput).query(({ input }) => db.getSmsDeliveryWebhookUrls(input.schoolId)),
    sendTestSms: providerAdminProcedure.input(schoolInput.extend({ to: z.string().min(7).max(24), confirmed: z.literal(true) })).mutation(({ ctx, input }) => db.sendProviderSmsTest({ ...input, createdBy: ctx.user.id })),
    checkTestSmsDelivery: providerAdminProcedure.input(schoolInput.extend({ messageLogId: z.number().int().positive() })).mutation(({ input }) => db.checkProviderSmsTestDelivery(input)),
  }),

  advertising: router({
    workspace: advertisingAdminProcedure.input(schoolInput).query(({ input }) => db.getAdvertisingWorkspace(input.schoolId)),
    generateCopy: advertisingAdminProcedure
      .input(schoolInput.extend({ objective: z.enum(["lead_generation", "website_visits", "awareness"]), audienceSummary: z.object({ locations: z.array(z.string().trim().min(2).max(120)).min(1).max(12), ageMin: z.number().int().min(18).max(64).optional(), ageMax: z.number().int().min(18).max(65).optional(), note: z.string().trim().max(500).optional() }).refine(value => !value.ageMin || !value.ageMax || value.ageMax >= value.ageMin, "Audience maximum age must not be lower than the minimum."), guidance: z.string().trim().max(600).optional() }))
      .mutation(async ({ ctx, input }) => {
        const limit = await db.consumeSharedRateLimit({ namespace: "advertising", route: "copy-generate", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 12, windowMs: 10 * 60_000 });
        if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Try another AI copy suggestion in about ${limit.retryAfterSeconds} seconds.` });
        const result = await db.generateAdvertisingCopySuggestions(input);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_ai_copy_generated", targetType: "advertising_campaign_draft", metadata: { objective: input.objective, locationCount: input.audienceSummary.locations.length, suggestionCount: result.suggestions.length, requiresReview: result.requiresReview, publishingAction: result.publishingAction } });
        return result;
      }),
    saveMetaAccount: advertisingAdminProcedure
      .input(schoolInput.extend({ accountName: z.string().trim().min(2).max(160), externalAccountId: z.string().trim().min(3).max(100), accessToken: z.string().trim().min(20).max(2000).optional(), clearAccessToken: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const account = await db.saveMetaAdvertisingAccount({ ...input, connectedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: input.clearAccessToken ? "advertising_meta_access_cleared" : "advertising_meta_account_saved", targetType: "advertising_account", targetId: account.id ?? undefined, metadata: { provider: "meta", accountConfigured: true, accessTokenState: input.clearAccessToken ? "cleared" : input.accessToken ? "updated" : "retained" } });
        return account;
      }),
    testMetaAccount: advertisingAdminProcedure.input(schoolInput).mutation(async ({ ctx, input }) => {
      const limit = await db.consumeSharedRateLimit({ namespace: "advertising", route: "meta-account-test", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 5, windowMs: 10 * 60_000 });
      if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Try the Meta connection test again in about ${limit.retryAfterSeconds} seconds.` });
      const result = await db.testMetaAdvertisingAccount(input.schoolId);
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_meta_account_tested", targetType: "advertising_account", metadata: { provider: "meta", verified: result.ok } });
      return result;
    }),
    createCampaign: advertisingAdminProcedure
      .input(schoolInput.extend({ name: z.string().trim().min(3).max(160), objective: z.enum(["lead_generation", "website_visits", "awareness"]), destinationUrl: z.string().trim().url().max(2048).optional(), facebookPageId: z.string().trim().regex(/^\d{3,80}$/, "Enter the numeric Facebook Page ID.").optional(), creativeImageUrl: z.string().trim().url().max(2048).refine(value => new URL(value).protocol === "https:", "Use an HTTPS creative image URL.").optional(), primaryText: z.string().trim().min(5).max(5000), headline: z.string().trim().min(3).max(255), callToAction: z.enum(["learn_more", "apply_now", "contact_us"]), audienceSummary: z.object({ locations: z.array(z.string().trim().min(2).max(120)).min(1).max(12), ageMin: z.number().int().min(18).max(64).optional(), ageMax: z.number().int().min(18).max(65).optional(), note: z.string().trim().max(500).optional() }).refine(value => !value.ageMin || !value.ageMax || value.ageMax >= value.ageMin, "Audience maximum age must not be lower than the minimum."), dailyBudget: z.number().positive().max(10_000_000), totalBudget: z.number().positive().max(100_000_000), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional() }))
      .mutation(async ({ ctx, input }) => {
        const limit = await db.consumeSharedRateLimit({ namespace: "advertising", route: "campaign-create", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 30, windowMs: 10 * 60_000 });
        if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `You have reached the campaign-draft limit. Try again in about ${limit.retryAfterSeconds} seconds.` });
        const result = await db.createAdvertisingCampaign({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_campaign_draft_created", targetType: "advertising_campaign", targetId: result.campaignId, metadata: { provider: "meta", objective: input.objective, dailyBudget: input.dailyBudget, totalBudget: input.totalBudget, accountConnected: result.accountConnected } });
        return result;
      }),
    submitForApproval: advertisingAdminProcedure.input(schoolInput.extend({ campaignId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await db.requestAdvertisingCampaignApproval(input);
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_campaign_submitted_for_approval", targetType: "advertising_campaign", targetId: input.campaignId, metadata: { provider: "meta", status: result.status } });
      return result;
    }),
    approveCampaign: advertisingAdminProcedure.input(schoolInput.extend({ campaignId: z.number().int().positive(), confirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
      const result = await db.approveAdvertisingCampaign({ schoolId: input.schoolId, campaignId: input.campaignId, approvedBy: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_campaign_spend_approved", targetType: "advertising_campaign", targetId: input.campaignId, metadata: { provider: "meta", status: result.status, explicitConfirmation: true } });
      return result;
    }),
    preparePausedMetaCampaign: advertisingAdminProcedure.input(schoolInput.extend({ campaignId: z.number().int().positive(), confirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
      const result = await db.preparePausedMetaCampaign({ schoolId: input.schoolId, campaignId: input.campaignId, launchedBy: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_meta_campaign_prepared_paused", targetType: "advertising_campaign", targetId: input.campaignId, metadata: { provider: "meta", status: result.status, externalCampaignPrepared: true, activeAdvertCreated: false } });
      return result;
    }),
    preparePausedMetaDelivery: advertisingAdminProcedure.input(schoolInput.extend({ campaignId: z.number().int().positive(), confirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
      const result = await db.preparePausedMetaDelivery({ schoolId: input.schoolId, campaignId: input.campaignId, preparedBy: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_meta_delivery_prepared_paused", targetType: "advertising_campaign", targetId: input.campaignId, metadata: { provider: "meta", status: result.status, externalAdPrepared: true, activeAdvertCreated: false } });
      return result;
    }),
    activateMetaAd: advertisingAdminProcedure.input(schoolInput.extend({ campaignId: z.number().int().positive(), confirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
      const result = await db.setMetaAdvertisingAdStatus({ schoolId: input.schoolId, campaignId: input.campaignId, status: "ACTIVE", changedBy: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_meta_ad_activated", targetType: "advertising_campaign", targetId: input.campaignId, metadata: { provider: "meta", status: result.status, explicitConfirmation: true, spendMayBegin: true } });
      return result;
    }),
    pauseMetaAd: advertisingAdminProcedure.input(schoolInput.extend({ campaignId: z.number().int().positive(), confirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
      const result = await db.setMetaAdvertisingAdStatus({ schoolId: input.schoolId, campaignId: input.campaignId, status: "PAUSED", changedBy: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_meta_ad_paused", targetType: "advertising_campaign", targetId: input.campaignId, metadata: { provider: "meta", status: result.status, explicitConfirmation: true, spendStopped: true } });
      return result;
    }),
    syncMetaCampaign: advertisingAdminProcedure.input(schoolInput.extend({ campaignId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await db.syncMetaAdvertisingCampaign(input);
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "advertising_meta_ad_status_synced", targetType: "advertising_campaign", targetId: input.campaignId, metadata: { provider: "meta", status: result.status, providerStatus: result.providerStatus } });
      return result;
    }),
  }),

  aiTutors: router({
    workspace: aiTutorAdminProcedure.input(schoolInput).query(({ input }) => db.getAiTutorWorkspace(input.schoolId)),
    create: aiTutorAdminProcedure.input(schoolInput.extend({ subjectId: z.number().int().positive(), name: z.string().trim().min(3).max(120), curriculumScope: z.string().trim().min(30).max(3000), allowedLevels: z.array(z.string().trim().min(2).max(80)).min(1).max(12), supervisorUserId: z.number().int().positive(), dailyQuestionLimit: z.number().int().min(1).max(50).default(20) })).mutation(async ({ ctx, input }) => {
      const result = await db.createAiTutor({ ...input, createdBy: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "ai_tutor_created", targetType: "ai_tutor", targetId: result.tutorId, metadata: { subjectId: input.subjectId, supervisorUserId: input.supervisorUserId, status: result.status, dailyQuestionLimit: input.dailyQuestionLimit } });
      return result;
    }),
    setStatus: aiTutorAdminProcedure.input(schoolInput.extend({ tutorId: z.number().int().positive(), status: z.enum(["active", "paused", "retired"]) })).mutation(async ({ ctx, input }) => {
      const result = await db.setAiTutorStatus(input);
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "ai_tutor_status_changed", targetType: "ai_tutor", targetId: input.tutorId, metadata: { status: input.status } });
      return result;
    }),
    studentHub: aiTutorStudentProcedure.input(schoolInput).query(({ ctx, input }) => db.listStudentAiTutors(input.schoolId, ctx.user.id)),
    teacherAnalytics: aiTutorTeacherProcedure.input(schoolInput).query(({ ctx, input }) => db.getTeacherAiTutorAnalytics(input.schoolId, ctx.user.id)),
    ask: aiTutorStudentProcedure.input(schoolInput.extend({ tutorId: z.number().int().positive(), question: z.string().trim().min(3).max(1800) })).mutation(async ({ ctx, input }) => {
      const limit = await db.consumeSharedRateLimit({ namespace: "ai-tutor", route: "study-question", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 12, windowMs: 10 * 60_000 });
      if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Take a short break and try another tutor question in about ${limit.retryAfterSeconds} seconds.` });
      const result = await db.askAiTutor({ ...input, userId: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "ai_tutor_study_response", targetType: "ai_tutor", targetId: input.tutorId, metadata: { needsTeacherSupport: result.needsTeacherSupport, escalationReason: result.escalationReason, adaptationEnabled: result.adaptationEnabled, teachingStyle: result.teachingStyle, conversationStored: false } });
      return result;
    }),
    requestTeacherSupport: aiTutorStudentProcedure.input(schoolInput.extend({ tutorId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await db.requestAiTutorEscalation({ ...input, userId: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "ai_tutor_teacher_support_requested", targetType: "ai_tutor", targetId: input.tutorId, metadata: { conversationStored: false } });
      return result;
    }),
    submitFeedback: aiTutorStudentProcedure.input(schoolInput.extend({ interactionKey: z.string().uuid(), helpfulness: z.enum(["helpful", "partly_helpful", "not_helpful"]), comment: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const limit = await db.consumeSharedRateLimit({ namespace: "ai-tutor", route: "response-feedback", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 20, windowMs: 10 * 60_000 });
      if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Please wait about ${limit.retryAfterSeconds} seconds before sharing more tutor feedback.` });
      const result = await db.submitAiTutorFeedback({ ...input, userId: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "ai_tutor_feedback_submitted", targetType: "ai_tutor_response", targetId: input.interactionKey, metadata: { helpfulness: input.helpfulness, commentStored: Boolean(input.comment?.trim()), conversationStored: false } });
      return result;
    }),
    setTeachingPreference: aiTutorStudentProcedure.input(schoolInput.extend({ tutorId: z.number().int().positive(), adaptationEnabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const result = await db.setAiTutorTeachingPreference({ ...input, userId: ctx.user.id });
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "ai_tutor_teaching_preference_changed", targetType: "ai_tutor", targetId: input.tutorId, metadata: { adaptationEnabled: result.adaptationEnabled, teachingStyle: result.teachingStyle, feedbackCommentsUsed: false } });
      return result;
    }),
  }),

  security: router({
    auditEvents: providerAdminProcedure.input(schoolInput.extend({ limit: z.number().int().min(1).max(100).optional() })).query(({ input }) => db.listSecurityAuditEvents(input.schoolId, input.limit)),
  }),

  dashboard: router({
    summary: managementProcedure("students.read").query(({ input }) => db.getDashboardSummary(input.schoolId)),
  }),

  onboarding: router({
    status: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.getTenantOnboardingStatus(input.schoolId)),
  }),

  operations: router({
    commandCenter: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.getOperationsCommandCenter(input.schoolId)),
  }),

  admissions: router({
    originOptions: publicProcedure.input(z.object({ state: z.string().max(120).optional() })).query(({ input }) => ({ states: listNigerianOriginStates(), lgas: input.state ? listNigerianLgas(input.state) : [] })),
    publicSchool: publicProcedure.input(z.object({ shortCode: z.string().min(2).max(32) })).query(({ input }) => db.getSchoolByCode(input.shortCode)),
    extractBiodata: publicProcedure
      .input(z.object({ upload: z.object({ base64: z.string().min(4).max(5_700_000), fileName: z.string().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]) }) }))
      .mutation(({ input }) => db.extractBiodataFromDocument(input.upload)),
    publicSubmit: publicProcedure
      .input(z.object({ shortCode: z.string().min(2).max(32), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), guardianName: z.string().min(1).max(255), guardianPhone: z.string().min(5).max(48), guardianEmail: z.string().email().optional(), dateOfBirth: z.string().optional(), gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional(), priorSchool: z.string().max(255).optional(), notes: z.string().max(5000).optional(), supplementalData: z.record(z.string().min(1).max(40), z.string().trim().max(1000)).optional(), declarationAccepted: z.boolean().optional(), documents: z.array(z.object({ type: z.enum(["passport_photo", "admission_fee_receipt"]), fileName: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]), base64: z.string().min(4).max(5_600_000) })).max(2).optional() }).superRefine((value, ctx) => { const types = value.documents?.map(document => document.type) ?? []; if (new Set(types).size !== types.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["documents"], message: "Upload only one file for each admissions requirement." }); }))
      .mutation(async ({ input }) => {
        const school = await db.getSchoolByCode(input.shortCode);
        if (!school) throw new TRPCError({ code: "NOT_FOUND", message: "School admissions link was not found." });
        const template = school.admissionTemplate ?? { admissionFields: [], requireDeclaration: false };
        if (template.requireDeclaration && input.declarationAccepted !== true) throw new TRPCError({ code: "BAD_REQUEST", message: "Please confirm the admissions declaration before submitting." });
        const documentTypes = new Set((input.documents ?? []).map(document => document.type));
        if (template.requirePassportPhoto && !documentTypes.has("passport_photo")) throw new TRPCError({ code: "BAD_REQUEST", message: "A passport photograph is required by this school." });
        if (template.requireAdmissionFeeReceipt && !documentTypes.has("admission_fee_receipt")) throw new TRPCError({ code: "BAD_REQUEST", message: "An admission fee receipt is required by this school." });
        const enabledFields = new Set(template.admissionFields);
        const supplementalData = Object.fromEntries(Object.entries(input.supplementalData ?? {}).filter(([key, value]) => enabledFields.has(key as (typeof template.admissionFields)[number]) && typeof value === "string" && value.trim().length > 0));
        const origin = validatedNigerianOrigin({ stateOfOrigin: enabledFields.has("stateOfOrigin") ? supplementalData.stateOfOrigin : undefined, localGovernmentOfOrigin: enabledFields.has("localGovernmentOfOrigin") ? supplementalData.localGovernmentOfOrigin : undefined });
        delete supplementalData.stateOfOrigin;
        delete supplementalData.localGovernmentOfOrigin;
        if (origin.stateOfOrigin) supplementalData.stateOfOrigin = origin.stateOfOrigin;
        if (origin.localGovernmentOfOrigin) supplementalData.localGovernmentOfOrigin = origin.localGovernmentOfOrigin;
        const { shortCode: _shortCode, supplementalData: _supplementalData, declarationAccepted, documents, dateOfBirth: submittedDateOfBirth, gender: submittedGender, priorSchool: submittedPriorSchool, ...application } = input;
        const dateOfBirth = enabledFields.has("dateOfBirth") ? supplementalData.dateOfBirth ?? submittedDateOfBirth : undefined;
        const gender = enabledFields.has("gender") ? supplementalData.gender ?? submittedGender : undefined;
        const priorSchool = enabledFields.has("priorSchool") ? supplementalData.priorSchool ?? submittedPriorSchool : undefined;
        return db.createPublicApplicationWithDocuments({ ...application, schoolId: school.id, dateOfBirth, gender, priorSchool, supplementalData, declarationAccepted: declarationAccepted === true, documents: documents ?? [] });
      }),
    list: managementProcedure("students.read")
      .input(schoolInput.extend({ status: z.enum(["submitted", "under_review", "accepted", "declined", "enrolled"]).optional() }))
      .query(({ input }) => db.listApplications(input.schoolId, input.status)),
    submit: managementProcedure("students.read")
      .input(schoolInput.extend({ firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), guardianName: z.string().min(1).max(255), guardianPhone: z.string().min(5).max(48), guardianEmail: z.string().email().optional(), dateOfBirth: z.string().optional(), gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional(), applyingForClassId: z.number().int().positive().optional(), priorSchool: z.string().max(255).optional(), stateOfOrigin: z.string().max(120).optional(), localGovernmentOfOrigin: z.string().max(120).optional(), notes: z.string().max(5000).optional() }))
      .mutation(({ input }) => { const origin = validatedNigerianOrigin(input); const { stateOfOrigin: _stateOfOrigin, localGovernmentOfOrigin: _localGovernmentOfOrigin, ...application } = input; return db.createApplication({ ...application, supplementalData: Object.fromEntries(Object.entries(origin).filter(([, value]) => Boolean(value))) }); }),
    review: managementProcedure("students.read")
      .input(schoolInput.extend({ applicationId: z.number().int().positive(), status: z.enum(["under_review", "accepted", "declined"]), decisionNote: z.string().max(5000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.reviewApplication(input.applicationId, input.status, input.decisionNote, ctx.user.id);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "admissions_application_reviewed", targetType: "admissions_application", targetId: input.applicationId, metadata: { decision: input.status } });
        return result;
      }),
    documents: managementProcedure("students.read").input(schoolInput.extend({ applicationId: z.number().int().positive() })).query(({ input }) => db.listAdmissionDocuments(input)),
    uploadDocument: managementProcedure("students.read")
      .input(schoolInput.extend({ applicationId: z.number().int().positive(), label: z.string().min(2).max(160), fileName: z.string().min(1).max(180), mimeType: z.string().min(3).max(120), base64: z.string().min(1).max(7_000_000) }))
      .mutation(({ input }) => db.uploadAdmissionDocument(input)),
    reviewDocument: managementProcedure("students.read")
      .input(schoolInput.extend({ documentId: z.number().int().positive(), status: z.enum(["verified", "rejected"]), reviewNote: z.string().max(2000).optional() }))
      .mutation(({ ctx, input }) => db.reviewAdmissionDocument({ ...input, reviewerId: ctx.user.id })),
    enrol: managementProcedure("students.write")
      .input(schoolInput.extend({ applicationId: z.number().int().positive(), admissionNo: z.string().min(2).max(64), classId: z.number().int().positive(), sessionId: z.number().int().positive(), admittedOn: z.string().min(10).max(10) }))
      .mutation(async ({ ctx, input }) => {
        const { admissionLetter, ...enrollment } = await db.enrolApplication(input);
        let letterDelivery: "sent" | "failed" | "not_sent_no_guardian_email" = "not_sent_no_guardian_email";
        let messageLogId: number | undefined;
        if (admissionLetter.guardianEmail) {
          const letter = buildAdmissionLetter(admissionLetter);
          const messageLog = await db.createMessageLog({ schoolId: input.schoolId, channel: "email", audience: "guardians", subject: "Admission letter delivery", body: "Admission letter prepared after confirmed enrollment.", recipientCount: 1, createdBy: ctx.user.id });
          messageLogId = messageLog.messageId;
          try {
            const providerMessageId = await sendAdmissionLetterEmail({ email: admissionLetter.guardianEmail, ...letter });
            await db.updateMessageLogDelivery({ schoolId: input.schoolId, messageId: messageLog.messageId, status: "sent", providerMessageId });
            letterDelivery = "sent";
          } catch {
            await db.updateMessageLogDelivery({ schoolId: input.schoolId, messageId: messageLog.messageId, status: "failed" });
            letterDelivery = "failed";
          }
        }
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "admissions_application_enrolled", targetType: "admissions_application", targetId: input.applicationId, metadata: { outcome: "student_created", biodataTransferred: enrollment.biodataTransferred, guardianLinked: enrollment.guardianLinked, guardianCreated: enrollment.guardianCreated, admissionLetterDelivery: letterDelivery, messageLogCreated: Boolean(messageLogId) } });
        return { ...enrollment, letterDelivery };
      }),
  }),

  students: router({
    list: managementProcedure("students.read").input(schoolInput.extend({ search: z.string().max(120).optional() })).query(({ input }) => db.listStudents(input.schoolId, input.search)),
    migrationPreview: studentMigrationAdminProcedure.input(schoolInput.extend({ classId: z.number().int().positive(), sessionId: z.number().int().positive(), rows: z.array(studentMigrationRowInput).min(1).max(100) })).mutation(({ input }) => db.previewStudentMigration(input)),
    migrationImport: studentMigrationAdminProcedure
      .input(schoolInput.extend({ classId: z.number().int().positive(), sessionId: z.number().int().positive(), admittedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), idempotencyKey: z.string().uuid(), rows: z.array(studentMigrationRowInput).min(1).max(100), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "student-migration", route: "import", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 4, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Student migration is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const { confirmed: _confirmed, ...migration } = input;
        const result = await db.importStudentMigration({ ...migration, importedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "student_migration_completed", targetType: "student_migration_batch", targetId: result.batchId, metadata: { studentCount: result.studentCount, guardianCount: result.guardianCount, idempotent: result.idempotent, confirmationRequired: true } });
        return result;
      }),
    migrationHistory: studentMigrationAdminProcedure.input(schoolInput).query(({ input }) => db.listStudentMigrationBatches(input.schoolId)),
    history: managementProcedure("students.read").input(schoolInput.extend({ studentId: z.number().int().positive() })).query(({ input }) => db.getStudentAcademicHistory(input.schoolId, input.studentId)),
    create: managementProcedure("students.write")
      .input(schoolInput.extend({ admissionNo: z.string().min(2).max(64), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), middleName: z.string().max(120).optional(), dateOfBirth: z.string().optional(), gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional(), email: z.string().email().optional(), phone: z.string().max(48).optional(), stateOfOrigin: z.string().max(120).optional(), localGovernmentOfOrigin: z.string().max(120).optional(), classId: z.number().int().positive(), sessionId: z.number().int().positive(), admittedOn: z.string().min(10).max(10) }))
      .mutation(({ input }) => { const origin = validatedNigerianOrigin(input); const { localGovernmentOfOrigin: _localGovernmentOfOrigin, ...student } = input; return db.createStudent({ ...student, stateOfOrigin: origin.stateOfOrigin, localGovernment: origin.localGovernmentOfOrigin }); }),
    promote: managementProcedure("students.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), toClassId: z.number().int().positive(), sessionId: z.number().int().positive(), note: z.string().max(1000).optional() }))
      .mutation(({ input }) => db.promoteStudent(input)),
    graduate: managementProcedure("students.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), graduationYear: z.number().int().min(2000).max(2100) }))
      .mutation(({ input }) => db.graduateStudent(input.schoolId, input.studentId, input.graduationYear)),
    linkGuardian: managementProcedure("students.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), relationship: z.string().min(2).max(80), email: z.string().email().optional(), phone: z.string().max(48).optional(), isPrimary: z.boolean().optional() }))
      .mutation(({ input }) => db.linkGuardianToStudent(input)),
    guardians: onboardingAdminProcedure
      .input(schoolInput.extend({ studentId: z.number().int().positive() }))
      .query(({ input }) => db.listStudentGuardians(input)),
    updateGuardian: onboardingAdminProcedure
      .input(schoolInput.extend({ studentId: z.number().int().positive(), guardianId: z.number().int().positive(), firstName: z.string().trim().min(1).max(120), lastName: z.string().trim().max(120), relationship: z.string().trim().min(2).max(80), email: z.string().email().optional(), phone: z.string().trim().max(48).optional(), address: z.string().trim().max(2000).optional(), occupation: z.string().trim().max(160).optional(), isPrimary: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.updateStudentGuardian(input);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "student_guardian_updated", targetType: "guardian", targetId: input.guardianId, metadata: { studentId: input.studentId, guardianUpdated: true, primaryContact: input.isPrimary } });
        return result;
      }),
    sendGuardianPortalInvitation: onboardingAdminProcedure
      .input(schoolInput.extend({ studentId: z.number().int().positive(), guardianId: z.number().int().positive(), origin: z.string().trim().min(1).max(512), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "guardian-portal-invitation", route: "send", clientKey: `${input.schoolId}:${ctx.user.id}:${input.guardianId}`, limit: 5, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `The guardian invitation service is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const invitation = await db.createGuardianPortalInvitationForDelivery({ schoolId: input.schoolId, studentId: input.studentId, guardianId: input.guardianId, sentBy: ctx.user.id });
        try {
          await sendGuardianPortalInvitationEmail({ email: invitation.email, schoolName: invitation.schoolName, guardianName: invitation.guardianName, origin: input.origin });
          const result = await db.markGuardianPortalInvitationDelivery({ schoolId: input.schoolId, invitationId: invitation.invitationId, status: "sent" });
          await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "guardian_portal_invitation_sent", targetType: "guardian", targetId: input.guardianId, metadata: { invitationSent: true, confirmationRequired: true } });
          return result;
        } catch (error) {
          await db.markGuardianPortalInvitationDelivery({ schoolId: input.schoolId, invitationId: invitation.invitationId, status: "failed" });
          throw error;
        }
      }),
  }),

  academics: router({
    list: managementProcedure("academics.read").input(schoolInput).query(({ input }) => db.listAcademicData(input.schoolId)),
    migrationPreview: onboardingAdminProcedure.input(schoolInput.extend({ sessionId: z.number().int().positive(), rows: z.array(academicMigrationRowInput).min(1).max(100) })).mutation(({ input }) => db.previewAcademicMigration(input)),
    migrationImport: onboardingAdminProcedure
      .input(schoolInput.extend({ sessionId: z.number().int().positive(), idempotencyKey: z.string().uuid(), rows: z.array(academicMigrationRowInput).min(1).max(100), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "academic-migration", route: "import", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 4, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Academic migration is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const { confirmed: _confirmed, ...migration } = input;
        const result = await db.importAcademicMigration({ ...migration, importedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "academic_migration_completed", targetType: "academic_migration_batch", targetId: result.batchId, metadata: { classCount: result.classCount, subjectCount: result.subjectCount, idempotent: result.idempotent, confirmationRequired: true } });
        return result;
      }),
    migrationHistory: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.listAcademicMigrationBatches(input.schoolId)),
    curriculumTemplates: managementProcedure("academics.read").input(schoolInput).query(() => db.getCurriculumTemplateCatalog()),
    applyNigerianCurriculumTemplate: onboardingAdminProcedure
      .input(schoolInput.extend({ templateId: z.enum(["basic_primary", "basic_junior_secondary", "senior_secondary_review"]), classIds: z.array(z.number().int().positive()).min(1).max(50), includeOptional: z.boolean().default(false) }))
      .mutation(({ ctx, input }) => db.applyNigerianCurriculumTemplate({ ...input, appliedBy: ctx.user.id })),
    importSchemeOfWork: onboardingAdminProcedure
      .input(schoolInput.extend({ classId: z.number().int().positive(), subjectId: z.number().int().positive(), termId: z.number().int().positive(), fileName: z.string().trim().min(5).max(255), mimeType: z.enum(["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]), base64: z.string().min(8).max(2_800_000), rows: z.array(z.object({ weekNo: z.number().int(), topic: z.string().max(255), objectives: z.string().max(5000).optional(), resources: z.string().max(5000).optional() })).min(1).max(60), replaceExisting: z.boolean().default(false) }))
      .mutation(({ ctx, input }) => db.importApprovedSchemeOfWork({ ...input, importedBy: ctx.user.id })),
    teacherSchemeReviews: aiTutorTeacherProcedure.input(schoolInput).query(({ ctx, input }) => db.listTeacherSchemeReviews(input.schoolId, ctx.user.id)),
    schemeRevisionNotifications: aiTutorTeacherProcedure.input(schoolInput).query(({ ctx, input }) => db.listTeacherSchemeRevisionNotifications(input.schoolId, ctx.user.id)),
    markSchemeRevisionNotificationRead: aiTutorTeacherProcedure
      .input(schoolInput.extend({ notificationId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.markTeacherSchemeRevisionNotificationRead({ ...input, userId: ctx.user.id })),
    setSchemeRevisionNotificationPinned: aiTutorTeacherProcedure
      .input(schoolInput.extend({ notificationId: z.number().int().positive(), pinned: z.boolean() }))
      .mutation(({ ctx, input }) => db.setTeacherSchemeRevisionNotificationPinned({ ...input, userId: ctx.user.id })),
    schemeRevisionNotificationsForManagement: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.listSchoolLeaderSchemeRevisionNotifications(input.schoolId)),
    expiredSchemeRevisionRecommendationReport: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.listExpiredBeforeAcknowledgementRecommendationReport(input.schoolId)),
    setSchemeRevisionNotificationRecommended: onboardingAdminProcedure
      .input(schoolInput.extend({ notificationId: z.number().int().positive(), recommended: z.boolean(), recommendationExpiresAt: z.coerce.date().optional().refine(value => !value || value.getTime() > Date.now(), "Recommendation expiry must be in the future.") }))
      .mutation(({ ctx, input }) => db.setSchoolLeaderSchemeRevisionNotificationRecommended({ ...input, userId: ctx.user.id })),
    addSchemeRowInlineComment: aiTutorTeacherProcedure
      .input(schoolInput.extend({ rowId: z.number().int().positive(), anchor: z.enum(["topic", "objectives", "resources"]), body: z.string().trim().min(1).max(1200) }))
      .mutation(({ ctx, input }) => db.addAssignedSchemeRowInlineComment({ ...input, createdByUserId: ctx.user.id })),
    reviewSchemeRow: aiTutorTeacherProcedure
      .input(schoolInput.extend({ rowId: z.number().int().positive(), decision: z.enum(["approved", "returned"]), reviewNote: z.string().trim().max(2000).optional() }))
      .mutation(({ ctx, input }) => db.reviewAssignedSchemeRow({ ...input, reviewedByUserId: ctx.user.id })),
    publishApprovedSchemeImport: onboardingAdminProcedure
      .input(schoolInput.extend({ importId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.publishApprovedSchemeImport({ ...input, publishedBy: ctx.user.id })),
    schemeImportInlineComments: onboardingAdminProcedure
      .input(schoolInput.extend({ importId: z.number().int().positive() }))
      .query(({ input }) => db.listSchemeImportInlineComments(input.schoolId, input.importId)),
    createSession: managementProcedure("academics.write")
      .input(schoolInput.extend({ name: z.string().min(3).max(64), startsOn: z.string().min(10).max(10), endsOn: z.string().min(10).max(10), isCurrent: z.boolean().optional() }))
      .mutation(({ input }) => db.createAcademicSession(input)),
    createTerm: managementProcedure("academics.write")
      .input(schoolInput.extend({ sessionId: z.number().int().positive(), name: z.string().min(3).max(64), startsOn: z.string().min(10).max(10), endsOn: z.string().min(10).max(10), isCurrent: z.boolean().optional() }))
      .mutation(({ input }) => db.createAcademicTerm(input)),
    createClass: managementProcedure("academics.write")
      .input(schoolInput.extend({ name: z.string().min(2).max(120), level: z.string().max(64).optional(), arm: z.string().max(32).optional(), capacity: z.number().int().positive().optional(), sessionId: z.number().int().positive().optional(), classTeacherId: z.number().int().positive().optional() }))
      .mutation(({ input }) => db.createClass(input)),
    createSubject: managementProcedure("academics.write")
      .input(schoolInput.extend({ code: z.string().min(2).max(32), name: z.string().min(2).max(160), departmentId: z.number().int().positive().optional(), description: z.string().max(5000).optional() }))
      .mutation(({ input }) => db.createSubject(input)),
    assignClassSubject: managementProcedure("academics.write")
      .input(schoolInput.extend({ classId: z.number().int().positive(), subjectId: z.number().int().positive(), teacherId: z.number().int().positive().optional() }))
      .mutation(({ input }) => db.assignClassSubject(input)),
    saveTimetable: managementProcedure("academics.write")
      .input(schoolInput.extend({ classId: z.number().int().positive(), subjectId: z.number().int().positive(), teacherId: z.number().int().positive().optional(), dayOfWeek: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]), startsAt: z.string().min(4).max(8), endsAt: z.string().min(4).max(8), room: z.string().max(80).optional() }))
      .mutation(({ input }) => db.createTimetableEntry(input)),
    createLessonPlan: managementProcedure("academics.write")
      .input(schoolInput.extend({ classId: z.number().int().positive(), subjectId: z.number().int().positive(), teacherId: z.number().int().positive(), termId: z.number().int().positive().optional(), weekNo: z.number().int().min(1).max(20), topic: z.string().min(2).max(255), objectives: z.string().max(5000).optional(), resources: z.string().max(5000).optional() }))
      .mutation(({ input }) => db.createLessonPlan(input)),
    createCurriculumMilestone: managementProcedure("academics.write")
      .input(schoolInput.extend({ classSubjectId: z.number().int().positive(), termId: z.number().int().positive().optional(), title: z.string().min(2).max(255), targetWeek: z.number().int().min(1).max(20).optional() }))
      .mutation(({ input }) => db.createCurriculumMilestone(input)),
  }),

  attendance: router({
    list: managementProcedure("attendance.read").input(schoolInput.extend({ attendanceDate: z.string().min(10).max(10).optional(), attendeeType: z.enum(["student", "staff"]).optional() })).query(({ input }) => db.listAttendance(input.schoolId, input)),
    record: managementProcedure("attendance.write")
      .input(schoolInput.extend({ attendeeType: z.enum(["student", "staff"]), studentId: z.number().int().positive().optional(), staffId: z.number().int().positive().optional(), classId: z.number().int().positive().optional(), attendanceDate: z.string().min(10).max(10), status: z.enum(["present", "late", "absent", "excused"]), note: z.string().max(1000).optional() }))
      .mutation(({ ctx, input }) => db.recordAttendance({ ...input, recordedBy: ctx.user.id })),
    absenceAlerts: managementProcedure("attendance.read").input(schoolInput).query(({ input }) => db.getAbsenceAlerts(input.schoolId)),
  }),

  results: router({
    list: managementProcedure("results.read").input(schoolInput).query(({ input }) => db.listResultsData(input.schoolId)),
    createAssessment: managementProcedure("results.write")
      .input(schoolInput.extend({ termId: z.number().int().positive(), classId: z.number().int().positive(), subjectId: z.number().int().positive(), title: z.string().min(2).max(255), assessmentType: z.enum(["assignment", "test", "project", "exam", "practical"]), maximumScore: z.number().positive(), weight: z.number().positive().max(100).optional(), heldOn: z.string().optional() }))
      .mutation(({ ctx, input }) => db.createAssessment({ ...input, createdBy: ctx.user.id })),
    enterScore: managementProcedure("results.write")
      .input(schoolInput.extend({ assessmentId: z.number().int().positive(), studentId: z.number().int().positive(), score: z.number().min(0), comment: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const assessment = await db.getAssessment(input.assessmentId);
        if (!assessment || assessment.schoolId !== input.schoolId) throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found." });
        if (input.score > assessment.maximumScore) throw new TRPCError({ code: "BAD_REQUEST", message: "Score cannot exceed the assessment maximum." });
        const scales = await db.listGradeScales(input.schoolId);
        const percentage = calculatePercentage(input.score, assessment.maximumScore);
        return db.upsertScore({ ...input, enteredBy: ctx.user.id, percentage, grade: resolveGrade(percentage, scales).grade });
      }),
    publish: managementProcedure("results.write")
      .input(schoolInput.extend({ termId: z.number().int().positive(), classId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.publishResults(input.schoolId, input.termId, input.classId, ctx.user.id);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "results_published", targetType: "result_publication", targetId: `${input.termId}:${input.classId}`, metadata: { action: "published" } });
        return result;
      }),
    approve: managementProcedure("results.write")
      .input(schoolInput.extend({ termId: z.number().int().positive(), classId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.approveResults(input.schoolId, input.termId, input.classId, ctx.user.id);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "results_approved", targetType: "result_publication", targetId: `${input.termId}:${input.classId}`, metadata: { action: "approved" } });
        return result;
      }),
    reportCard: managementProcedure("results.read")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), termId: z.number().int().positive() }))
      .query(({ input }) => db.getStudentReportCard(input.schoolId, input.studentId, input.termId)),
  }),

  finance: router({
    list: managementProcedure("finance.read").input(schoolInput).query(({ input }) => db.listFinanceData(input.schoolId)),
    createBankAccount: providerAdminProcedure
      .input(schoolInput.extend({ bankName: z.string().trim().min(2).max(160), accountName: z.string().trim().min(2).max(160), accountNumber: z.string().min(10).max(24), accountType: z.enum(["current", "savings", "corporate", "other"]), status: z.enum(["draft", "active"]).default("draft"), isPrimary: z.boolean().default(false), paymentReferenceGuidance: z.string().trim().max(255).optional() }))
      .mutation(({ ctx, input }) => db.createSchoolBankAccount({ ...input, configuredBy: ctx.user.id })),
    updateBankAccountStatus: providerAdminProcedure
      .input(schoolInput.extend({ bankAccountId: z.number().int().positive(), status: z.enum(["active", "archived"]), isPrimary: z.boolean().optional() }))
      .mutation(({ ctx, input }) => db.updateSchoolBankAccountStatus({ ...input, configuredBy: ctx.user.id })),
    createFee: managementProcedure("finance.write")
      .input(schoolInput.extend({ name: z.string().min(2).max(255), amount: z.number().positive(), termId: z.number().int().positive().optional(), classId: z.number().int().positive().optional(), mandatory: z.boolean().optional(), dueOn: z.string().optional() }))
      .mutation(({ input }) => db.createFeeStructure(input)),
    createInvoice: managementProcedure("finance.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), termId: z.number().int().positive().optional(), issueDate: z.string().min(10).max(10), dueDate: z.string().optional(), lineItems: z.array(z.object({ description: z.string().min(2).max(255), quantity: z.number().int().positive(), unitAmount: z.number().positive(), feeStructureId: z.number().int().positive().optional() })).min(1), discount: z.number().min(0).optional(), note: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createInvoice({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "invoice_created", targetType: "invoice", targetId: result.invoiceId, metadata: { lineItemCount: input.lineItems.length, invoiceCreated: true } });
        return result;
      }),
    recordPayment: managementProcedure("finance.write")
      .input(schoolInput.extend({ invoiceId: z.number().int().positive(), amount: z.number().positive(), paidOn: z.string().min(10).max(10), method: z.enum(["cash", "bank_transfer", "card", "pos", "cheque", "other"]), reference: z.string().max(160).optional(), note: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.recordPayment({ ...input, recordedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "payment_recorded", targetType: "invoice", targetId: input.invoiceId, metadata: { method: input.method, paymentRecorded: true } });
        return result;
      }),
  }),

  cashAssurance: router({
    list: managementProcedure("finance.read").input(schoolInput).query(({ input }) => db.listCashAssuranceData(input.schoolId)),
    openCase: managementProcedure("finance.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), invoiceId: z.number().int().positive(), priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"), assignedTo: z.number().int().positive().optional(), nextActionOn: z.string().min(10).max(10).optional(), note: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.openCashAssuranceCase({ ...input, openedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "cash_assurance_case_opened", targetType: "cash_assurance_case", targetId: result.caseId, metadata: { priority: input.priority, invoiceLinked: true } });
        return result;
      }),
    recordPromise: managementProcedure("finance.write")
      .input(schoolInput.extend({ caseId: z.number().int().positive(), promisedAmount: z.number().positive(), promisedOn: z.string().min(10).max(10), note: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.recordCashAssurancePromise({ ...input, recordedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "cash_assurance_promise_recorded", targetType: "cash_assurance_case", targetId: input.caseId, metadata: { promiseRecorded: true } });
        return result;
      }),
    submitEvidence: managementProcedure("finance.write")
      .input(schoolInput.extend({ caseId: z.number().int().positive(), invoiceId: z.number().int().positive(), amountClaimed: z.number().positive(), source: z.enum(["manual_receipt", "bank_reference", "provider_event", "other"]), providerReference: z.string().max(160).optional(), note: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.submitPaymentEvidence({ ...input, createdBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "cash_assurance_payment_evidence_submitted", targetType: "payment_evidence", targetId: result.evidenceId, metadata: { source: input.source, evidenceSubmitted: true } });
        return result;
      }),
    reviewEvidence: managementProcedure("finance.write")
      .input(schoolInput.extend({ evidenceId: z.number().int().positive(), status: z.enum(["accepted", "rejected"]), linkedPaymentId: z.number().int().positive().optional(), reviewNote: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.reviewPaymentEvidence({ ...input, reviewedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "cash_assurance_payment_evidence_reviewed", targetType: "payment_evidence", targetId: input.evidenceId, metadata: { decision: input.status, ledgerChanged: false } });
        return result;
      }),
    recordDispute: managementProcedure("finance.write")
      .input(schoolInput.extend({ caseId: z.number().int().positive(), note: z.string().min(2).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.recordCashAssuranceDispute({ ...input, recordedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "cash_assurance_dispute_recorded", targetType: "cash_assurance_case", targetId: input.caseId, metadata: { remindersPaused: true } });
        return result;
      }),
    resolveDispute: managementProcedure("finance.write")
      .input(schoolInput.extend({ caseId: z.number().int().positive(), note: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.resolveCashAssuranceDispute({ ...input, resolvedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "cash_assurance_dispute_resolved", targetType: "cash_assurance_case", targetId: input.caseId, metadata: { remindersPaused: false } });
        return result;
      }),
  }),

  staff: router({
    list: managementProcedure("students.read").input(schoolInput).query(({ input }) => db.listStaff(input.schoolId)),
    migrationPreview: onboardingAdminProcedure.input(schoolInput.extend({ rows: z.array(staffMigrationRowInput).min(1).max(100) })).mutation(({ input }) => db.previewStaffMigration(input)),
    migrationImport: onboardingAdminProcedure
      .input(schoolInput.extend({ idempotencyKey: z.string().uuid(), rows: z.array(staffMigrationRowInput).min(1).max(100), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        const rate = await db.consumeSharedRateLimit({ namespace: "staff-migration", route: "import", clientKey: `${input.schoolId}:${ctx.user.id}`, limit: 4, windowMs: 10 * 60_000 });
        if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Staff migration is taking a short break. Try again in about ${rate.retryAfterSeconds} seconds.` });
        const { confirmed: _confirmed, ...migration } = input;
        const result = await db.importStaffMigration({ ...migration, importedBy: ctx.user.id });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "staff_migration_completed", targetType: "staff_migration_batch", targetId: result.batchId, metadata: { staffCount: result.staffCount, idempotent: result.idempotent, confirmationRequired: true, accountCreated: false, invitationSent: false } });
        return result;
      }),
    migrationHistory: onboardingAdminProcedure.input(schoolInput).query(({ input }) => db.listStaffMigrationBatches(input.schoolId)),
    create: managementProcedure("students.write")
      .input(schoolInput.extend({ employeeNo: z.string().min(2).max(48), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), jobTitle: z.string().min(2).max(120), departmentId: z.number().int().positive().optional(), email: z.string().email().optional(), phone: z.string().max(48).optional(), employmentType: z.enum(["full_time", "part_time", "contract", "temporary"]).optional(), joinedOn: z.string().optional() }))
      .mutation(({ input }) => db.createStaff(input)),
    createDepartment: managementProcedure("students.write")
      .input(schoolInput.extend({ name: z.string().min(2).max(120), code: z.string().max(24).optional() }))
      .mutation(({ input }) => db.createDepartment(input)),
    assignDepartment: managementProcedure("students.write")
      .input(schoolInput.extend({ staffId: z.number().int().positive(), departmentId: z.number().int().positive().optional() }))
      .mutation(({ input }) => db.assignStaffDepartment(input.schoolId, input.staffId, input.departmentId)),
    createDuty: managementProcedure("students.write")
      .input(schoolInput.extend({ staffId: z.number().int().positive(), title: z.string().min(2).max(160), description: z.string().max(5000).optional(), startsOn: z.string().optional() }))
      .mutation(({ input }) => db.createStaffDuty(input)),
    operations: managementProcedure("students.read").input(schoolInput).query(({ input }) => db.listStaffOperations(input.schoolId)),
    requestLeave: managementProcedure("students.read")
      .input(schoolInput.extend({ staffId: z.number().int().positive(), leaveType: z.enum(["annual", "sick", "maternity", "paternity", "compassionate", "other"]), startsOn: z.string().min(10).max(10), endsOn: z.string().min(10).max(10), reason: z.string().min(2).max(5000) }))
      .mutation(({ input }) => db.createLeaveRequest(input)),
    reviewLeave: managementProcedure("students.write")
      .input(schoolInput.extend({ leaveId: z.number().int().positive(), status: z.enum(["approved", "declined"]), reviewNote: z.string().max(1000).optional() }))
      .mutation(({ ctx, input }) => db.reviewLeaveRequest(input.leaveId, input.status, input.reviewNote, ctx.user.id)),
    createPayroll: managementProcedure("finance.write")
      .input(schoolInput.extend({ staffId: z.number().int().positive(), periodLabel: z.string().min(3).max(64), grossPay: z.number().positive(), deductions: z.number().min(0).optional() }))
      .mutation(({ input }) => db.createPayrollRecord(input)),
    addPerformanceNote: managementProcedure("students.write")
      .input(schoolInput.extend({ staffId: z.number().int().positive(), title: z.string().min(2).max(255), note: z.string().min(2).max(5000), visibility: z.enum(["private", "shared"]).default("private") }))
      .mutation(({ ctx, input }) => db.createPerformanceNote({ ...input, authorId: ctx.user.id })),
  }),

  communications: router({
    list: managementProcedure("communications.read").input(schoolInput).query(({ input }) => db.listAnnouncements(input.schoolId)),
    create: managementProcedure("communications.read")
      .input(schoolInput.extend({ title: z.string().min(3).max(255), body: z.string().min(3).max(10000), audience: z.enum(["everyone", "staff", "students", "guardians", "class"]), classId: z.number().int().positive().optional(), publish: z.boolean().optional() }))
      .mutation(({ ctx, input }) => db.createAnnouncement({ ...input, createdBy: ctx.user.id })),
    publish: managementProcedure("communications.read")
      .input(schoolInput.extend({ announcementId: z.number().int().positive() }))
      .mutation(({ input }) => db.publishAnnouncement(input.announcementId)),
    logBulkMessage: managementProcedure("communications.read")
      .input(schoolInput.extend({ channel: z.enum(["in_app", "email", "sms", "whatsapp"]), audience: z.enum(["everyone", "staff", "students", "guardians", "class"]), subject: z.string().max(255).optional(), body: z.string().min(2).max(10000), recipientCount: z.number().int().min(0) }))
      .mutation(({ ctx, input }) => db.createMessageLog({ ...input, createdBy: ctx.user.id })),
    history: managementProcedure("communications.read").input(schoolInput).query(({ input }) => db.listMessageLogs(input.schoolId)),
  }),

  portal: router({
    guardian: managementProcedure("portal.read").input(schoolInput).query(({ ctx, input }) => db.getGuardianPortal(input.schoolId, ctx.user.id)),
    student: managementProcedure("portal.read").input(schoolInput).query(({ ctx, input }) => db.getStudentPortal(input.schoolId, ctx.user.id)),
    cashAssurance: familyPortalProcedure.input(schoolInput).query(({ ctx, input }) => db.getFamilyCashAssuranceData({ schoolId: input.schoolId, userId: ctx.user.id, role: ctx.schoolRole })),
    paymentEvidenceNotifications: familyPortalProcedure.input(schoolInput).query(({ ctx, input }) => db.listFamilyPaymentEvidenceNotifications({ schoolId: input.schoolId, userId: ctx.user.id, role: ctx.schoolRole })),
    markPaymentEvidenceNotificationRead: familyPortalProcedure
      .input(schoolInput.extend({ notificationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.markFamilyPaymentEvidenceNotificationRead({ schoolId: input.schoolId, userId: ctx.user.id, role: ctx.schoolRole, notificationId: input.notificationId });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "family_payment_evidence_notification_read", targetType: "payment_evidence", targetId: result.evidenceId, metadata: { notificationAcknowledged: true } });
        return result;
      }),
    submitPaymentEvidence: familyPortalProcedure
      .input(schoolInput.extend({ caseId: z.number().int().positive(), invoiceId: z.number().int().positive(), amountClaimed: z.number().positive(), claimedPaidOn: z.string().min(10).max(10).optional(), source: z.enum(["manual_receipt", "bank_reference", "provider_event", "other"]).default("bank_reference"), providerReference: z.string().max(160).optional(), note: z.string().max(2000).optional(), upload: z.object({ base64: z.string().min(4).max(7_100_000), fileName: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]) }).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.submitFamilyPaymentEvidence({ ...input, userId: ctx.user.id, role: ctx.schoolRole });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "family_payment_evidence_submitted", targetType: "payment_evidence", targetId: result.evidenceId, metadata: { source: input.source, attachmentIncluded: !!input.upload, ledgerChanged: false } });
        return result;
      }),
    scanPaymentEvidence: familyPortalProcedure
      .input(schoolInput.extend({ caseId: z.number().int().positive(), invoiceId: z.number().int().positive(), upload: z.object({ base64: z.string().min(4).max(7_100_000), fileName: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]) }) }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.scanFamilyPaymentEvidence({ ...input, userId: ctx.user.id, role: ctx.schoolRole });
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "family_payment_receipt_scanned", targetType: "cash_assurance_case", targetId: input.caseId, metadata: { fileType: input.upload.mimeType, requiresConfirmation: true, ledgerChanged: false } });
        return result;
      }),
  }),
});
