CREATE TABLE `userSessions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`source` varchar(32) NOT NULL DEFAULT 'session',
	`deviceLabel` varchar(160) NOT NULL,
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`revokedReason` varchar(96),
	CONSTRAINT `userSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userSession_user_active_idx` ON `userSessions` (`userId`,`revokedAt`,`lastSeenAt`);--> statement-breakpoint
CREATE INDEX `userSession_expiry_idx` ON `userSessions` (`expiresAt`);