CREATE TABLE `schemeOfWorkInlineComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`rowId` int NOT NULL,
	`anchor` enum('topic','objectives','resources') NOT NULL,
	`body` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schemeOfWorkInlineComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `schemeInlineComment_row_created_idx` ON `schemeOfWorkInlineComments` (`rowId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `schemeInlineComment_school_created_idx` ON `schemeOfWorkInlineComments` (`schoolId`,`createdAt`);