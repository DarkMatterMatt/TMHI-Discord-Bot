/* Main tables */

CREATE TABLE guilds (
    id                  VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    name                VARCHAR(255)    NOT NULL,
    ownerid             VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    iconurl             VARCHAR(255),
    region              VARCHAR(255),
    mfalevel            INT,
    verificationlevel   INT,
    createdtimestamp    BIGINT          COMMENT 'Milliseconds since Jan 1, 1970, 00:00:00.000 GMT',

    PRIMARY KEY         (id)
);

CREATE TABLE users (
    id                  VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    displayname         VARCHAR(255),
    wikiid              INT             DEFAULT '0',
    email               VARCHAR(255),
    timezone            INT                             COMMENT 'UTC +-1300',

    discordtoken        VARCHAR(255),
    discordtokenexpires INT,
    discordrefreshtoken VARCHAR(255),

    PRIMARY KEY         (id)
);

CREATE TABLE roles (
    id              VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    guildid         VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    name            VARCHAR(255)    NOT NULL,
    comment         VARCHAR(8192)   DEFAULT '',

    PRIMARY KEY     (id, guildid)
);

CREATE TABLE permissions (
    id              VARCHAR(255)    NOT NULL        COMMENT 'Readable id, e.g. WIKI_ACCESS',
    guildid         VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    name            VARCHAR(255)    NOT NULL        COMMENT 'Name to show users, e.g. "Wiki Access"',
    comment         VARCHAR(8192)   DEFAULT '',

    PRIMARY KEY     (id)
);

/* Linking tables */

CREATE TABLE userguilds (
    userid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    guildid         VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (userid)        REFERENCES  users(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (userid, guildid)
);

CREATE TABLE userroles (
    userid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    roleid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    guildid         VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (userid)        REFERENCES  users(id),
    FOREIGN KEY     (roleid)        REFERENCES  roles(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (userid, roleid, guildid)
);

CREATE TABLE rolepermissions (
    roleid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    VARCHAR(255)    NOT NULL,
    guildid         VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (roleid)        REFERENCES  roles(id),
    FOREIGN KEY     (permissionid)  REFERENCES  permissions(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (roleid, permissionid, guildid)
);

CREATE TABLE userpermissions (
    userid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    VARCHAR(255)    NOT NULL,
    guildid         VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (userid)        REFERENCES  users(id),
    FOREIGN KEY     (permissionid)  REFERENCES  permissions(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (userid, permissionid, guildid)
);
