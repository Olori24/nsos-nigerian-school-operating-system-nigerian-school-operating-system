import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { calculatePercentage, resolveGrade } from "../grade-calculations";
import { can, isManagementRole, schoolRoles, type SchoolRole } from "../roles";
import { platformOwnerProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const schoolInput = z.object({ schoolId: z.number().int().positive() });
const roleInput = z.enum(schoolRoles);

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

const customDomainInput = z.string().trim().toLowerCase().regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i, "Enter a valid domain name without a protocol or path.").optional();

export const nsosRouter = router({
  schools: router({
    list: protectedProcedure.query(({ ctx }) => db.listUserSchools(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(3).max(255), shortCode: z.string().min(2).max(32), state: z.string().max(100).optional(), email: z.string().email().optional(), phone: z.string().max(48).optional() }))
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
    save: websiteAdminProcedure
      .input(schoolInput.extend({ headline: z.string().max(255).optional(), introduction: z.string().max(5000).optional(), primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), contactEmail: z.string().email().optional(), contactPhone: z.string().max(48).optional(), campusLocation: z.string().max(255).optional(), customDomain: customDomainInput, admissionsEnabled: z.boolean().optional(), published: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.saveSchoolWebsite(input);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "school_website_configuration_saved", targetType: "school_website", metadata: { admissionsEnabled: input.admissionsEnabled, published: input.published, customDomainConfigured: Boolean(input.customDomain) } });
        return result;
      }),
    verifyDomain: websiteAdminProcedure.input(schoolInput).mutation(async ({ ctx, input }) => {
      const result = await db.verifySchoolWebsiteDomain(input.schoolId);
      await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "school_domain_verified", targetType: "school_website", metadata: { verification: "active" } });
      return result;
    }),
    publicSite: publicProcedure.input(z.object({ shortCode: z.string().min(2).max(32) })).query(({ input }) => db.getPublicSchoolWebsite(input.shortCode)),
    publicDomain: publicProcedure.input(z.object({ domain: z.string().min(3).max(255) })).query(({ input }) => db.getPublicSchoolWebsiteByDomain(input.domain)),
  }),

  providers: router({
    list: providerAdminProcedure.input(schoolInput).query(({ input }) => db.listProviderConfigurations(input.schoolId)),
    save: providerAdminProcedure.input(schoolInput.extend({ category: z.enum(["payment", "notification"]), provider: z.enum(["paystack", "flutterwave", "stripe", "manual", "termii", "twilio", "resend", "sendgrid", "whatsapp_cloud", "in_app"]), status: z.enum(["draft", "ready", "disabled"]), configuration: z.record(z.string(), z.unknown()).default({}), credentials: z.object({ apiKey: z.string().max(500).optional(), secretKey: z.string().max(500).optional(), webhookSecret: z.string().max(500).optional() }).optional(), clearCredentials: z.boolean().optional() }))
      .mutation(({ ctx, input }) => db.saveProviderConfiguration({ ...input, configuredBy: ctx.user.id })),
    testConnection: providerAdminProcedure.input(schoolInput.extend({ category: z.enum(["payment", "notification"]) })).mutation(({ input }) => db.testProviderConnection(input.schoolId, input.category)),
    webhookUrls: providerAdminProcedure.input(schoolInput).query(({ input }) => db.getSmsDeliveryWebhookUrls(input.schoolId)),
    sendTestSms: providerAdminProcedure.input(schoolInput.extend({ to: z.string().min(7).max(24), confirmed: z.literal(true) })).mutation(({ ctx, input }) => db.sendProviderSmsTest({ ...input, createdBy: ctx.user.id })),
    checkTestSmsDelivery: providerAdminProcedure.input(schoolInput.extend({ messageLogId: z.number().int().positive() })).mutation(({ input }) => db.checkProviderSmsTestDelivery(input)),
  }),

  security: router({
    auditEvents: providerAdminProcedure.input(schoolInput.extend({ limit: z.number().int().min(1).max(100).optional() })).query(({ input }) => db.listSecurityAuditEvents(input.schoolId, input.limit)),
  }),

  dashboard: router({
    summary: managementProcedure("students.read").query(({ input }) => db.getDashboardSummary(input.schoolId)),
  }),

  admissions: router({
    publicSchool: publicProcedure.input(z.object({ shortCode: z.string().min(2).max(32) })).query(({ input }) => db.getSchoolByCode(input.shortCode)),
    publicSubmit: publicProcedure
      .input(z.object({ shortCode: z.string().min(2).max(32), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), guardianName: z.string().min(1).max(255), guardianPhone: z.string().min(5).max(48), guardianEmail: z.string().email().optional(), dateOfBirth: z.string().optional(), gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional(), priorSchool: z.string().max(255).optional(), notes: z.string().max(5000).optional() }))
      .mutation(async ({ input }) => {
        const school = await db.getSchoolByCode(input.shortCode);
        if (!school) throw new TRPCError({ code: "NOT_FOUND", message: "School admissions link was not found." });
        return db.createApplication({ ...input, schoolId: school.id });
      }),
    list: managementProcedure("students.read")
      .input(schoolInput.extend({ status: z.enum(["submitted", "under_review", "accepted", "declined", "enrolled"]).optional() }))
      .query(({ input }) => db.listApplications(input.schoolId, input.status)),
    submit: managementProcedure("students.read")
      .input(schoolInput.extend({ firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), guardianName: z.string().min(1).max(255), guardianPhone: z.string().min(5).max(48), guardianEmail: z.string().email().optional(), dateOfBirth: z.string().optional(), gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional(), applyingForClassId: z.number().int().positive().optional(), priorSchool: z.string().max(255).optional(), notes: z.string().max(5000).optional() }))
      .mutation(({ input }) => db.createApplication(input)),
    review: managementProcedure("students.read")
      .input(schoolInput.extend({ applicationId: z.number().int().positive(), status: z.enum(["under_review", "accepted", "declined"]), decisionNote: z.string().max(5000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.reviewApplication(input.applicationId, input.status, input.decisionNote, ctx.user.id);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "admissions_application_reviewed", targetType: "admissions_application", targetId: input.applicationId, metadata: { decision: input.status } });
        return result;
      }),
    documents: managementProcedure("students.read").input(schoolInput.extend({ applicationId: z.number().int().positive() })).query(({ input }) => db.listAdmissionDocuments(input.applicationId)),
    uploadDocument: managementProcedure("students.read")
      .input(schoolInput.extend({ applicationId: z.number().int().positive(), label: z.string().min(2).max(160), fileName: z.string().min(1).max(180), mimeType: z.string().min(3).max(120), base64: z.string().min(1).max(7_000_000) }))
      .mutation(({ input }) => db.uploadAdmissionDocument(input)),
    reviewDocument: managementProcedure("students.read")
      .input(schoolInput.extend({ documentId: z.number().int().positive(), status: z.enum(["verified", "rejected"]), reviewNote: z.string().max(2000).optional() }))
      .mutation(({ ctx, input }) => db.reviewAdmissionDocument(input.documentId, input.status, input.reviewNote, ctx.user.id)),
    enrol: managementProcedure("students.write")
      .input(schoolInput.extend({ applicationId: z.number().int().positive(), admissionNo: z.string().min(2).max(64), classId: z.number().int().positive(), sessionId: z.number().int().positive(), admittedOn: z.string().min(10).max(10) }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.enrolApplication(input);
        await db.recordSecurityAuditEvent({ schoolId: input.schoolId, actorUserId: ctx.user.id, eventType: "admissions_application_enrolled", targetType: "admissions_application", targetId: input.applicationId, metadata: { outcome: "student_created" } });
        return result;
      }),
  }),

  students: router({
    list: managementProcedure("students.read").input(schoolInput.extend({ search: z.string().max(120).optional() })).query(({ input }) => db.listStudents(input.schoolId, input.search)),
    history: managementProcedure("students.read").input(schoolInput.extend({ studentId: z.number().int().positive() })).query(({ input }) => db.getStudentAcademicHistory(input.schoolId, input.studentId)),
    create: managementProcedure("students.write")
      .input(schoolInput.extend({ admissionNo: z.string().min(2).max(64), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), middleName: z.string().max(120).optional(), dateOfBirth: z.string().optional(), gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional(), email: z.string().email().optional(), phone: z.string().max(48).optional(), classId: z.number().int().positive(), sessionId: z.number().int().positive(), admittedOn: z.string().min(10).max(10) }))
      .mutation(({ input }) => db.createStudent(input)),
    promote: managementProcedure("students.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), toClassId: z.number().int().positive(), sessionId: z.number().int().positive(), note: z.string().max(1000).optional() }))
      .mutation(({ input }) => db.promoteStudent(input)),
    graduate: managementProcedure("students.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), graduationYear: z.number().int().min(2000).max(2100) }))
      .mutation(({ input }) => db.graduateStudent(input.schoolId, input.studentId, input.graduationYear)),
    linkGuardian: managementProcedure("students.write")
      .input(schoolInput.extend({ studentId: z.number().int().positive(), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), relationship: z.string().min(2).max(80), email: z.string().email().optional(), phone: z.string().max(48).optional(), isPrimary: z.boolean().optional() }))
      .mutation(({ input }) => db.linkGuardianToStudent(input)),
  }),

  academics: router({
    list: managementProcedure("academics.read").input(schoolInput).query(({ input }) => db.listAcademicData(input.schoolId)),
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
