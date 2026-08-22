CREATE TABLE `schoolWebsiteMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`purpose` enum('logo','hero') NOT NULL,
	`label` varchar(120) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schoolWebsiteMedia_id` PRIMARY KEY(`id`),
	CONSTRAINT `website_media_school_hash_unique` UNIQUE(`schoolId`,`sha256`)
);
--> statement-breakpoint
ALTER TABLE `schoolWebsites` ADD `logoMediaId` int;--> statement-breakpoint
ALTER TABLE `schoolWebsites` ADD `heroMediaId` int;--> statement-breakpoint
CREATE INDEX `website_media_school_created_idx` ON `schoolWebsiteMedia` (`schoolId`,`createdAt`);