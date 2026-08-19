CREATE TABLE `userSecurityActivity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`deviceLabel` varchar(160) NOT NULL,
	`locationLabel` varchar(160),
	`source` varchar(32) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userSecurityActivity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userSecurityActivity_user_occurred_idx` ON `userSecurityActivity` (`userId`,`occurredAt`);