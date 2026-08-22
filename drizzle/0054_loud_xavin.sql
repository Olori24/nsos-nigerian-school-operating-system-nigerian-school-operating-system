CREATE TABLE `learningEvidenceSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`organisation` varchar(180) NOT NULL,
	`sourceUrl` varchar(2048) NOT NULL,
	`category` enum('institution_approved','professional_body','learning_resource') NOT NULL DEFAULT 'institution_approved',
	`allowedUse` varchar(500) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdBy` int NOT NULL,
	`approvedBy` int NOT NULL,
	`approvedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningEvidenceSources_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_evidence_source_school_title_unique` UNIQUE(`schoolId`,`title`)
);
--> statement-breakpoint
CREATE TABLE `learningExperienceProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`sourceReferences` json NOT NULL,
	`learningPace` enum('guided','flexible','intensive') NOT NULL DEFAULT 'guided',
	`supportStyle` enum('balanced','step_by_step','worked_examples','concise_review') NOT NULL DEFAULT 'balanced',
	`practiceMode` enum('reflection','guided_practice','project_based') NOT NULL DEFAULT 'guided_practice',
	`accessibilityNote` varchar(500),
	`tutorScope` varchar(700),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningExperienceProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_experience_profile_school_program_unique` UNIQUE(`schoolId`,`programId`)
);
--> statement-breakpoint
CREATE TABLE `programCertificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`policyId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`certificateReference` varchar(80) NOT NULL,
	`evidenceSummary` varchar(1200) NOT NULL,
	`status` enum('issued','revoked') NOT NULL DEFAULT 'issued',
	`issuedBy` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedBy` int,
	`revokedAt` timestamp,
	`revocationNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programCertificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_certificate_reference_unique` UNIQUE(`certificateReference`),
	CONSTRAINT `program_certificate_school_enrollment_unique` UNIQUE(`schoolId`,`enrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `programCertificationPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`issuerName` varchar(180) NOT NULL,
	`credentialTitle` varchar(180) NOT NULL,
	`completionCriteria` varchar(1200) NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`activatedBy` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programCertificationPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_certification_policy_school_program_unique` UNIQUE(`schoolId`,`programId`)
);
--> statement-breakpoint
CREATE INDEX `learning_evidence_source_school_status_idx` ON `learningEvidenceSources` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `learning_experience_profile_school_status_idx` ON `learningExperienceProfiles` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `program_certificate_school_policy_idx` ON `programCertificates` (`schoolId`,`policyId`);--> statement-breakpoint
CREATE INDEX `program_certification_policy_school_status_idx` ON `programCertificationPolicies` (`schoolId`,`status`);