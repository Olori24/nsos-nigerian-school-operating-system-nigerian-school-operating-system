CREATE TABLE `schemeOfWorkImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classId` int NOT NULL,
	`subjectId` int NOT NULL,
	`termId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(1024) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`contentSha256` varchar(64) NOT NULL,
	`rowCount` int NOT NULL,
	`importedBy` int NOT NULL,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schemeOfWorkImports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `schemeOfWorkImport_school_imported_idx` ON `schemeOfWorkImports` (`schoolId`,`importedAt`);--> statement-breakpoint
CREATE INDEX `schemeOfWorkImport_class_subject_term_idx` ON `schemeOfWorkImports` (`schoolId`,`classId`,`subjectId`,`termId`);