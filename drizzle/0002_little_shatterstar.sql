ALTER TABLE `resultPublications` MODIFY COLUMN `status` enum('draft','approved','published','withdrawn') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN `status` enum('pending','verified','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN `reviewNote` text;--> statement-breakpoint
ALTER TABLE `resultPublications` ADD COLUMN `approvedBy` int;--> statement-breakpoint
ALTER TABLE `resultPublications` ADD COLUMN `approvedAt` timestamp;
