/* Main tables */

CREATE TABLE users (
    id                  VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    displayname         VARCHAR(255),
    wikiid              INT             DEFAULT '0',
    email               VARCHAR(255),
    timezone            INT                             COMMENT 'UTC +-1300',
    
    discordtoken        VARCHAR(255),
    discordtokenexpires INT,
    discordrefreshtoken VARCHAR(255),
    
    UNIQUE KEY          id_index        (id),
    UNIQUE KEY          wikiid_index    (wikiid),
    PRIMARY KEY         (id)
);

CREATE TABLE roles (
    id              VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    name            VARCHAR(255)    NOT NULL,
    description     VARCHAR(8192)   DEFAULT '',
    
    UNIQUE KEY      id_index        (id),
    PRIMARY KEY     (id)
)

CREATE TABLE permissions (
    id              INT             NOT NULL        AUTO_INCREMENT,
    name            VARCHAR(255)    NOT NULL        COMMENT 'Name to show users, e.g. "Wiki Access"',
    description     VARCHAR(8192)   DEFAULT '',

    UNIQUE KEY      id_index        (id),
    PRIMARY KEY     (id)
)

/* Linking tables */

CREATE TABLE userroles (
    id              INT             NOT NULL        AUTO_INCREMENT,
    userid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    roleid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    description     VARCHAR(8192)   DEFAULT '',

    UNIQUE KEY      id_index        (id),
    PRIMARY KEY     (id)
)

CREATE TABLE rolepermissions (
    id              INT             NOT NULL        AUTO_INCREMENT,
    roleid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    INT             NOT NULL,
    description     VARCHAR(8192)   DEFAULT '',

    UNIQUE KEY      id_index        (id)    USING BTREE,
    PRIMARY KEY     (id)
)
