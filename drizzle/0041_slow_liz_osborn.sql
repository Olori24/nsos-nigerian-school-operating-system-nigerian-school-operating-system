ALTER TABLE `providerConfigurations` DROP INDEX `providerConfiguration_school_category_unique`;--> statement-breakpoint
ALTER TABLE `providerConfigurations` ADD `channel` enum('payment','sms','whatsapp','email','in_app') DEFAULT 'payment' NOT NULL;--> statement-breakpoint
UPDATE `providerConfigurations` SET `channel` = CASE
  WHEN `category` = 'payment' THEN 'payment'
  WHEN `provider` IN ('resend', 'sendgrid') THEN 'email'
  WHEN `provider` = 'whatsapp_cloud' THEN 'whatsapp'
  WHEN `provider` = 'in_app' THEN 'in_app'
  ELSE 'sms'
END;--> statement-breakpoint
ALTER TABLE `providerConfigurations` ADD CONSTRAINT `providerConfiguration_school_channel_unique` UNIQUE(`schoolId`,`channel`);
