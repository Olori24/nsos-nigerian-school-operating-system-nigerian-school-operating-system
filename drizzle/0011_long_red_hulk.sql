CREATE TABLE `cashAssuranceCaseInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`snapshotOutstandingAmount` decimal(12,2) NOT NULL,
	`includedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cashAssuranceCaseInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `cashAssuranceCaseInvoice_unique` UNIQUE(`caseId`,`invoiceId`)
);
--> statement-breakpoint
CREATE TABLE `cashAssuranceCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`studentId` int NOT NULL,
	`guardianId` int,
	`status` enum('open','contact_due','awaiting_promise','payment_under_review','disputed','escalated','settled','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`assignedTo` int,
	`nextActionAt` timestamp,
	`pausedReason` text,
	`openedBy` int NOT NULL,
	`closedBy` int,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cashAssuranceCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashAssuranceEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`caseId` int NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`actorType` enum('user','guardian','system') NOT NULL DEFAULT 'user',
	`actorUserId` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cashAssuranceEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`caseId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`amountClaimed` decimal(12,2) NOT NULL,
	`source` enum('manual_receipt','bank_reference','provider_event','other') NOT NULL DEFAULT 'manual_receipt',
	`providerReference` varchar(160),
	`note` text,
	`status` enum('submitted','under_review','accepted','rejected') NOT NULL DEFAULT 'submitted',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`linkedPaymentId` int,
	`reviewNote` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentPromises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`caseId` int NOT NULL,
	`promisedAmount` decimal(12,2) NOT NULL,
	`promisedOn` date NOT NULL,
	`note` text,
	`status` enum('open','fulfilled','overdue','cancelled') NOT NULL DEFAULT 'open',
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentPromises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `cashAssuranceCaseInvoice_invoice_idx` ON `cashAssuranceCaseInvoices` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `cashAssuranceCase_school_status_idx` ON `cashAssuranceCases` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `cashAssuranceCase_student_idx` ON `cashAssuranceCases` (`studentId`);--> statement-breakpoint
CREATE INDEX `cashAssuranceCase_assignee_idx` ON `cashAssuranceCases` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `cashAssuranceEvent_case_created_idx` ON `cashAssuranceEvents` (`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `cashAssuranceEvent_school_created_idx` ON `cashAssuranceEvents` (`schoolId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `paymentEvidence_school_status_idx` ON `paymentEvidence` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `paymentEvidence_case_idx` ON `paymentEvidence` (`caseId`);--> statement-breakpoint
CREATE INDEX `paymentEvidence_invoice_idx` ON `paymentEvidence` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `paymentPromise_case_idx` ON `paymentPromises` (`caseId`);--> statement-breakpoint
CREATE INDEX `paymentPromise_school_status_idx` ON `paymentPromises` (`schoolId`,`status`);