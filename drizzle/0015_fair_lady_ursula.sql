CREATE TABLE `authIdentities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('google','email') NOT NULL,
	`providerSubject` varchar(320) NOT NULL,
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authIdentities_id` PRIMARY KEY(`id`),
	CONSTRAINT `authIdentity_provider_subject_unique` UNIQUE(`provider`,`providerSubject`)
);
--> statement-breakpoint
CREATE TABLE `authMagicLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`redirectOrigin` varchar(512) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authMagicLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `authMagicLink_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `authIdentity_user_idx` ON `authIdentities` (`userId`);--> statement-breakpoint
CREATE INDEX `authIdentity_email_idx` ON `authIdentities` (`email`);--> statement-breakpoint
CREATE INDEX `authMagicLink_email_created_idx` ON `authMagicLinks` (`email`,`createdAt`);--> statement-breakpoint
CREATE INDEX `authMagicLink_expiry_idx` ON `authMagicLinks` (`expiresAt`);