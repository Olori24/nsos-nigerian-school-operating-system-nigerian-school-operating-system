ALTER TABLE `admissionDocuments` ADD `documentType` enum('supporting_document','passport_photo','admission_fee_receipt') DEFAULT 'supporting_document' NOT NULL;--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD `fileName` varchar(180);--> statement-breakpoint
ALTER TABLE `admissionDocuments` ADD `byteSize` int;--> statement-breakpoint
ALTER TABLE `schoolDocumentTemplates` ADD `requirePassportPhoto` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `schoolDocumentTemplates` ADD `requireAdmissionFeeReceipt` boolean DEFAULT false NOT NULL;