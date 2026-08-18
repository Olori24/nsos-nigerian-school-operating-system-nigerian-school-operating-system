CREATE TABLE IF NOT EXISTS `academicSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`startsOn` date NOT NULL,
	`endsOn` date NOT NULL,
	`isCurrent` boolean NOT NULL DEFAULT false,
	`status` enum('planning','active','closed') NOT NULL DEFAULT 'planning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academicSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `academicTerms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`sessionId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`startsOn` date NOT NULL,
	`endsOn` date NOT NULL,
	`isCurrent` boolean NOT NULL DEFAULT false,
	`status` enum('planning','active','closed') NOT NULL DEFAULT 'planning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academicTerms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admissionDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(120),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admissionDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admissionsApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`applicationNo` varchar(64) NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`dateOfBirth` date,
	`gender` enum('female','male','other','prefer_not_to_say'),
	`applyingForClassId` int,
	`guardianName` varchar(255) NOT NULL,
	`guardianEmail` varchar(320),
	`guardianPhone` varchar(48) NOT NULL,
	`priorSchool` varchar(255),
	`notes` text,
	`status` enum('submitted','under_review','accepted','declined','enrolled') NOT NULL DEFAULT 'submitted',
	`reviewerId` int,
	`decisionNote` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	CONSTRAINT `admissionsApplications_id` PRIMARY KEY(`id`),
	CONSTRAINT `application_school_no_unique` UNIQUE(`schoolId`,`applicationNo`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`audience` enum('everyone','staff','students','guardians','class') NOT NULL DEFAULT 'everyone',
	`classId` int,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`termId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`assessmentType` enum('assignment','test','project','exam','practical') NOT NULL,
	`maximumScore` int NOT NULL,
	`weight` decimal(5,2) NOT NULL DEFAULT '100.00',
	`heldOn` date,
	`status` enum('draft','open','locked','published') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendanceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`attendeeType` enum('student','staff') NOT NULL,
	`studentId` int,
	`staffId` int,
	`classId` int,
	`attendanceDate` date NOT NULL,
	`status` enum('present','late','absent','excused') NOT NULL,
	`note` text,
	`recordedBy` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendanceRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_student_date_unique` UNIQUE(`studentId`,`attendanceDate`),
	CONSTRAINT `attendance_staff_date_unique` UNIQUE(`staffId`,`attendanceDate`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `classSubjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`teacherId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classSubjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_subject_unique` UNIQUE(`classId`,`subjectId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`sessionId` int,
	`name` varchar(120) NOT NULL,
	`level` varchar(64),
	`arm` varchar(32),
	`capacity` int,
	`classTeacherId` int,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_school_name_unique` UNIQUE(`schoolId`,`name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `curriculumMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classSubjectId` int NOT NULL,
	`termId` int,
	`title` varchar(255) NOT NULL,
	`targetWeek` int,
	`completionPercentage` int NOT NULL DEFAULT 0,
	`status` enum('not_started','in_progress','complete') NOT NULL DEFAULT 'not_started',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `curriculumMilestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(24),
	`headStaffId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `department_school_name_unique` UNIQUE(`schoolId`,`name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`studentId` int NOT NULL,
	`classId` int NOT NULL,
	`sessionId` int NOT NULL,
	`status` enum('active','promoted','graduated','withdrawn') NOT NULL DEFAULT 'active',
	`enrolledOn` date NOT NULL,
	`promotionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollment_student_session_unique` UNIQUE(`studentId`,`sessionId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `feeStructures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`termId` int,
	`classId` int,
	`name` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`mandatory` boolean NOT NULL DEFAULT true,
	`dueOn` date,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feeStructures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gradeScales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`label` varchar(12) NOT NULL,
	`minPercentage` decimal(5,2) NOT NULL,
	`maxPercentage` decimal(5,2) NOT NULL,
	`remark` varchar(255),
	`sortOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gradeScales_id` PRIMARY KEY(`id`),
	CONSTRAINT `grade_school_label_unique` UNIQUE(`schoolId`,`label`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `guardians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`relationship` varchar(80) NOT NULL,
	`email` varchar(320),
	`phone` varchar(48),
	`address` text,
	`occupation` varchar(160),
	`isPrimaryContact` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardians_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `invoiceLineItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`feeStructureId` int,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitAmount` decimal(12,2) NOT NULL,
	`lineTotal` decimal(12,2) NOT NULL,
	CONSTRAINT `invoiceLineItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`studentId` int NOT NULL,
	`termId` int,
	`invoiceNo` varchar(64) NOT NULL,
	`issueDate` date NOT NULL,
	`dueDate` date,
	`subtotal` decimal(12,2) NOT NULL,
	`discount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total` decimal(12,2) NOT NULL,
	`amountPaid` decimal(12,2) NOT NULL DEFAULT '0.00',
	`status` enum('draft','issued','partial','paid','overdue','void') NOT NULL DEFAULT 'draft',
	`note` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_school_no_unique` UNIQUE(`schoolId`,`invoiceNo`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leaveRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`staffId` int NOT NULL,
	`leaveType` enum('annual','sick','maternity','paternity','compassionate','other') NOT NULL,
	`startsOn` date NOT NULL,
	`endsOn` date NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','approved','declined','cancelled') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `lessonPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`teacherId` int NOT NULL,
	`termId` int,
	`weekNo` int NOT NULL,
	`topic` varchar(255) NOT NULL,
	`objectives` text,
	`resources` text,
	`status` enum('draft','submitted','approved','delivered') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lessonPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `messageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`channel` enum('in_app','email','sms','whatsapp') NOT NULL,
	`audience` enum('everyone','staff','students','guardians','class') NOT NULL,
	`subject` varchar(255),
	`body` text NOT NULL,
	`recipientCount` int NOT NULL DEFAULT 0,
	`status` enum('queued','sent','failed') NOT NULL DEFAULT 'queued',
	`createdBy` int NOT NULL,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`receiptNo` varchar(64) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paidOn` date NOT NULL,
	`method` enum('cash','bank_transfer','card','pos','cheque','other') NOT NULL,
	`reference` varchar(160),
	`recordedBy` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_school_receipt_unique` UNIQUE(`schoolId`,`receiptNo`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payrollRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`staffId` int NOT NULL,
	`periodLabel` varchar(64) NOT NULL,
	`grossPay` decimal(12,2) NOT NULL,
	`deductions` decimal(12,2) NOT NULL DEFAULT '0.00',
	`netPay` decimal(12,2) NOT NULL,
	`status` enum('draft','approved','paid','void') NOT NULL DEFAULT 'draft',
	`paidOn` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payrollRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_staff_period_unique` UNIQUE(`staffId`,`periodLabel`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `performanceNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`staffId` int NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`note` text NOT NULL,
	`visibility` enum('private','shared') NOT NULL DEFAULT 'private',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performanceNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resultPublications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`termId` int NOT NULL,
	`classId` int NOT NULL,
	`status` enum('draft','published','withdrawn') NOT NULL DEFAULT 'draft',
	`publishedBy` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resultPublications_id` PRIMARY KEY(`id`),
	CONSTRAINT `result_term_class_unique` UNIQUE(`termId`,`classId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schoolMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','staff','teacher','finance','parent','student') NOT NULL DEFAULT 'staff',
	`status` enum('active','invited','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `schoolMembership_school_user_unique` UNIQUE(`schoolId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`shortCode` varchar(32) NOT NULL,
	`email` varchar(320),
	`phone` varchar(48),
	`address` text,
	`state` varchar(100),
	`logoUrl` text,
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`timezone` varchar(64) NOT NULL DEFAULT 'Africa/Lagos',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`),
	CONSTRAINT `schools_shortCode_unique` UNIQUE(`shortCode`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`studentId` int NOT NULL,
	`score` decimal(7,2) NOT NULL,
	`comment` text,
	`enteredBy` int NOT NULL,
	`enteredAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `score_assessment_student_unique` UNIQUE(`assessmentId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staffProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int,
	`employeeNo` varchar(48) NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`email` varchar(320),
	`phone` varchar(48),
	`departmentId` int,
	`jobTitle` varchar(120) NOT NULL,
	`employmentType` enum('full_time','part_time','contract','temporary') NOT NULL DEFAULT 'full_time',
	`employmentStatus` enum('active','on_leave','suspended','exited') NOT NULL DEFAULT 'active',
	`joinedOn` date,
	`address` text,
	`emergencyContact` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_school_employee_unique` UNIQUE(`schoolId`,`employeeNo`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `studentGuardians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`guardianId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentGuardians_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_guardian_unique` UNIQUE(`studentId`,`guardianId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `studentProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int,
	`admissionNo` varchar(64) NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`middleName` varchar(120),
	`dateOfBirth` date,
	`gender` enum('female','male','other','prefer_not_to_say'),
	`email` varchar(320),
	`phone` varchar(48),
	`address` text,
	`stateOfOrigin` varchar(120),
	`localGovernment` varchar(120),
	`medicalNotes` text,
	`status` enum('active','graduated','withdrawn','suspended','alumni') NOT NULL DEFAULT 'active',
	`admittedOn` date,
	`graduationYear` int,
	`avatarUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_school_admission_unique` UNIQUE(`schoolId`,`admissionNo`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`departmentId` int,
	`description` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subject_school_code_unique` UNIQUE(`schoolId`,`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `timetableEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`teacherId` int,
	`dayOfWeek` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
	`startsAt` varchar(8) NOT NULL,
	`endsAt` varchar(8) NOT NULL,
	`room` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timetableEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `academicSession_school_idx` ON `academicSessions` (`schoolId`);--> statement-breakpoint
CREATE INDEX `academicTerm_school_idx` ON `academicTerms` (`schoolId`);--> statement-breakpoint
CREATE INDEX `admissionDocument_application_idx` ON `admissionDocuments` (`applicationId`);--> statement-breakpoint
CREATE INDEX `application_school_idx` ON `admissionsApplications` (`schoolId`);--> statement-breakpoint
CREATE INDEX `announcement_school_idx` ON `announcements` (`schoolId`);--> statement-breakpoint
CREATE INDEX `assessment_school_idx` ON `assessments` (`schoolId`);--> statement-breakpoint
CREATE INDEX `attendance_school_date_idx` ON `attendanceRecords` (`schoolId`,`attendanceDate`);--> statement-breakpoint
CREATE INDEX `curriculum_school_idx` ON `curriculumMilestones` (`schoolId`);--> statement-breakpoint
CREATE INDEX `enrollment_school_idx` ON `enrollments` (`schoolId`);--> statement-breakpoint
CREATE INDEX `feeStructure_school_idx` ON `feeStructures` (`schoolId`);--> statement-breakpoint
CREATE INDEX `guardian_school_idx` ON `guardians` (`schoolId`);--> statement-breakpoint
CREATE INDEX `invoice_student_idx` ON `invoices` (`studentId`);--> statement-breakpoint
CREATE INDEX `leave_school_idx` ON `leaveRequests` (`schoolId`);--> statement-breakpoint
CREATE INDEX `lessonPlan_school_idx` ON `lessonPlans` (`schoolId`);--> statement-breakpoint
CREATE INDEX `message_school_idx` ON `messageLogs` (`schoolId`);--> statement-breakpoint
CREATE INDEX `schoolMembership_school_idx` ON `schoolMemberships` (`schoolId`);--> statement-breakpoint
CREATE INDEX `staff_school_idx` ON `staffProfiles` (`schoolId`);--> statement-breakpoint
CREATE INDEX `student_school_idx` ON `studentProfiles` (`schoolId`);--> statement-breakpoint
CREATE INDEX `timetable_class_day_idx` ON `timetableEntries` (`classId`,`dayOfWeek`);
