CREATE TABLE `schoolOperatorWorkflowPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`reviewFocus` enum('balanced','learning','admissions','revenue','operational_readiness') NOT NULL DEFAULT 'balanced',
	`reviewCadence` enum('daily','weekly','monthly') NOT NULL DEFAULT 'weekly',
	`evidenceDetail` enum('concise','standard') NOT NULL DEFAULT 'standard',
	`showDismissedInsights` boolean NOT NULL DEFAULT false,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolOperatorWorkflowPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_operator_workflow_preference_school_unique` UNIQUE(`schoolId`)
);
