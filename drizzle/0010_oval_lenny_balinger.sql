CREATE TABLE `platformBillingRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`planId` int,
	`invoiceNo` varchar(64) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`status` enum('draft','issued','paid','void') NOT NULL DEFAULT 'draft',
	`issueDate` date NOT NULL,
	`dueDate` date,
	`paidAt` timestamp,
	`paymentMethod` enum('bank_transfer','card','manual') NOT NULL DEFAULT 'manual',
	`providerReference` varchar(160),
	`note` text,
	`createdBy` int NOT NULL,
	`settledBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformBillingRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `platformBilling_invoice_no_unique` UNIQUE(`invoiceNo`)
);
--> statement-breakpoint
CREATE TABLE `schoolSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`planId` int,
	`status` enum('trial','active','payment_due','suspended','cancelled') NOT NULL DEFAULT 'trial',
	`billingCycle` enum('monthly','annual','manual') NOT NULL DEFAULT 'manual',
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp,
	`assignedBy` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `schoolSubscription_school_unique` UNIQUE(`schoolId`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(48) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`monthlyAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`annualAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`studentLimit` int,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptionPlan_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE INDEX `platformBilling_school_idx` ON `platformBillingRecords` (`schoolId`);--> statement-breakpoint
CREATE INDEX `platformBilling_status_idx` ON `platformBillingRecords` (`status`);--> statement-breakpoint
CREATE INDEX `schoolSubscription_status_idx` ON `schoolSubscriptions` (`status`);