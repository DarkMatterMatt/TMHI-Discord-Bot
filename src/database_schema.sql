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
    PRIMARY KEY         (id)
);

CREATE TABLE roles (
    id              VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    name            VARCHAR(255)    NOT NULL,
    description     VARCHAR(8192)   DEFAULT '',
    
    UNIQUE KEY      id_index        (id),
    PRIMARY KEY     (id)
);

CREATE TABLE permissions (
    id              VARCHAR(255)    NOT NULL        COMMENT 'Readable id, e.g. WIKI_ACCESS',
    name            VARCHAR(255)    NOT NULL        COMMENT 'Name to show users, e.g. "Wiki Access"',
    description     VARCHAR(8192)   DEFAULT '',

    UNIQUE KEY      id_index        (id),
    PRIMARY KEY     (id)
);

/* Linking tables */

CREATE TABLE userroles (
    id              INT             NOT NULL        AUTO_INCREMENT,
    userid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    roleid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    description     VARCHAR(8192)   DEFAULT '',

    CONSTRAINT      userrole_constraint         UNIQUE      (userid, roleid),
    FOREIGN KEY     (userid)        REFERENCES  users(id),
    FOREIGN KEY     (roleid)        REFERENCES  roles(id),
    UNIQUE KEY      id_index        (id),
    PRIMARY KEY     (id)
);

CREATE TABLE rolepermissions (
    id              INT             NOT NULL        AUTO_INCREMENT,
    roleid          VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    permissionid    VARCHAR(255)    NOT NULL,
    description     VARCHAR(8192)   DEFAULT '',

    CONSTRAINT      rolepermission_constraint     UNIQUE      (roleid, permissionid),
    FOREIGN KEY     (roleid)        REFERENCES    roles(id),
    FOREIGN KEY     (permissionid)  REFERENCES    permissions(id),
    UNIQUE KEY      id_index        (id),
    PRIMARY KEY     (id)
);
