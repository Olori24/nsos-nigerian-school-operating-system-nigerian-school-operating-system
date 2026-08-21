ALTER TABLE `schemeOfWorkRows` ADD `assignedTeacherId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `schemeOfWorkRows` ADD `reviewStatus` enum('pending_review','approved','returned','published') DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `schemeOfWorkRows` ADD `reviewNote` text;--> statement-breakpoint
ALTER TABLE `schemeOfWorkRows` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `schemeOfWorkRows` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `schemeOfWorkRows` ADD `publishedBy` int;--> statement-breakpoint
ALTER TABLE `schemeOfWorkRows` ADD `publishedAt` timestamp;--> statement-breakpoint
CREATE INDEX `schemeOfWorkRow_teacher_review_idx` ON `schemeOfWorkRows` (`assignedTeacherId`,`reviewStatus`);