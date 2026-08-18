import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import {
  academicSessions,
  academicTerms,
  admissionDocuments,
  admissionsApplications,
  announcements,
  assessments,
  attendanceRecords,
  classes,
  classSubjects,
  curriculumMilestones,
  departments,
  enrollments,
  feeStructures,
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
  providerConfigurations,
  resultPublications,
  schoolMemberships,
  schoolWebsites,
  schools,
  scores,
  staffDuties,
  staffProfiles,
  studentGuardians,
  studentProfiles,
  subjects,
  timetableEntries,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { SchoolRole } from "./roles";
import { storagePut } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) _db = drizzle(process.env.DATABASE_URL);
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

export function providerReadiness(category: ProviderCategory, provider: string, hasCredentials: boolean, status: "draft" | "ready" | "disabled") {
  if (status === "disabled") return "Disabled";
  if (!hasCredentials && provider !== "manual" && provider !== "in_app") return "Credentials required";
  return category === "payment" ? "Ready for payment adapter" : "Ready for notification adapter";
}

export function providerRequiresCredentials(provider: string) {
  return provider !== "manual" && provider !== "in_app";
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
  return (await db.select({ id: schools.id, name: schools.name, shortCode: schools.shortCode, state: schools.state }).from(schools).where(eq(schools.shortCode, shortCode.trim().toUpperCase())).limit(1))[0];
}

export async function createSchool(input: { name: string; shortCode: string; state?: string; email?: string; phone?: string; createdBy: number }) {
  const db = await database();
  const created = await db.insert(schools).values({ ...input, shortCode: input.shortCode.trim().toUpperCase(), currency: "NGN", timezone: "Africa/Lagos" });
  const schoolId = Number(created[0].insertId);
  await db.insert(schoolMemberships).values({ schoolId, userId: input.createdBy, role: "owner", status: "active" });
  return { schoolId };
}

export async function listProviderConfigurations(schoolId: number) {
  const db = await database();
  const rows = await db.select().from(providerConfigurations).where(eq(providerConfigurations.schoolId, schoolId));
  return (["payment", "notification"] as const).map(category => {
    const row = rows.find(item => item.category === category);
    const hasCredentials = Boolean(row?.encryptedCredentials);
    return row
      ? { id: row.id, category, provider: row.provider, status: row.status, configuration: row.configuration as Record<string, unknown>, hasCredentials, readiness: providerReadiness(category, row.provider, hasCredentials, row.status), lastValidatedAt: row.lastValidatedAt, updatedAt: row.updatedAt }
      : { id: null, category, provider: category === "payment" ? "paystack" : "termii", status: "draft" as const, configuration: {}, hasCredentials: false, readiness: "Not configured", lastValidatedAt: null, updatedAt: null };
  });
}

export async function saveProviderConfiguration(input: { schoolId: number; category: ProviderCategory; provider: string; status: "draft" | "ready" | "disabled"; configuration: Record<string, unknown>; credentials?: ProviderCredentials; clearCredentials?: boolean; configuredBy: number }) {
  const db = await database();
  const existing = (await db.select().from(providerConfigurations).where(and(eq(providerConfigurations.schoolId, input.schoolId), eq(providerConfigurations.category, input.category))).limit(1))[0];
  const encryptedCredentials = input.clearCredentials ? null : sealProviderCredentials(input.credentials ?? {}) ?? existing?.encryptedCredentials ?? null;
  if (input.status === "ready" && providerRequiresCredentials(input.provider) && !encryptedCredentials) throw new Error("Store provider credentials before marking this configuration ready.");
  const values = { schoolId: input.schoolId, category: input.category, provider: input.provider, status: input.status, configuration: input.configuration, encryptedCredentials, configuredBy: input.configuredBy, lastValidatedAt: null };
  await db.insert(providerConfigurations).values(values).onDuplicateKeyUpdate({ set: values });
  return listProviderConfigurations(input.schoolId);
}

export async function getSchoolWebsite(schoolId: number) {
  const db = await database();
  const school = (await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1))[0];
  if (!school) throw new Error("School not found.");
  const website = (await db.select().from(schoolWebsites).where(eq(schoolWebsites.schoolId, schoolId)).limit(1))[0];
  return { school, website: website ?? { schoolId, headline: `${school.name}: learning for a brighter future.`, introduction: "", primaryColor: "#0f5c4f", contactEmail: school.email, contactPhone: school.phone, campusLocation: school.address ?? school.state, customDomain: null, domainStatus: "not_configured", admissionsEnabled: true, published: false } };
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
  const application = (await db.select().from(admissionsApplications).where(and(eq(admissionsApplications.id, input.applicationId), eq(admissionsApplications.schoolId, input.schoolId))).limit(1))[0];
  if (!application || application.status !== "accepted") throw new Error("Only accepted applications can be enrolled.");
  const created = await db.insert(studentProfiles).values({ schoolId: input.schoolId, admissionNo: input.admissionNo, firstName: application.firstName, lastName: application.lastName, dateOfBirth: application.dateOfBirth, gender: application.gender, admittedOn: asDate(input.admittedOn) });
  const studentId = Number(created[0].insertId);
  await db.insert(enrollments).values({ schoolId: input.schoolId, studentId, classId: input.classId, sessionId: input.sessionId, enrolledOn: asDate(input.admittedOn)! });
  await db.update(admissionsApplications).set({ status: "enrolled" }).where(eq(admissionsApplications.id, input.applicationId));
  return { studentId };
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
  const [sessions, terms, classList, subjectList, classSubjectList, timetable, lessonPlanList, curriculum] = await Promise.all([
    db.select().from(academicSessions).where(eq(academicSessions.schoolId, schoolId)).orderBy(desc(academicSessions.startsOn)),
    db.select().from(academicTerms).where(eq(academicTerms.schoolId, schoolId)).orderBy(desc(academicTerms.startsOn)),
    db.select().from(classes).where(eq(classes.schoolId, schoolId)).orderBy(classes.name),
    db.select().from(subjects).where(eq(subjects.schoolId, schoolId)).orderBy(subjects.name),
    db.select().from(classSubjects).where(eq(classSubjects.schoolId, schoolId)),
    db.select().from(timetableEntries).where(eq(timetableEntries.schoolId, schoolId)),
    db.select().from(lessonPlans).where(eq(lessonPlans.schoolId, schoolId)).orderBy(desc(lessonPlans.createdAt)),
    db.select().from(curriculumMilestones).where(eq(curriculumMilestones.schoolId, schoolId)).orderBy(curriculumMilestones.targetWeek),
  ]);
  return { sessions, terms, classes: classList, subjects: subjectList, classSubjects: classSubjectList, timetable, lessonPlans: lessonPlanList, curriculum };
}

export const createAcademicSession = async (input: Record<string, unknown>) => (await database()).insert(academicSessions).values({ ...input, isCurrent: input.isCurrent ?? false } as typeof academicSessions.$inferInsert);
export const createAcademicTerm = async (input: Record<string, unknown>) => (await database()).insert(academicTerms).values({ ...input, isCurrent: input.isCurrent ?? false } as typeof academicTerms.$inferInsert);
export const createClass = async (input: Record<string, unknown>) => (await database()).insert(classes).values(input as typeof classes.$inferInsert);
export const createSubject = async (input: Record<string, unknown>) => (await database()).insert(subjects).values(input as typeof subjects.$inferInsert);
export const createTimetableEntry = async (input: Record<string, unknown>) => (await database()).insert(timetableEntries).values(input as typeof timetableEntries.$inferInsert);
export const createLessonPlan = async (input: Record<string, unknown>) => (await database()).insert(lessonPlans).values(input as typeof lessonPlans.$inferInsert);
export const createCurriculumMilestone = async (input: Record<string, unknown>) => (await database()).insert(curriculumMilestones).values(input as typeof curriculumMilestones.$inferInsert);

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
  const [fees, invoiceList, paymentList] = await Promise.all([
    db.select().from(feeStructures).where(eq(feeStructures.schoolId, schoolId)).orderBy(desc(feeStructures.createdAt)),
    db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).orderBy(desc(invoices.createdAt)),
    db.select().from(payments).where(eq(payments.schoolId, schoolId)).orderBy(desc(payments.createdAt)),
  ]);
  return { feeStructures: fees, invoices: invoiceList, payments: paymentList };
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
export async function createMessageLog(input: { schoolId: number; channel: "in_app" | "email" | "sms" | "whatsapp"; audience: "everyone" | "staff" | "students" | "guardians" | "class"; subject?: string; body: string; recipientCount: number; createdBy: number }) {
  const db = await database();
  const isInApp = input.channel === "in_app";
  const result = await db.insert(messageLogs).values({ ...input, status: isInApp ? "sent" : "queued", sentAt: isInApp ? new Date() : null });
  if (isInApp) {
    await db.insert(announcements).values({ schoolId: input.schoolId, title: input.subject ?? "School message", body: input.body, audience: input.audience, status: "published", publishedAt: new Date(), createdBy: input.createdBy });
  }
  return { messageId: Number(result[0].insertId) };
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
