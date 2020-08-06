/** The database schema. Execute these commands to initialize the database */

/* Main tables */

/* contains the default values for settings (and pretty names) */
CREATE TABLE settings (
    id                  VARCHAR(255)    NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    comment             VARCHAR(8192)   DEFAULT '',
    defaultvalue        VARCHAR(255)    NOT NULL,

    PRIMARY KEY         (id)
);

CREATE TABLE guilds (
    id                  VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    name                VARCHAR(255)    NOT NULL,
    ownerid             VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    iconurl             VARCHAR(255),
    region              VARCHAR(32),
    mfalevel            INT,
    verificationlevel   INT,
    createdtimestamp    BIGINT          COMMENT 'Milliseconds since Jan 1, 1970, 00:00:00.000 GMT',

    PRIMARY KEY         (id)
);

CREATE TABLE members (
    id                  VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    displayname         VARCHAR(255),
    wikiid              INT             DEFAULT 0,
    email               VARCHAR(255),
    timezone            INT                             COMMENT 'UTC +-1300',

    discordtoken        VARCHAR(64),
    discordtokenexpires BIGINT,
    discordrefreshtoken VARCHAR(64),

    PRIMARY KEY         (id)
);

CREATE TABLE roles (
    id                  VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    guildid             VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    name                VARCHAR(255)    NOT NULL,
    hexcolor            VARCHAR(8)      NOT NULL,
    discordpermissions  BIGINT          NOT NULL,
    comment             VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY         (guildid)       REFERENCES  guilds(id)  ON DELETE CASCADE,
    PRIMARY KEY         (id, guildid)
);

CREATE TABLE permissions (
    id              VARCHAR(255)    NOT NULL        COMMENT 'Readable id, e.g. WIKI_ACCESS',
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    name            VARCHAR(255)    NOT NULL        COMMENT 'Name to show members, e.g. "Wiki Access"',
    comment         VARCHAR(8192)   DEFAULT '',
    
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id)      ON DELETE CASCADE,
    PRIMARY KEY     (id, guildid)
);

/* Linking tables */

CREATE TABLE guildsettings (
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    settingid       VARCHAR(255)    NOT NULL,
    value           VARCHAR(8192),
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (guildid)       REFERENCES  guilds(id)      ON DELETE CASCADE,
    FOREIGN KEY     (settingid)     REFERENCES  settings(id)    ON DELETE CASCADE,
    PRIMARY KEY     (guildid, settingid)
);

CREATE TABLE memberguilds (
    memberid        VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (memberid)      REFERENCES  members(id)     ON DELETE CASCADE,
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id)      ON DELETE CASCADE,
    PRIMARY KEY     (memberid, guildid)
);

CREATE TABLE memberroles (
    memberid        VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    roleid          VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (roleid, guildid)               REFERENCES  roles(id, guildid)  ON DELETE CASCADE,
    FOREIGN KEY     (memberid)                      REFERENCES  members(id)         ON DELETE CASCADE,
    FOREIGN KEY     (guildid)                       REFERENCES  guilds(id)          ON DELETE CASCADE,
    PRIMARY KEY     (memberid, roleid, guildid)
);

CREATE TABLE rolepermissions (
    roleid          VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    VARCHAR(255)    NOT NULL,
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (roleid, guildid)               REFERENCES  roles(id, guildid)          ON DELETE CASCADE,
    FOREIGN KEY     (permissionid, guildid)         REFERENCES  permissions(id, guildid)    ON DELETE CASCADE,
    FOREIGN KEY     (guildid)                       REFERENCES  guilds(id)                  ON DELETE CASCADE,
    PRIMARY KEY     (roleid, permissionid, guildid)
);

CREATE TABLE memberpermissions (
    memberid        VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    VARCHAR(255)    NOT NULL,
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (permissionid, guildid)         REFERENCES  permissions(id, guildid)    ON DELETE CASCADE,
    FOREIGN KEY     (memberid)                      REFERENCES  members(id)                 ON DELETE CASCADE,
    FOREIGN KEY     (guildid)                       REFERENCES  guilds(id)                  ON DELETE CASCADE,
    PRIMARY KEY     (memberid, permissionid, guildid)
);

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
    textcontent     VARCHAR(4096)   DEFAULT 'HH:MM',
    utcoffset       BIGINT          COMMENT 'Milliseconds offset',
    timefinish      BIGINT          COMMENT 'Milliseconds since Jan 1, 1970, 00:00:00.000 GMT',
    timestart       BIGINT          COMMENT 'Milliseconds since Jan 1, 1970, 00:00:00.000 GMT',
    timerfinishmessage              VARCHAR(4096),

    FOREIGN KEY     (guildid)       REFERENCES guilds(id)   ON DELETE CASCADE,
    PRIMARY KEY     (guildid, channelid, messageid)
);

/* Settings */
INSERT INTO settings (id, name, defaultvalue)          VALUES ('COMMAND_PREFIX',                'Command Prefix',               '!');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('DELETE_COMMAND_MESSAGE',        'Delete Command Message',       '0',                                        'Delete command message after executing');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('BOT_OWNER_GOD_MODE',            'Bot Owner has God Mode',       '0',                                        'Bot owner has full (admin) privileges');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('GREETING_CHANNEL',              'Greeting Channel',             '',                                         'The channel to greet new members in');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('GREETING_MESSAGE',              'Greeting Message',             'Welcome {{member}}',                       'The message to greet new members with');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('LEAVING_CHANNEL',               'Leaving Channel',              '',                                         'The channel to say goodbye to members in');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('LEAVING_MESSAGE',               'Leaving Message',              '{{member}} ({{tag}}) left :cry:',          'The message to say goodbye to members with');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('INITIATE_ROLE',                 'Initiate Role',                '',                                         'The role to grant to new initiates');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('INITIATE_MESSAGE',              'Initiate Message',             'Starting initiation for {{member}}!',      'The message to greet initiate members with');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('CONCLUDE_ROLE',                 'Conclude Role',                '',                                         'The role to grant to new members');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('CONCLUDE_MESSAGE',              'Conclude Message',             'Initiation for {{member}} is complete!',   'The message to greet members with');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('SQUADLESS_ROLE',                'Squadless Role',               '',                                         'The role to grant to new members without a squad');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('SQUADLESS_MESSAGE',             'Squadless Message',            '{{member}} needs a squad!',                'The message to post to the squadless channel');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('SQUADLESS_CHANNEL',             'Squadless Channel',            '',                                         'The channel to post the squadless message into');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('VERIFIED_ROLE',                 'Verified Role',                '',                                         'The role someone needs to be able to get the member role');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('RECRUITMENT_LOG_CHANNEL',       'Recruitment Log Channel',      '',                                         'The channel that will log all the actions performed by recruitment officers');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('RECRUITMENT_INITIATE_MESSAGE',  'Recruitment Initiate Message', 'initiate | {{author}} | {{member}}',       'The initate message log that will be psoted to the recruitment log channel');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('RECRUITMENT_CONCLUDE_MESSAGE',  'Recruitment Conclude Message', 'conclude | {{author}} | {{member}}',       'The conclude message log that will be posted to the recruitment log channel');
