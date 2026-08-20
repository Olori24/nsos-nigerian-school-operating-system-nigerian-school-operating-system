ALTER TABLE `advertisingCampaigns` ADD `facebookPageId` varchar(80);--> statement-breakpoint
ALTER TABLE `advertisingCampaigns` ADD `creativeImageUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `advertisingCampaigns` ADD `providerAdSetId` varchar(160);--> statement-breakpoint
ALTER TABLE `advertisingCampaigns` ADD `providerCreativeId` varchar(160);--> statement-breakpoint
ALTER TABLE `advertisingCampaigns` ADD `providerAdId` varchar(160);--> statement-breakpoint
ALTER TABLE `advertisingCampaigns` ADD `lastSyncedAt` timestamp;