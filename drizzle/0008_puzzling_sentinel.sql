CREATE TABLE `securityAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`actorUserId` int,
	`eventType` varchar(96) NOT NULL,
	`targetType` varchar(96) NOT NULL,
	`targetId` varchar(128),
	`metadata` json NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `securityAuditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `securityAudit_school_occurred_idx` ON `securityAuditEvents` (`schoolId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `securityAudit_actor_occurred_idx` ON `securityAuditEvents` (`actorUserId`,`occurredAt`);