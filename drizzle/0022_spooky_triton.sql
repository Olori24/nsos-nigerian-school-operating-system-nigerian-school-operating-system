CREATE TABLE `copilotRecentSearches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`schoolId` int NOT NULL,
	`query` varchar(600) NOT NULL,
	`destinationId` varchar(32),
	`searchedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copilotRecentSearches_id` PRIMARY KEY(`id`),
	CONSTRAINT `copilotRecentSearch_user_school_query_unique` UNIQUE(`userId`,`schoolId`,`query`)
);
--> statement-breakpoint
CREATE INDEX `copilotRecentSearch_user_school_recent_idx` ON `copilotRecentSearches` (`userId`,`schoolId`,`searchedAt`);