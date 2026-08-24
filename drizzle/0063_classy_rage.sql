ALTER TABLE `institutionKnowledgeAnalyses` ADD `sourceRevision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `institutionKnowledgeAnalyses` ADD `provenance` json;--> statement-breakpoint
ALTER TABLE `institutionKnowledgeSources` ADD `sourceFormat` enum('pasted_text','txt','markdown','csv','transcript_text') DEFAULT 'pasted_text' NOT NULL;--> statement-breakpoint
ALTER TABLE `institutionKnowledgeSources` ADD `originalFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `institutionKnowledgeSources` ADD `mimeType` varchar(120);--> statement-breakpoint
ALTER TABLE `institutionKnowledgeSources` ADD `storageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `institutionKnowledgeSources` ADD `byteSize` int;--> statement-breakpoint
ALTER TABLE `institutionKnowledgeSources` ADD `sourceRevision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `institutionKnowledgeSources` ADD `sourceFingerprint` varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `institution_knowledge_analysis_school_source_revision_idx` ON `institutionKnowledgeAnalyses` (`schoolId`,`sourceId`,`sourceRevision`);--> statement-breakpoint
CREATE INDEX `institution_knowledge_source_school_revision_idx` ON `institutionKnowledgeSources` (`schoolId`,`sourceRevision`);