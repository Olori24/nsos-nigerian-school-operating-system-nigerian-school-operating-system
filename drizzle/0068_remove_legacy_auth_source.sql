UPDATE `users` SET `loginMethod` = 'legacy' WHERE LOWER(`loginMethod`) = 'manus';
--> statement-breakpoint
UPDATE `userSessions` SET `source` = 'legacy' WHERE LOWER(`source`) = 'manus';
