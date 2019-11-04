// imports
const helper = require("./helper.js");

// shorter alias for module.exports
const e = module.exports;

// shared database connection pool
let dbPool = null;

/*
 * Initialise the module.
 *
 * @param  pool  A connection pool to the TMHI database.
 */
e.initialize = async (dbPool_) => {
    dbPool = dbPool_;
};

/*
 * Add a Discord user to the database.
 *
 * @param  id               The user's Discord snowflake id.
 * @param  displayName      The user's display name.
 * @param  permissionsList  An optional permission or list of permissions to grant.
 */
e.addUserToDatabase = async (id, displayName, permissionsList) => {
    const permissions = helper.permissionsToInt(permissionsList);

    return dbPool.query(`
        INSERT INTO users (discordid, displayname, permissions)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY
        UPDATE displayName = ?, permissions = permissions | ?
    ;`, [id, displayName, permissions, displayName, permissions]);
};

/*
 * Grant multiple permissions to a Discord user in the database.
 *
 * @param  id               The user's Discord snowflake id.
 * @param  permissionsList  A permission or list of permissions to revoke.
 */
e.grantPermissions = async (id, permissionsList) => {
    const permissions = helper.permissionsToInt(permissionsList);

    return dbPool.query(`
        UPDATE users
        SET permissions = permissions | ?
        WHERE discordid = ?
    ;`, [permissions, id]);
};

/*
 * Alias for grantPermissions.
 */
e.grantPermission = e.grantPermissions;

/*
 * Revoke multiple permissions from a Discord user in the database.
 *
 * @param  id               The user's Discord snowflake id.
 * @param  permissionsList  A permission or list of permissions to revoke.
 */
e.revokePermissions = async (id, permissionsList) => {
    const permissions = helper.permissionsToInt(permissionsList);

    return dbPool.query(`
        UPDATE users
        SET permissions = permissions & ~?
        WHERE discordid = ?
    ;`, [permissions, id]);
};

/*
 * Alias for revokePermissions.
 */
e.revokePermission = e.revokePermissions;

/*
 * Retrieve a Discord user's permissions from the database.
 *
 * @param  id               The user's Discord snowflake id.
 */
e.getPermissions = async (id) => {
    const [rows] = await dbPool.query(`
        SELECT permissions
        FROM users
        WHERE discordid = ?
    ;`, [id]);

    if (rows.length === 0) {
        return false;
    }

    return rows[0].permissions;
};
