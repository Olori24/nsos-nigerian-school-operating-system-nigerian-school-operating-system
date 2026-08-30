CREATE TABLE `welcomeEmailDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`status` enum('queued','sending','sent','failed') NOT NULL DEFAULT 'queued',
	`attemptCount` int NOT NULL DEFAULT 0,
	`providerMessageId` varchar(255),
	`lastError` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`sentAt` timestamp,
	CONSTRAINT `welcomeEmailDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `welcomeEmailDeliveries_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `welcomeEmailDelivery_status_idx` ON `welcomeEmailDeliveries` (`status`,`updatedAt`);