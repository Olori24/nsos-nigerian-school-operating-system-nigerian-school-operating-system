CREATE TABLE `marketingCampaignDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('queued','sent','failed','suppressed') NOT NULL DEFAULT 'queued',
	`providerMessageId` varchar(255),
	`lastError` varchar(500),
	`queuedAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `marketingCampaignDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketingCampaignDelivery_campaign_user_unique` UNIQUE(`campaignId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `marketingCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`status` enum('draft','approved','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`approvedBy` int,
	`approvedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketingCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketingConsentEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('subscribed','unsubscribed') NOT NULL,
	`source` varchar(64) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketingConsentEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketingSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('subscribed','unsubscribed') NOT NULL DEFAULT 'unsubscribed',
	`consentSource` varchar(64),
	`consentedAt` timestamp,
	`unsubscribedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketingSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketingSubscription_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `marketingCampaignDelivery_campaign_status_idx` ON `marketingCampaignDeliveries` (`campaignId`,`status`);--> statement-breakpoint
CREATE INDEX `marketingCampaignDelivery_user_idx` ON `marketingCampaignDeliveries` (`userId`);--> statement-breakpoint
CREATE INDEX `marketingCampaign_status_idx` ON `marketingCampaigns` (`status`);--> statement-breakpoint
CREATE INDEX `marketingCampaign_creator_idx` ON `marketingCampaigns` (`createdBy`);--> statement-breakpoint
CREATE INDEX `marketingConsentEvent_user_occurred_idx` ON `marketingConsentEvents` (`userId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `marketingSubscription_status_idx` ON `marketingSubscriptions` (`status`);