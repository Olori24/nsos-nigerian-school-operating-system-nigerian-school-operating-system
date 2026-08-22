import {
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: varchar("avatarUrl", { length: 2048 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const authIdentities = mysqlTable(
  "authIdentities",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: mysqlEnum("provider", ["google", "email"]).notNull(),
    providerSubject: varchar("providerSubject", { length: 320 }).notNull(),
    email: varchar("email", { length: 320 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  },
  table => ({
    providerSubjectUnique: uniqueIndex("authIdentity_provider_subject_unique").on(table.provider, table.providerSubject),
    userIndex: index("authIdentity_user_idx").on(table.userId),
    emailIndex: index("authIdentity_email_idx").on(table.email),
  }),
);

export const authMagicLinks = mysqlTable(
  "authMagicLinks",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    redirectOrigin: varchar("redirectOrigin", { length: 512 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    tokenUnique: uniqueIndex("authMagicLink_token_unique").on(table.tokenHash),
    emailCreated: index("authMagicLink_email_created_idx").on(table.email, table.createdAt),
    expiryIndex: index("authMagicLink_expiry_idx").on(table.expiresAt),
  }),
);

export const userSessions = mysqlTable(
  "userSessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("userId").notNull(),
    source: varchar("source", { length: 32 }).notNull().default("session"),
    deviceLabel: varchar("deviceLabel", { length: 160 }).notNull(),
    userAgent: varchar("userAgent", { length: 512 }),
    locationLabel: varchar("locationLabel", { length: 160 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    revokedReason: varchar("revokedReason", { length: 96 }),
  },
  table => ({
    userActive: index("userSession_user_active_idx").on(table.userId, table.revokedAt, table.lastSeenAt),
    expiry: index("userSession_expiry_idx").on(table.expiresAt),
  }),
);

export const userSecurityActivity = mysqlTable(
  "userSecurityActivity",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    eventType: varchar("eventType", { length: 64 }).notNull(),
    deviceLabel: varchar("deviceLabel", { length: 160 }).notNull(),
    locationLabel: varchar("locationLabel", { length: 160 }),
    source: varchar("source", { length: 32 }).notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => ({
    userOccurred: index("userSecurityActivity_user_occurred_idx").on(table.userId, table.occurredAt),
  }),
);

export const copilotRecentSearches = mysqlTable(
  "copilotRecentSearches",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    schoolId: int("schoolId").notNull(),
    query: varchar("query", { length: 600 }).notNull(),
    destinationId: varchar("destinationId", { length: 32 }),
    searchedAt: timestamp("searchedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userSchoolQuery: uniqueIndex("copilotRecentSearch_user_school_query_unique").on(table.userId, table.schoolId, table.query),
    userSchoolRecent: index("copilotRecentSearch_user_school_recent_idx").on(table.userId, table.schoolId, table.searchedAt),
  }),
);

export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortCode: varchar("shortCode", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 48 }),
  address: text("address"),
  state: varchar("state", { length: 100 }),
  logoUrl: text("logoUrl"),
  currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Africa/Lagos"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const subscriptionPlans = mysqlTable(
  "subscriptionPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 48 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    monthlyAmount: decimal("monthlyAmount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    annualAmount: decimal("annualAmount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
    studentLimit: int("studentLimit"),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ codeUnique: uniqueIndex("subscriptionPlan_code_unique").on(table.code) }),
);

export const schoolSubscriptions = mysqlTable(
  "schoolSubscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    planId: int("planId"),
    status: mysqlEnum("status", ["trial", "active", "payment_due", "suspended", "cancelled"]).notNull().default("trial"),
    billingCycle: mysqlEnum("billingCycle", ["monthly", "annual", "manual"]).notNull().default("manual"),
    startsAt: timestamp("startsAt").defaultNow().notNull(),
    endsAt: timestamp("endsAt"),
    assignedBy: int("assignedBy"),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolUnique: uniqueIndex("schoolSubscription_school_unique").on(table.schoolId), statusIndex: index("schoolSubscription_status_idx").on(table.status) }),
);

export const platformBillingRecords = mysqlTable(
  "platformBillingRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    subscriptionId: int("subscriptionId").notNull(),
    planId: int("planId"),
    invoiceNo: varchar("invoiceNo", { length: 64 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
    status: mysqlEnum("status", ["draft", "issued", "paid", "void"]).notNull().default("draft"),
    issueDate: date("issueDate").notNull(),
    dueDate: date("dueDate"),
    paidAt: timestamp("paidAt"),
    paymentMethod: mysqlEnum("paymentMethod", ["bank_transfer", "card", "manual"]).notNull().default("manual"),
    providerReference: varchar("providerReference", { length: 160 }),
    note: text("note"),
    createdBy: int("createdBy").notNull(),
    settledBy: int("settledBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ invoiceNoUnique: uniqueIndex("platformBilling_invoice_no_unique").on(table.invoiceNo), schoolIndex: index("platformBilling_school_idx").on(table.schoolId), statusIndex: index("platformBilling_status_idx").on(table.status) }),
);

export const schoolWebsites = mysqlTable(
  "schoolWebsites",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    headline: varchar("headline", { length: 255 }),
    introduction: text("introduction"),
    primaryColor: varchar("primaryColor", { length: 16 }).notNull().default("#0f5c4f"),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 48 }),
    campusLocation: varchar("campusLocation", { length: 255 }),
    customDomain: varchar("customDomain", { length: 255 }),
    domainVerificationToken: varchar("domainVerificationToken", { length: 96 }),
    domainStatus: mysqlEnum("domainStatus", ["not_configured", "pending", "active"]).notNull().default("not_configured"),
    admissionsEnabled: boolean("admissionsEnabled").notNull().default(true),
    published: boolean("published").notNull().default(false),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolUnique: uniqueIndex("schoolWebsite_school_unique").on(table.schoolId), domainUnique: uniqueIndex("schoolWebsite_domain_unique").on(table.customDomain) }),
);

export const schoolDocumentTemplates = mysqlTable(
  "schoolDocumentTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    admissionTitle: varchar("admissionTitle", { length: 160 }).notNull().default("School admission form"),
    headerTagline: varchar("headerTagline", { length: 255 }),
    headerLogoUrl: varchar("headerLogoUrl", { length: 2048 }),
    headerAddressLine: varchar("headerAddressLine", { length: 500 }),
    headerContactLine: varchar("headerContactLine", { length: 500 }),
    admissionFields: json("admissionFields").$type<string[]>().notNull(),
    declarationText: text("declarationText"),
    requireDeclaration: boolean("requireDeclaration").notNull().default(true),
    requirePassportPhoto: boolean("requirePassportPhoto").notNull().default(false),
    requireAdmissionFeeReceipt: boolean("requireAdmissionFeeReceipt").notNull().default(false),
    termlyFeeTitle: varchar("termlyFeeTitle", { length: 160 }).notNull().default("Termly fee guide"),
    feeSchedule: json("feeSchedule").$type<Array<{ category: string; tuitionFee: number }>>().notNull(),
    updatedBy: int("updatedBy"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolUnique: uniqueIndex("schoolDocumentTemplate_school_unique").on(table.schoolId) }),
);

export const schoolMemberships = mysqlTable(
  "schoolMemberships",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "staff", "teacher", "finance", "parent", "student"])
      .notNull()
      .default("staff"),
    status: mysqlEnum("status", ["active", "invited", "suspended"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    schoolUser: uniqueIndex("schoolMembership_school_user_unique").on(table.schoolId, table.userId),
    schoolIndex: index("schoolMembership_school_idx").on(table.schoolId),
  }),
);

export const academicSessions = mysqlTable(
  "academicSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    startsOn: date("startsOn").notNull(),
    endsOn: date("endsOn").notNull(),
    isCurrent: boolean("isCurrent").notNull().default(false),
    status: mysqlEnum("status", ["planning", "active", "closed"]).notNull().default("planning"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("academicSession_school_idx").on(table.schoolId) }),
);

export const academicTerms = mysqlTable(
  "academicTerms",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    sessionId: int("sessionId").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    startsOn: date("startsOn").notNull(),
    endsOn: date("endsOn").notNull(),
    isCurrent: boolean("isCurrent").notNull().default(false),
    status: mysqlEnum("status", ["planning", "active", "closed"]).notNull().default("planning"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("academicTerm_school_idx").on(table.schoolId) }),
);

export const departments = mysqlTable(
  "departments",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 24 }),
    headStaffId: int("headStaffId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolName: uniqueIndex("department_school_name_unique").on(table.schoolId, table.name) }),
);

export const staffProfiles = mysqlTable(
  "staffProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    userId: int("userId"),
    employeeNo: varchar("employeeNo", { length: 48 }).notNull(),
    firstName: varchar("firstName", { length: 120 }).notNull(),
    lastName: varchar("lastName", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 48 }),
    departmentId: int("departmentId"),
    jobTitle: varchar("jobTitle", { length: 120 }).notNull(),
    employmentType: mysqlEnum("employmentType", ["full_time", "part_time", "contract", "temporary"]).notNull().default("full_time"),
    employmentStatus: mysqlEnum("employmentStatus", ["active", "on_leave", "suspended", "exited"]).notNull().default("active"),
    joinedOn: date("joinedOn"),
    address: text("address"),
    emergencyContact: varchar("emergencyContact", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    schoolEmployee: uniqueIndex("staff_school_employee_unique").on(table.schoolId, table.employeeNo),
    schoolIndex: index("staff_school_idx").on(table.schoolId),
  }),
);

export const staffSetupInvitations = mysqlTable(
  "staffSetupInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    firstName: varchar("firstName", { length: 120 }).notNull(),
    lastName: varchar("lastName", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    employeeNo: varchar("employeeNo", { length: 48 }).notNull(),
    jobTitle: varchar("jobTitle", { length: 120 }).notNull(),
    role: mysqlEnum("role", ["admin", "staff", "teacher", "finance"]).notNull(),
    employmentType: mysqlEnum("employmentType", ["full_time", "part_time", "contract", "temporary"]).notNull().default("full_time"),
    status: mysqlEnum("status", ["draft", "sending", "sent", "accepted", "cancelled"]).notNull().default("draft"),
    createdBy: int("createdBy").notNull(),
    acceptedUserId: int("acceptedUserId"),
    sentAt: timestamp("sentAt"),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    schoolStatus: index("staff_setup_invitation_school_status_idx").on(table.schoolId, table.status),
    schoolEmail: index("staff_setup_invitation_school_email_idx").on(table.schoolId, table.email),
  }),
);

export const staffDuties = mysqlTable(
  "staffDuties",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    staffId: int("staffId").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    startsOn: date("startsOn"),
    endsOn: date("endsOn"),
    status: mysqlEnum("status", ["active", "ended"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("staffDuty_school_idx").on(table.schoolId), staffIndex: index("staffDuty_staff_idx").on(table.staffId) }),
);

export const guardians = mysqlTable(
  "guardians",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    userId: int("userId"),
    firstName: varchar("firstName", { length: 120 }).notNull(),
    lastName: varchar("lastName", { length: 120 }).notNull(),
    relationship: varchar("relationship", { length: 80 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 48 }),
    address: text("address"),
    occupation: varchar("occupation", { length: 160 }),
    isPrimaryContact: boolean("isPrimaryContact").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("guardian_school_idx").on(table.schoolId) }),
);

export const studentProfiles = mysqlTable(
  "studentProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    userId: int("userId"),
    admissionNo: varchar("admissionNo", { length: 64 }).notNull(),
    firstName: varchar("firstName", { length: 120 }).notNull(),
    lastName: varchar("lastName", { length: 120 }).notNull(),
    middleName: varchar("middleName", { length: 120 }),
    dateOfBirth: date("dateOfBirth"),
    gender: mysqlEnum("gender", ["female", "male", "other", "prefer_not_to_say"]),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 48 }),
    address: text("address"),
    stateOfOrigin: varchar("stateOfOrigin", { length: 120 }),
    localGovernment: varchar("localGovernment", { length: 120 }),
    medicalNotes: text("medicalNotes"),
    status: mysqlEnum("status", ["active", "graduated", "withdrawn", "suspended", "alumni"]).notNull().default("active"),
    admittedOn: date("admittedOn"),
    graduationYear: int("graduationYear"),
    avatarUrl: text("avatarUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    schoolAdmission: uniqueIndex("student_school_admission_unique").on(table.schoolId, table.admissionNo),
    schoolIndex: index("student_school_idx").on(table.schoolId),
  }),
);

export const studentGuardians = mysqlTable(
  "studentGuardians",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull(),
    guardianId: int("guardianId").notNull(),
    isPrimary: boolean("isPrimary").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ relationship: uniqueIndex("student_guardian_unique").on(table.studentId, table.guardianId) }),
);

export const guardianPortalInvitations = mysqlTable(
  "guardianPortalInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    guardianId: int("guardianId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    status: mysqlEnum("status", ["sending", "sent", "failed", "accepted"]).notNull().default("sending"),
    sentBy: int("sentBy").notNull(),
    acceptedUserId: int("acceptedUserId"),
    sentAt: timestamp("sentAt"),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolGuardian: index("guardian_portal_invitation_school_guardian_idx").on(table.schoolId, table.guardianId), emailStatus: index("guardian_portal_invitation_email_status_idx").on(table.email, table.status) }),
);

export const admissionsApplications = mysqlTable(
  "admissionsApplications",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    applicationNo: varchar("applicationNo", { length: 64 }).notNull(),
    firstName: varchar("firstName", { length: 120 }).notNull(),
    lastName: varchar("lastName", { length: 120 }).notNull(),
    dateOfBirth: date("dateOfBirth"),
    gender: mysqlEnum("gender", ["female", "male", "other", "prefer_not_to_say"]),
    applyingForClassId: int("applyingForClassId"),
    guardianName: varchar("guardianName", { length: 255 }).notNull(),
    guardianEmail: varchar("guardianEmail", { length: 320 }),
    guardianPhone: varchar("guardianPhone", { length: 48 }).notNull(),
    priorSchool: varchar("priorSchool", { length: 255 }),
    notes: text("notes"),
    supplementalData: json("supplementalData").$type<Record<string, string>>(),
    declarationAccepted: boolean("declarationAccepted").notNull().default(false),
    status: mysqlEnum("status", ["submitted", "under_review", "accepted", "declined", "enrolled"])
      .notNull()
      .default("submitted"),
    reviewerId: int("reviewerId"),
    decisionNote: text("decisionNote"),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    decidedAt: timestamp("decidedAt"),
  },
  table => ({
    schoolApplication: uniqueIndex("application_school_no_unique").on(table.schoolId, table.applicationNo),
    schoolIndex: index("application_school_idx").on(table.schoolId),
  }),
);

export const admissionDocuments = mysqlTable(
  "admissionDocuments",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("applicationId").notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    storageKey: text("storageKey").notNull(),
    url: text("url").notNull(),
    documentType: mysqlEnum("documentType", ["supporting_document", "passport_photo", "admission_fee_receipt"]).notNull().default("supporting_document"),
    fileName: varchar("fileName", { length: 180 }),
    byteSize: int("byteSize"),
    mimeType: varchar("mimeType", { length: 120 }),
    status: mysqlEnum("status", ["pending", "verified", "rejected"]).notNull().default("pending"),
    reviewedBy: int("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    reviewNote: text("reviewNote"),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  },
  table => ({ applicationIndex: index("admissionDocument_application_idx").on(table.applicationId) }),
);

export const classes = mysqlTable(
  "classes",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    sessionId: int("sessionId"),
    name: varchar("name", { length: 120 }).notNull(),
    level: varchar("level", { length: 64 }),
    arm: varchar("arm", { length: 32 }),
    capacity: int("capacity"),
    classTeacherId: int("classTeacherId"),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolName: uniqueIndex("class_school_name_unique").on(table.schoolId, table.name) }),
);

export const subjects = mysqlTable(
  "subjects",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    departmentId: int("departmentId"),
    description: text("description"),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolCode: uniqueIndex("subject_school_code_unique").on(table.schoolId, table.code) }),
);

export const schoolCurriculumProfiles = mysqlTable(
  "schoolCurriculumProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    framework: mysqlEnum("framework", ["nerdc_basic", "nerdc_senior", "custom"]).notNull().default("custom"),
    templateId: varchar("templateId", { length: 64 }),
    sourceUrl: varchar("sourceUrl", { length: 2048 }),
    appliedClassIds: json("appliedClassIds").$type<number[]>().notNull(),
    appliedBy: int("appliedBy"),
    appliedAt: timestamp("appliedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolUnique: uniqueIndex("curriculumProfile_school_unique").on(table.schoolId) }),
);

export const schemeOfWorkImports = mysqlTable(
  "schemeOfWorkImports",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    classId: int("classId").notNull(),
    subjectId: int("subjectId").notNull(),
    termId: int("termId").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileKey: varchar("fileKey", { length: 1024 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    contentSha256: varchar("contentSha256", { length: 64 }).notNull(),
    rowCount: int("rowCount").notNull(),
    importedBy: int("importedBy").notNull(),
    importedAt: timestamp("importedAt").defaultNow().notNull(),
  },
  table => ({ schoolImported: index("schemeOfWorkImport_school_imported_idx").on(table.schoolId, table.importedAt), classSubjectTerm: index("schemeOfWorkImport_class_subject_term_idx").on(table.schoolId, table.classId, table.subjectId, table.termId) }),
);

export const schemeOfWorkRows = mysqlTable(
  "schemeOfWorkRows",
  {
    id: int("id").autoincrement().primaryKey(),
    importId: int("importId").notNull(),
    schoolId: int("schoolId").notNull(),
    milestoneId: int("milestoneId").notNull(),
    assignedTeacherId: int("assignedTeacherId").notNull(),
    weekNo: int("weekNo").notNull(),
    topic: varchar("topic", { length: 255 }).notNull(),
    objectives: text("objectives"),
    resources: text("resources"),
    reviewStatus: mysqlEnum("reviewStatus", ["pending_review", "approved", "returned", "published"]).notNull().default("pending_review"),
    reviewNote: text("reviewNote"),
    reviewedBy: int("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    publishedBy: int("publishedBy"),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ importWeek: uniqueIndex("schemeOfWorkRow_import_week_unique").on(table.importId, table.weekNo), schoolClass: index("schemeOfWorkRow_school_idx").on(table.schoolId, table.createdAt), teacherReview: index("schemeOfWorkRow_teacher_review_idx").on(table.assignedTeacherId, table.reviewStatus) }),
);

export const schemeOfWorkInlineComments = mysqlTable(
  "schemeOfWorkInlineComments",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    rowId: int("rowId").notNull(),
    anchor: mysqlEnum("anchor", ["topic", "objectives", "resources"]).notNull(),
    body: text("body").notNull(),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    rowCreated: index("schemeInlineComment_row_created_idx").on(table.rowId, table.createdAt),
    schoolCreated: index("schemeInlineComment_school_created_idx").on(table.schoolId, table.createdAt),
  }),
);

export const teacherSchemeRevisionNotifications = mysqlTable(
  "teacherSchemeRevisionNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    recipientUserId: int("recipientUserId").notNull(),
    importId: int("importId").notNull(),
    classId: int("classId").notNull(),
    subjectId: int("subjectId").notNull(),
    termId: int("termId").notNull(),
    classLabel: varchar("classLabel", { length: 120 }).notNull(),
    subjectLabel: varchar("subjectLabel", { length: 160 }).notNull(),
    termLabel: varchar("termLabel", { length: 64 }).notNull(),
    readAt: timestamp("readAt"),
    pinnedAt: timestamp("pinnedAt"),
    recommendedAt: timestamp("recommendedAt"),
    recommendedBy: int("recommendedBy"),
    recommendationExpiresAt: timestamp("recommendationExpiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    recipientCreated: index("teacherSchemeRevision_recipient_created_idx").on(table.schoolId, table.recipientUserId, table.createdAt),
    importRecipient: uniqueIndex("teacherSchemeRevision_import_recipient_unique").on(table.importId, table.recipientUserId),
  }),
);

export const teacherSchemeRevisionRecommendationOutcomes = mysqlTable(
  "teacherSchemeRevisionRecommendationOutcomes",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    notificationId: int("notificationId").notNull(),
    recipientUserId: int("recipientUserId").notNull(),
    classLabel: varchar("classLabel", { length: 120 }).notNull(),
    subjectLabel: varchar("subjectLabel", { length: 160 }).notNull(),
    termLabel: varchar("termLabel", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acknowledgedAt: timestamp("acknowledgedAt"),
    expiredAt: timestamp("expiredAt"),
    clearedAt: timestamp("clearedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    notification: uniqueIndex("teacherSchemeRecommendation_notification_unique").on(table.notificationId),
    schoolExpiry: index("teacherSchemeRecommendation_school_expiry_idx").on(table.schoolId, table.expiresAt),
  }),
);

export const classSubjects = mysqlTable(
  "classSubjects",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    classId: int("classId").notNull(),
    subjectId: int("subjectId").notNull(),
    teacherId: int("teacherId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ classSubject: uniqueIndex("class_subject_unique").on(table.classId, table.subjectId) }),
);

export const enrollments = mysqlTable(
  "enrollments",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    studentId: int("studentId").notNull(),
    classId: int("classId").notNull(),
    sessionId: int("sessionId").notNull(),
    status: mysqlEnum("status", ["active", "promoted", "graduated", "withdrawn"]).notNull().default("active"),
    enrolledOn: date("enrolledOn").notNull(),
    promotionNote: text("promotionNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    studentSession: uniqueIndex("enrollment_student_session_unique").on(table.studentId, table.sessionId),
    schoolIndex: index("enrollment_school_idx").on(table.schoolId),
  }),
);

export const timetableEntries = mysqlTable(
  "timetableEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    classId: int("classId").notNull(),
    subjectId: int("subjectId").notNull(),
    teacherId: int("teacherId"),
    dayOfWeek: mysqlEnum("dayOfWeek", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).notNull(),
    startsAt: varchar("startsAt", { length: 8 }).notNull(),
    endsAt: varchar("endsAt", { length: 8 }).notNull(),
    room: varchar("room", { length: 80 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ classDay: index("timetable_class_day_idx").on(table.classId, table.dayOfWeek) }),
);

export const lessonPlans = mysqlTable(
  "lessonPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    classId: int("classId").notNull(),
    subjectId: int("subjectId").notNull(),
    teacherId: int("teacherId").notNull(),
    termId: int("termId"),
    weekNo: int("weekNo").notNull(),
    topic: varchar("topic", { length: 255 }).notNull(),
    objectives: text("objectives"),
    resources: text("resources"),
    status: mysqlEnum("status", ["draft", "submitted", "approved", "delivered"]).notNull().default("draft"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("lessonPlan_school_idx").on(table.schoolId) }),
);

export const curriculumMilestones = mysqlTable(
  "curriculumMilestones",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    classSubjectId: int("classSubjectId").notNull(),
    termId: int("termId"),
    title: varchar("title", { length: 255 }).notNull(),
    targetWeek: int("targetWeek"),
    completionPercentage: int("completionPercentage").notNull().default(0),
    status: mysqlEnum("status", ["not_started", "in_progress", "complete"]).notNull().default("not_started"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("curriculum_school_idx").on(table.schoolId) }),
);

export const attendanceRecords = mysqlTable(
  "attendanceRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    attendeeType: mysqlEnum("attendeeType", ["student", "staff"]).notNull(),
    studentId: int("studentId"),
    staffId: int("staffId"),
    classId: int("classId"),
    attendanceDate: date("attendanceDate").notNull(),
    status: mysqlEnum("status", ["present", "late", "absent", "excused"]).notNull(),
    note: text("note"),
    recordedBy: int("recordedBy").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  table => ({
    studentDate: uniqueIndex("attendance_student_date_unique").on(table.studentId, table.attendanceDate),
    staffDate: uniqueIndex("attendance_staff_date_unique").on(table.staffId, table.attendanceDate),
    schoolDate: index("attendance_school_date_idx").on(table.schoolId, table.attendanceDate),
  }),
);

export const assessments = mysqlTable(
  "assessments",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    termId: int("termId").notNull(),
    classId: int("classId").notNull(),
    subjectId: int("subjectId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    assessmentType: mysqlEnum("assessmentType", ["assignment", "test", "project", "exam", "practical"]).notNull(),
    maximumScore: int("maximumScore").notNull(),
    weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("100.00"),
    heldOn: date("heldOn"),
    status: mysqlEnum("status", ["draft", "open", "locked", "published"]).notNull().default("draft"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("assessment_school_idx").on(table.schoolId) }),
);

export const gradeScales = mysqlTable(
  "gradeScales",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    label: varchar("label", { length: 12 }).notNull(),
    minPercentage: decimal("minPercentage", { precision: 5, scale: 2 }).notNull(),
    maxPercentage: decimal("maxPercentage", { precision: 5, scale: 2 }).notNull(),
    remark: varchar("remark", { length: 255 }),
    sortOrder: int("sortOrder").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolLabel: uniqueIndex("grade_school_label_unique").on(table.schoolId, table.label) }),
);

export const scores = mysqlTable(
  "scores",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    assessmentId: int("assessmentId").notNull(),
    studentId: int("studentId").notNull(),
    score: decimal("score", { precision: 7, scale: 2 }).notNull(),
    comment: text("comment"),
    enteredBy: int("enteredBy").notNull(),
    enteredAt: timestamp("enteredAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ assessmentStudent: uniqueIndex("score_assessment_student_unique").on(table.assessmentId, table.studentId) }),
);

export const resultPublications = mysqlTable(
  "resultPublications",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    termId: int("termId").notNull(),
    classId: int("classId").notNull(),
    status: mysqlEnum("status", ["draft", "approved", "published", "withdrawn"]).notNull().default("draft"),
    approvedBy: int("approvedBy"),
    approvedAt: timestamp("approvedAt"),
    publishedBy: int("publishedBy"),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ termClass: uniqueIndex("result_term_class_unique").on(table.termId, table.classId) }),
);

export const feeStructures = mysqlTable(
  "feeStructures",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    termId: int("termId"),
    classId: int("classId"),
    name: varchar("name", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    mandatory: boolean("mandatory").notNull().default(true),
    dueOn: date("dueOn"),
    status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("feeStructure_school_idx").on(table.schoolId) }),
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    studentId: int("studentId").notNull(),
    termId: int("termId"),
    invoiceNo: varchar("invoiceNo", { length: 64 }).notNull(),
    issueDate: date("issueDate").notNull(),
    dueDate: date("dueDate"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).notNull().default("0.00"),
    status: mysqlEnum("status", ["draft", "issued", "partial", "paid", "overdue", "void"]).notNull().default("draft"),
    note: text("note"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    schoolNo: uniqueIndex("invoice_school_no_unique").on(table.schoolId, table.invoiceNo),
    studentIndex: index("invoice_student_idx").on(table.studentId),
  }),
);

export const invoiceLineItems = mysqlTable("invoiceLineItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  feeStructureId: int("feeStructureId"),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  unitAmount: decimal("unitAmount", { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
});

export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    invoiceId: int("invoiceId").notNull(),
    receiptNo: varchar("receiptNo", { length: 64 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paidOn: date("paidOn").notNull(),
    method: mysqlEnum("method", ["cash", "bank_transfer", "card", "pos", "cheque", "other"]).notNull(),
    reference: varchar("reference", { length: 160 }),
    recordedBy: int("recordedBy").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolReceipt: uniqueIndex("payment_school_receipt_unique").on(table.schoolId, table.receiptNo) }),
);

export const schoolBankAccounts = mysqlTable(
  "schoolBankAccounts",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    bankName: varchar("bankName", { length: 160 }).notNull(),
    accountName: varchar("accountName", { length: 160 }).notNull(),
    encryptedAccountNumber: text("encryptedAccountNumber").notNull(),
    accountNumberLast4: varchar("accountNumberLast4", { length: 4 }).notNull(),
    accountType: mysqlEnum("accountType", ["current", "savings", "corporate", "other"]).notNull().default("current"),
    status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
    isPrimary: boolean("isPrimary").notNull().default(false),
    paymentReferenceGuidance: varchar("paymentReferenceGuidance", { length: 255 }),
    configuredBy: int("configuredBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolStatus: index("schoolBankAccount_school_status_idx").on(table.schoolId, table.status), schoolPrimary: index("schoolBankAccount_school_primary_idx").on(table.schoolId, table.isPrimary) }),
);

export const cashAssuranceCases = mysqlTable(
  "cashAssuranceCases",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    studentId: int("studentId").notNull(),
    guardianId: int("guardianId"),
    status: mysqlEnum("status", ["open", "contact_due", "awaiting_promise", "payment_under_review", "disputed", "escalated", "settled", "closed"]).notNull().default("open"),
    priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).notNull().default("normal"),
    assignedTo: int("assignedTo"),
    nextActionAt: timestamp("nextActionAt"),
    pausedReason: text("pausedReason"),
    openedBy: int("openedBy").notNull(),
    closedBy: int("closedBy"),
    closedAt: timestamp("closedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolStatus: index("cashAssuranceCase_school_status_idx").on(table.schoolId, table.status), studentIndex: index("cashAssuranceCase_student_idx").on(table.studentId), assigneeIndex: index("cashAssuranceCase_assignee_idx").on(table.assignedTo) }),
);

export const cashAssuranceCaseInvoices = mysqlTable(
  "cashAssuranceCaseInvoices",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: int("caseId").notNull(),
    invoiceId: int("invoiceId").notNull(),
    snapshotOutstandingAmount: decimal("snapshotOutstandingAmount", { precision: 12, scale: 2 }).notNull(),
    includedAt: timestamp("includedAt").defaultNow().notNull(),
  },
  table => ({ caseInvoice: uniqueIndex("cashAssuranceCaseInvoice_unique").on(table.caseId, table.invoiceId), invoiceIndex: index("cashAssuranceCaseInvoice_invoice_idx").on(table.invoiceId) }),
);

export const cashAssuranceEvents = mysqlTable(
  "cashAssuranceEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    caseId: int("caseId").notNull(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    actorType: mysqlEnum("actorType", ["user", "guardian", "system"]).notNull().default("user"),
    actorUserId: int("actorUserId"),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ caseCreated: index("cashAssuranceEvent_case_created_idx").on(table.caseId, table.createdAt), schoolCreated: index("cashAssuranceEvent_school_created_idx").on(table.schoolId, table.createdAt) }),
);

export const paymentEvidence = mysqlTable(
  "paymentEvidence",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    caseId: int("caseId").notNull(),
    invoiceId: int("invoiceId").notNull(),
    amountClaimed: decimal("amountClaimed", { precision: 12, scale: 2 }).notNull(),
    claimedPaidOn: date("claimedPaidOn"),
    source: mysqlEnum("source", ["manual_receipt", "bank_reference", "provider_event", "other"]).notNull().default("manual_receipt"),
    providerReference: varchar("providerReference", { length: 160 }),
    note: text("note"),
    evidenceFileKey: varchar("evidenceFileKey", { length: 512 }),
    evidenceFileUrl: varchar("evidenceFileUrl", { length: 1024 }),
    evidenceFileName: varchar("evidenceFileName", { length: 255 }),
    evidenceMimeType: varchar("evidenceMimeType", { length: 96 }),
    evidenceFileSize: int("evidenceFileSize"),
    status: mysqlEnum("status", ["submitted", "under_review", "accepted", "rejected"]).notNull().default("submitted"),
    reviewedBy: int("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    linkedPaymentId: int("linkedPaymentId"),
    reviewNote: text("reviewNote"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolStatus: index("paymentEvidence_school_status_idx").on(table.schoolId, table.status), caseIndex: index("paymentEvidence_case_idx").on(table.caseId), invoiceIndex: index("paymentEvidence_invoice_idx").on(table.invoiceId) }),
);

export const familyPaymentEvidenceNotifications = mysqlTable(
  "familyPaymentEvidenceNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    evidenceId: int("evidenceId").notNull(),
    recipientUserId: int("recipientUserId").notNull(),
    decision: mysqlEnum("decision", ["accepted", "rejected"]).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    evidenceRecipient: uniqueIndex("familyEvidenceNotification_evidence_recipient_unique").on(table.evidenceId, table.recipientUserId),
    recipientUnread: index("familyEvidenceNotification_recipient_unread_idx").on(table.schoolId, table.recipientUserId, table.readAt),
  }),
);

export const paymentPromises = mysqlTable(
  "paymentPromises",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    caseId: int("caseId").notNull(),
    promisedAmount: decimal("promisedAmount", { precision: 12, scale: 2 }).notNull(),
    promisedOn: date("promisedOn").notNull(),
    note: text("note"),
    status: mysqlEnum("status", ["open", "fulfilled", "overdue", "cancelled"]).notNull().default("open"),
    recordedBy: int("recordedBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ caseIndex: index("paymentPromise_case_idx").on(table.caseId), schoolStatus: index("paymentPromise_school_status_idx").on(table.schoolId, table.status) }),
);

export const leaveRequests = mysqlTable(
  "leaveRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    staffId: int("staffId").notNull(),
    leaveType: mysqlEnum("leaveType", ["annual", "sick", "maternity", "paternity", "compassionate", "other"]).notNull(),
    startsOn: date("startsOn").notNull(),
    endsOn: date("endsOn").notNull(),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "declined", "cancelled"]).notNull().default("pending"),
    reviewedBy: int("reviewedBy"),
    reviewNote: text("reviewNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolIndex: index("leave_school_idx").on(table.schoolId) }),
);

export const payrollRecords = mysqlTable(
  "payrollRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    staffId: int("staffId").notNull(),
    periodLabel: varchar("periodLabel", { length: 64 }).notNull(),
    grossPay: decimal("grossPay", { precision: 12, scale: 2 }).notNull(),
    deductions: decimal("deductions", { precision: 12, scale: 2 }).notNull().default("0.00"),
    netPay: decimal("netPay", { precision: 12, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["draft", "approved", "paid", "void"]).notNull().default("draft"),
    paidOn: date("paidOn"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ staffPeriod: uniqueIndex("payroll_staff_period_unique").on(table.staffId, table.periodLabel) }),
);

export const performanceNotes = mysqlTable("performanceNotes", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  staffId: int("staffId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  note: text("note").notNull(),
  visibility: mysqlEnum("visibility", ["private", "shared"]).notNull().default("private"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const announcements = mysqlTable(
  "announcements",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    audience: mysqlEnum("audience", ["everyone", "staff", "students", "guardians", "class"]).notNull().default("everyone"),
    classId: int("classId"),
    status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
    publishedAt: timestamp("publishedAt"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolIndex: index("announcement_school_idx").on(table.schoolId) }),
);

export const messageLogs = mysqlTable(
  "messageLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    channel: mysqlEnum("channel", ["in_app", "email", "sms", "whatsapp"]).notNull(),
    audience: mysqlEnum("audience", ["everyone", "staff", "students", "guardians", "class"]).notNull(),
    subject: varchar("subject", { length: 255 }),
    body: text("body").notNull(),
    recipientCount: int("recipientCount").notNull().default(0),
    providerMessageId: varchar("providerMessageId", { length: 255 }),
    status: mysqlEnum("status", ["queued", "sent", "failed"]).notNull().default("queued"),
    createdBy: int("createdBy").notNull(),
    sentAt: timestamp("sentAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ schoolIndex: index("message_school_idx").on(table.schoolId) }),
);

export const providerConfigurations = mysqlTable(
  "providerConfigurations",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    category: mysqlEnum("category", ["payment", "notification"]).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["draft", "ready", "disabled"]).notNull().default("draft"),
    configuration: json("configuration").notNull(),
    encryptedCredentials: text("encryptedCredentials"),
    configuredBy: int("configuredBy").notNull(),
    lastValidatedAt: timestamp("lastValidatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolCategory: uniqueIndex("providerConfiguration_school_category_unique").on(table.schoolId, table.category), schoolIndex: index("providerConfiguration_school_idx").on(table.schoolId) }),
);

export const schoolAdvertisingAccounts = mysqlTable(
  "schoolAdvertisingAccounts",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    provider: mysqlEnum("provider", ["meta"]).notNull().default("meta"),
    status: mysqlEnum("status", ["not_connected", "connected", "attention", "disabled"]).notNull().default("not_connected"),
    accountName: varchar("accountName", { length: 160 }),
    externalAccountId: varchar("externalAccountId", { length: 160 }),
    currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
    encryptedCredentials: text("encryptedCredentials"),
    connectedBy: int("connectedBy"),
    lastValidatedAt: timestamp("lastValidatedAt"),
    webhookStatus: mysqlEnum("webhookStatus", ["not_configured", "pending", "active"]).notNull().default("not_configured"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolProvider: uniqueIndex("schoolAdvertisingAccount_school_provider_unique").on(table.schoolId, table.provider), schoolIndex: index("schoolAdvertisingAccount_school_idx").on(table.schoolId) }),
);

export const advertisingCampaigns = mysqlTable(
  "advertisingCampaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    advertisingAccountId: int("advertisingAccountId").notNull(),
    provider: mysqlEnum("provider", ["meta"]).notNull().default("meta"),
    name: varchar("name", { length: 160 }).notNull(),
    objective: mysqlEnum("objective", ["lead_generation", "website_visits", "awareness"]).notNull(),
    destinationUrl: varchar("destinationUrl", { length: 2048 }),
    facebookPageId: varchar("facebookPageId", { length: 80 }),
    creativeImageUrl: varchar("creativeImageUrl", { length: 2048 }),
    primaryText: text("primaryText").notNull(),
    headline: varchar("headline", { length: 255 }).notNull(),
    callToAction: mysqlEnum("callToAction", ["learn_more", "apply_now", "contact_us"]).notNull().default("learn_more"),
    audienceSummary: json("audienceSummary").$type<{ locations: string[]; ageMin?: number; ageMax?: number; note?: string }>().notNull(),
    dailyBudget: decimal("dailyBudget", { precision: 12, scale: 2 }).notNull(),
    totalBudget: decimal("totalBudget", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    status: mysqlEnum("status", ["draft", "pending_approval", "approved", "launching", "active", "paused", "completed", "failed", "archived"]).notNull().default("draft"),
    providerCampaignId: varchar("providerCampaignId", { length: 160 }),
    providerAdSetId: varchar("providerAdSetId", { length: 160 }),
    providerCreativeId: varchar("providerCreativeId", { length: 160 }),
    providerAdId: varchar("providerAdId", { length: 160 }),
    providerStatus: varchar("providerStatus", { length: 96 }),
    lastProviderError: varchar("lastProviderError", { length: 500 }),
    lastSyncedAt: timestamp("lastSyncedAt"),
    createdBy: int("createdBy").notNull(),
    approvedBy: int("approvedBy"),
    approvedAt: timestamp("approvedAt"),
    launchedBy: int("launchedBy"),
    launchedAt: timestamp("launchedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolStatus: index("advertisingCampaign_school_status_idx").on(table.schoolId, table.status), accountStatus: index("advertisingCampaign_account_status_idx").on(table.advertisingAccountId, table.status), providerId: index("advertisingCampaign_provider_id_idx").on(table.providerCampaignId) }),
);

export const aiTutors = mysqlTable(
  "aiTutors",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    subjectId: int("subjectId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    curriculumScope: text("curriculumScope").notNull(),
    allowedLevels: json("allowedLevels").$type<string[]>().notNull(),
    supervisorUserId: int("supervisorUserId").notNull(),
    status: mysqlEnum("status", ["draft", "active", "paused", "retired"]).notNull().default("draft"),
    dailyQuestionLimit: int("dailyQuestionLimit").notNull().default(20),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ schoolSubject: uniqueIndex("aiTutor_school_subject_unique").on(table.schoolId, table.subjectId), schoolStatus: index("aiTutor_school_status_idx").on(table.schoolId, table.status), supervisorStatus: index("aiTutor_supervisor_status_idx").on(table.supervisorUserId, table.status) }),
);

export const aiTutorSessionSummaries = mysqlTable(
  "aiTutorSessionSummaries",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    tutorId: int("tutorId").notNull(),
    studentId: int("studentId").notNull(),
    sessionDate: date("sessionDate").notNull(),
    questionCount: int("questionCount").notNull().default(0),
    escalationCount: int("escalationCount").notNull().default(0),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ tutorStudentDate: uniqueIndex("aiTutorSession_tutor_student_date_unique").on(table.tutorId, table.studentId, table.sessionDate), schoolStudent: index("aiTutorSession_school_student_idx").on(table.schoolId, table.studentId) }),
);

export const aiTutorEscalations = mysqlTable(
  "aiTutorEscalations",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    tutorId: int("tutorId").notNull(),
    studentId: int("studentId").notNull(),
    reason: mysqlEnum("reason", ["learner_requested", "safeguarding", "out_of_scope", "needs_teacher_review"]).notNull(),
    status: mysqlEnum("status", ["open", "acknowledged", "closed"]).notNull().default("open"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    acknowledgedAt: timestamp("acknowledgedAt"),
    acknowledgedBy: int("acknowledgedBy"),
  },
  table => ({ schoolStatus: index("aiTutorEscalation_school_status_idx").on(table.schoolId, table.status), tutorStudent: index("aiTutorEscalation_tutor_student_idx").on(table.tutorId, table.studentId) }),
);

export const aiTutorInteractions = mysqlTable(
  "aiTutorInteractions",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    tutorId: int("tutorId").notNull(),
    studentId: int("studentId").notNull(),
    interactionKey: varchar("interactionKey", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ interactionKeyUnique: uniqueIndex("aiTutorInteraction_key_unique").on(table.interactionKey), schoolTutor: index("aiTutorInteraction_school_tutor_idx").on(table.schoolId, table.tutorId), studentTutor: index("aiTutorInteraction_student_tutor_idx").on(table.studentId, table.tutorId) }),
);

export const aiTutorFeedback = mysqlTable(
  "aiTutorFeedback",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    tutorId: int("tutorId").notNull(),
    studentId: int("studentId").notNull(),
    interactionId: int("interactionId").notNull(),
    helpfulness: mysqlEnum("helpfulness", ["helpful", "partly_helpful", "not_helpful"]).notNull(),
    comment: varchar("comment", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ interactionUnique: uniqueIndex("aiTutorFeedback_interaction_unique").on(table.interactionId), schoolTutor: index("aiTutorFeedback_school_tutor_idx").on(table.schoolId, table.tutorId), studentTutor: index("aiTutorFeedback_student_tutor_idx").on(table.studentId, table.tutorId) }),
);

export const aiTutorTeachingPreferences = mysqlTable(
  "aiTutorTeachingPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    tutorId: int("tutorId").notNull(),
    studentId: int("studentId").notNull(),
    adaptationEnabled: boolean("adaptationEnabled").notNull().default(true),
    preferredStyle: mysqlEnum("preferredStyle", ["balanced", "step_by_step", "worked_examples", "concise_review"]).notNull().default("balanced"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ studentTutor: uniqueIndex("aiTutorTeachingPreference_student_tutor_unique").on(table.studentId, table.tutorId), schoolTutor: index("aiTutorTeachingPreference_school_tutor_idx").on(table.schoolId, table.tutorId) }),
);

export const securityAuditEvents = mysqlTable(
  "securityAuditEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("schoolId").notNull(),
    actorUserId: int("actorUserId"),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    targetType: varchar("targetType", { length: 96 }).notNull(),
    targetId: varchar("targetId", { length: 128 }),
    metadata: json("metadata").notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => ({ schoolOccurred: index("securityAudit_school_occurred_idx").on(table.schoolId, table.occurredAt), actorOccurred: index("securityAudit_actor_occurred_idx").on(table.actorUserId, table.occurredAt) }),
);

export const rateLimitBuckets = mysqlTable(
  "rateLimitBuckets",
  {
    bucketKey: varchar("bucketKey", { length: 128 }).primaryKey(),
    count: int("count").notNull().default(0),
    expiresAt: timestamp("expiresAt").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ expiresIndex: index("rateLimit_expires_idx").on(table.expiresAt) }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
