/* Live Clocks/Timers/Stopwatch
 * All:       guild, channel, message?, textContent
 * Clock:     utcOffset
 * Timer:     timeFinish, timerFinishMessage
 * Stopwatch: timeStart, timeFinish
 */
CREATE TABLE clocks (
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    channelid       VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    messageid       VARCHAR(32)     DEFAULT ''      COMMENT 'Discord Snowflake',
    textcontent     VARCHAR(8192)   DEFAULT 'HH:MM',
    utcoffset       BIGINT          COMMENT 'Milliseconds offset',
    timefinish      BIGINT          COMMENT 'Milliseconds since Jan 1, 1970, 00:00:00.000 GMT',
    timestart       BIGINT          COMMENT 'Milliseconds since Jan 1, 1970, 00:00:00.000 GMT',
    timerfinishmessage              VARCHAR(8192),

    FOREIGN KEY     (guildid)       REFERENCES guilds(id)   ON DELETE CASCADE,
    PRIMARY KEY     (guildid, channelid, messageid)
);
