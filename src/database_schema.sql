/** The database schema. Execute these commands to initialize the database */

/* Main tables */

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

/* Settings */
INSERT INTO settings (id, name, defaultvalue)          VALUES ('COMMAND_PREFIX',            'Command Prefix',           '!');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('DELETE_COMMAND_MESSAGE',    'Delete Command Message',   '0',    'Delete command message after executing');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('BOT_OWNER_GOD_MODE',        'Bot Owner has God Mode',   '0',    'Bot owner has full (admin) privileges');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('GREETING_CHANNEL',          'Greeting Channel',         "",     'The channel to greet new members in');
INSERT INTO settings (id, name, defaultvalue, comment) VALUES ('GREETING_MESSAGE',          'Greeting Message',         "",     'The message to greet new members with');
