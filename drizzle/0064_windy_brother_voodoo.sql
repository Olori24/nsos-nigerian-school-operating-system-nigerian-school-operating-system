CREATE TABLE `institutionKnowledgeSourceRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`sourceId` int NOT NULL,
	`createdBy` int NOT NULL,
	`revision` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`sourceText` text NOT NULL,
	`sourceFormat` enum('pasted_text','txt','markdown','csv','transcript_text') NOT NULL,
	`originalFileName` varchar(255),
	`mimeType` varchar(120),
	`storageKey` varchar(512),
	`byteSize` int,
	`sourceFingerprint` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `institutionKnowledgeSourceRevisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `institution_knowledge_revision_school_source_revision_unique` UNIQUE(`schoolId`,`sourceId`,`revision`)
);
--> statement-breakpoint
CREATE INDEX `institution_knowledge_revision_school_source_created_idx` ON `institutionKnowledgeSourceRevisions` (`schoolId`,`sourceId`,`createdAt`);