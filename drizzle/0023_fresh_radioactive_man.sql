CREATE TABLE `advertisingCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`advertisingAccountId` int NOT NULL,
	`provider` enum('meta') NOT NULL DEFAULT 'meta',
	`name` varchar(160) NOT NULL,
	`objective` enum('lead_generation','website_visits','awareness') NOT NULL,
	`destinationUrl` varchar(2048),
	`primaryText` text NOT NULL,
	`headline` varchar(255) NOT NULL,
	`callToAction` enum('learn_more','apply_now','contact_us') NOT NULL DEFAULT 'learn_more',
	`audienceSummary` json NOT NULL,
	`dailyBudget` decimal(12,2) NOT NULL,
	`totalBudget` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`startsAt` timestamp,
	`endsAt` timestamp,
	`status` enum('draft','pending_approval','approved','launching','active','paused','completed','failed','archived') NOT NULL DEFAULT 'draft',
	`providerCampaignId` varchar(160),
	`providerStatus` varchar(96),
	`lastProviderError` varchar(500),
	`createdBy` int NOT NULL,
	`approvedBy` int,
	`approvedAt` timestamp,
	`launchedBy` int,
	`launchedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advertisingCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schoolAdvertisingAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`provider` enum('meta') NOT NULL DEFAULT 'meta',
	`status` enum('not_connected','connected','attention','disabled') NOT NULL DEFAULT 'not_connected',
	`accountName` varchar(160),
	`externalAccountId` varchar(160),
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`encryptedCredentials` text,
	`connectedBy` int,
	`lastValidatedAt` timestamp,
	`webhookStatus` enum('not_configured','pending','active') NOT NULL DEFAULT 'not_configured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolAdvertisingAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `schoolAdvertisingAccount_school_provider_unique` UNIQUE(`schoolId`,`provider`)
);
--> statement-breakpoint
CREATE INDEX `advertisingCampaign_school_status_idx` ON `advertisingCampaigns` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `advertisingCampaign_account_status_idx` ON `advertisingCampaigns` (`advertisingAccountId`,`status`);--> statement-breakpoint
CREATE INDEX `advertisingCampaign_provider_id_idx` ON `advertisingCampaigns` (`providerCampaignId`);--> statement-breakpoint
CREATE INDEX `schoolAdvertisingAccount_school_idx` ON `schoolAdvertisingAccounts` (`schoolId`);