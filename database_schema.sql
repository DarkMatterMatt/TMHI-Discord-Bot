CREATE TABLE users (
    discordid           VARCHAR(255)    NOT NULL        COMMENT 'Discord Snowflake',
    permissions         INT             DEFAULT '0'     COMMENT 'Stores up to 30 permissions',
    displayname         TINYTEXT,       /* TODO: change to VARCHAR(255) */
    wikiid              INT             DEFAULT '0',
    email               VARCHAR(255),
    timezone            INT                             COMMENT 'UTC +-1300',
    
    discordtoken        VARCHAR(255),
    discordtokenexpires INT,
    discordrefreshtoken VARCHAR(255),
    
    UNIQUE KEY      discordid_index     (discordid)    USING BTREE,
    PRIMARY KEY     (discordid)
);
