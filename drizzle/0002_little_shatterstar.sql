ALTER TABLE `resultPublications` MODIFY COLUMN `status` enum('draft','approved','published','withdrawn') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN IF NOT EXISTS `status` enum('pending','verified','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN IF NOT EXISTS `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN IF NOT EXISTS `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD COLUMN IF NOT EXISTS `reviewNote` text;--> statement-breakpoint
ALTER TABLE `resultPublications` ADD COLUMN IF NOT EXISTS `approvedBy` int;--> statement-breakpoint
ALTER TABLE `resultPublications` ADD COLUMN IF NOT EXISTS `approvedAt` timestamp;
