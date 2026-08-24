CREATE TABLE `institutionKnowledgeAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`sourceId` int NOT NULL,
	`createdBy` int NOT NULL,
	`analysis` json NOT NULL,
	`sourceVersion` varchar(48) NOT NULL DEFAULT 'knowledge-business-v1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionKnowledgeAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `institutionKnowledgeSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`createdBy` int NOT NULL,
	`sourceType` enum('description','expertise_notes','structured_notes','course_material','transcript') NOT NULL,
	`title` varchar(180) NOT NULL,
	`sourceText` text NOT NULL,
	`status` enum('ready','archived') NOT NULL DEFAULT 'ready',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionKnowledgeSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `institution_knowledge_analysis_school_created_idx` ON `institutionKnowledgeAnalyses` (`schoolId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `institution_knowledge_analysis_school_source_idx` ON `institutionKnowledgeAnalyses` (`schoolId`,`sourceId`);--> statement-breakpoint
CREATE INDEX `institution_knowledge_source_school_created_idx` ON `institutionKnowledgeSources` (`schoolId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `institution_knowledge_source_school_status_idx` ON `institutionKnowledgeSources` (`schoolId`,`status`);