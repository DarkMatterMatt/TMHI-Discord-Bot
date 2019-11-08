/* Main tables */

CREATE TABLE guilds (
    id                  VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    name                VARCHAR(255)    NOT NULL,
    ownerid             VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    iconurl             VARCHAR(255),
    region              VARCHAR(32),
    mfalevel            INT,
    verificationlevel   INT,
    createdtimestamp    BIGINT          COMMENT 'Milliseconds since Jan 1, 1970, 00:00:00.000 GMT',
    commandprefix       VARCHAR(32),

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
    hexcolor            VARCHAR(8)      DEFAULT '',
    discordpermissions  BIGINT          DEFAULT 0,
    comment             VARCHAR(8192)   DEFAULT '',

    PRIMARY KEY         (id, guildid)
);

CREATE TABLE permissions (
    id              VARCHAR(255)    NOT NULL        COMMENT 'Readable id, e.g. WIKI_ACCESS',
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    name            VARCHAR(255)    NOT NULL        COMMENT 'Name to show members, e.g. "Wiki Access"',
    comment         VARCHAR(8192)   DEFAULT '',

    PRIMARY KEY     (id)
);

/* Linking tables */

CREATE TABLE memberguilds (
    memberid        VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (memberid)      REFERENCES  members(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (memberid, guildid)
);

CREATE TABLE memberroles (
    memberid        VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    roleid          VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (memberid)        REFERENCES  members(id),
    FOREIGN KEY     (roleid)        REFERENCES  roles(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (memberid, roleid, guildid)
);

CREATE TABLE rolepermissions (
    roleid          VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    VARCHAR(255)    NOT NULL,
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (roleid)        REFERENCES  roles(id),
    FOREIGN KEY     (permissionid)  REFERENCES  permissions(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (roleid, permissionid, guildid)
);

CREATE TABLE memberpermissions (
    memberid        VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    VARCHAR(255)    NOT NULL,
    guildid         VARCHAR(32)     NOT NULL        COMMENT 'Discord Snowflake',
    comment         VARCHAR(8192)   DEFAULT '',

    FOREIGN KEY     (memberid)      REFERENCES  members(id),
    FOREIGN KEY     (permissionid)  REFERENCES  permissions(id),
    FOREIGN KEY     (guildid)       REFERENCES  guilds(id),

    PRIMARY KEY     (memberid, permissionid, guildid)
);
