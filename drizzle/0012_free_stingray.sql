ALTER TABLE `paymentEvidence` ADD `evidenceFileKey` varchar(512);--> statement-breakpoint
ALTER TABLE `paymentEvidence` ADD `evidenceFileUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `paymentEvidence` ADD `evidenceFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `paymentEvidence` ADD `evidenceMimeType` varchar(96);--> statement-breakpoint
ALTER TABLE `paymentEvidence` ADD `evidenceFileSize` int;