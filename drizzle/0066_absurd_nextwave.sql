CREATE TABLE `platformOwnerIdentityLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `platformOwnerIdentityLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `platformOwnerIdentityLinks_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `platformOwnerIdentityLink_status_idx` ON `platformOwnerIdentityLinks` (`status`);