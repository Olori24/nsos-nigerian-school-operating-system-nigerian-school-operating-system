CREATE TABLE `programAttendanceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`attendanceDate` date NOT NULL,
	`status` enum('present','late','absent','excused') NOT NULL,
	`note` varchar(500),
	`recordedBy` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `programAttendanceRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_attendance_enrolment_date_unique` UNIQUE(`enrollmentId`,`attendanceDate`)
);
--> statement-breakpoint
CREATE TABLE `programFeeStructures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`programId` int NOT NULL,
	`cohortId` int,
	`name` varchar(180) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`mandatory` boolean NOT NULL DEFAULT true,
	`dueOn` date,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`activatedBy` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programFeeStructures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `program_attendance_school_date_idx` ON `programAttendanceRecords` (`schoolId`,`attendanceDate`);--> statement-breakpoint
CREATE INDEX `program_fee_school_program_idx` ON `programFeeStructures` (`schoolId`,`programId`);--> statement-breakpoint
CREATE INDEX `program_fee_school_cohort_idx` ON `programFeeStructures` (`schoolId`,`cohortId`);