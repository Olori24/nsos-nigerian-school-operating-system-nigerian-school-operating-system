CREATE TABLE `affiliatePartners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(48) NOT NULL,
	`name` varchar(160) NOT NULL,
	`destinationUrl` varchar(2048) NOT NULL,
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`commissionType` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
	`commissionValue` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`attributionDays` int NOT NULL DEFAULT 30,
	`termsVersion` varchar(64),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliatePartners_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliatePartner_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `affiliateClicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`clickId` varchar(64) NOT NULL,
	`ipHash` varchar(64),
	`userAgentHash` varchar(64),
	`referrer` varchar(2048),
	`landingPath` varchar(2048),
	`utmSource` varchar(160),
	`utmMedium` varchar(160),
	`utmCampaign` varchar(160),
	`utmContent` varchar(160),
	`utmTerm` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliateClicks_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliateClick_click_id_unique` UNIQUE(`clickId`)
);
--> statement-breakpoint
CREATE TABLE `affiliateLeads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`clickId` varchar(64),
	`emailHash` varchar(64) NOT NULL,
	`leadSource` varchar(120),
	`consentedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliateLeads_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliateLead_partner_email_unique` UNIQUE(`partnerId`,`emailHash`)
);
--> statement-breakpoint
CREATE TABLE `affiliateConversions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`leadId` int,
	`clickId` varchar(64),
	`externalReference` varchar(160) NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`commissionAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`status` enum('pending','approved','reversed') NOT NULL DEFAULT 'pending',
	`occurredAt` timestamp NOT NULL,
	`approvedAt` timestamp,
	`approvedBy` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliateConversions_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliateConversion_external_ref_unique` UNIQUE(`externalReference`)
);
--> statement-breakpoint
CREATE TABLE `affiliatePayouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`status` enum('pending','approved','paid','void') NOT NULL DEFAULT 'pending',
	`paymentReference` varchar(160),
	`note` text,
	`createdBy` int NOT NULL,
	`approvedBy` int,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliatePayouts_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliatePayout_partner_period_unique` UNIQUE(`partnerId`,`periodStart`,`periodEnd`)
);
--> statement-breakpoint
CREATE TABLE `affiliatePayoutItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payoutId` int NOT NULL,
	`conversionId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliatePayoutItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliatePayoutItem_payout_conversion_unique` UNIQUE(`payoutId`,`conversionId`)
);
--> statement-breakpoint
CREATE INDEX `affiliatePartner_status_idx` ON `affiliatePartners` (`status`);
--> statement-breakpoint
CREATE INDEX `affiliateClick_partner_created_idx` ON `affiliateClicks` (`partnerId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `affiliateLead_click_idx` ON `affiliateLeads` (`clickId`);
--> statement-breakpoint
CREATE INDEX `affiliateLead_partner_created_idx` ON `affiliateLeads` (`partnerId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `affiliateConversion_partner_status_idx` ON `affiliateConversions` (`partnerId`,`status`);
--> statement-breakpoint
CREATE INDEX `affiliateConversion_partner_occurred_idx` ON `affiliateConversions` (`partnerId`,`occurredAt`);
--> statement-breakpoint
CREATE INDEX `affiliatePayout_partner_status_idx` ON `affiliatePayouts` (`partnerId`,`status`);
