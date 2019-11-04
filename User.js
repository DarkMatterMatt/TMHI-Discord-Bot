/**
 * Holds all the information about a single TMHI user.
 */
module.exports = class User {
    constructor(id, name, roles, timezone, permissions) {
        this.id          = id;          // Discord Snowflake
        this.name        = name;        // String
        this.roles       = roles;       // Collection
        this.timezone    = timezone;    // String
        this.permissions = permissions; // Collection
    }
};
