CREATE TABLE `affiliatePilotConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programmeKey` varchar(48) NOT NULL DEFAULT 'nsos-internal-pilot',
	`status` enum('internal_review','activation_blocked') NOT NULL DEFAULT 'internal_review',
	`attributionWindowDays` int NOT NULL DEFAULT 30,
	`refundHoldDays` int NOT NULL DEFAULT 30,
	`minimumPayout` decimal(12,2) NOT NULL DEFAULT '10000.00',
	`payoutFrequency` enum('monthly_manual') NOT NULL DEFAULT 'monthly_manual',
	`eligiblePlanPolicy` enum('standard_paid_subscriptions_only') NOT NULL DEFAULT 'standard_paid_subscriptions_only',
	`commissionRateBasisPoints` int NOT NULL DEFAULT 2000,
	`termsStatus` enum('legal_review_required') NOT NULL DEFAULT 'legal_review_required',
	`confirmedBy` int NOT NULL,
	`confirmedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliatePilotConfigurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliatePilot_programme_key_unique` UNIQUE(`programmeKey`)
);
--> statement-breakpoint
CREATE TABLE `affiliatePilotEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configurationId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` enum('defaults_confirmed') NOT NULL,
	`metadata` json NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliatePilotEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `affiliatePilot_status_idx` ON `affiliatePilotConfigurations` (`status`);--> statement-breakpoint
CREATE INDEX `affiliatePilotEvent_configuration_occurred_idx` ON `affiliatePilotEvents` (`configurationId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `affiliatePilotEvent_actor_occurred_idx` ON `affiliatePilotEvents` (`actorUserId`,`occurredAt`);