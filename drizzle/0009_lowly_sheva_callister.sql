CREATE TABLE `rateLimitBuckets` (
	`bucketKey` varchar(128) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rateLimitBuckets_bucketKey` PRIMARY KEY(`bucketKey`)
);
--> statement-breakpoint
CREATE INDEX `rateLimit_expires_idx` ON `rateLimitBuckets` (`expiresAt`);