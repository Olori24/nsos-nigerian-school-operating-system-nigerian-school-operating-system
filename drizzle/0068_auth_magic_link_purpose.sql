ALTER TABLE `authMagicLinks`
  ADD COLUMN `purpose` enum('signin','identity_link') NOT NULL DEFAULT 'signin',
  ADD COLUMN `initiatingUserId` int NULL,
  ADD COLUMN `initiatingSessionId` varchar(64) NULL;
