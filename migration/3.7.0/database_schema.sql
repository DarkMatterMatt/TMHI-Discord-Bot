/* Verification level is now a string */
ALTER TABLE guilds MODIFY verificationlevel VARCHAR(32);
UPDATE guilds SET verificationlevel='NONE'      WHERE verificationlevel='0';
UPDATE guilds SET verificationlevel='LOW'       WHERE verificationlevel='1';
UPDATE guilds SET verificationlevel='MEDIUM'    WHERE verificationlevel='2';
UPDATE guilds SET verificationlevel='HIGH'      WHERE verificationlevel='3';
UPDATE guilds SET verificationlevel='VERY_HIGH' WHERE verificationlevel='4';
