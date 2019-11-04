// imports
const Collection = require("discord.js/src/util/Collection");
const helper = require("./helper.js");
const TmhiMember = require("./TmhiMember.js");

// shorter alias for module.exports
const e = module.exports;

// shared discord client, TMHI guild & database connection pool
let client = null;
let guild  = null;
let dbPool = null;

/*
 * Initialise the module.
 *
 * @param  pool  A connection pool to the TMHI database.
 */
e.initialize = (_guild, _dbPool) => {
    client = _guild.client;
    guild  = _guild;
    dbPool = _dbPool;
};

/*
 * Add a Discord user to the database.
 *
 * @param  id               The user's Discord snowflake id.
 * @param  displayName      The user's display name.
 * @param  permissionsList  An optional permission or list of permissions to grant.
 */
e.addUserToDatabase = async (id, displayName) => {
    return dbPool.query(`
        INSERT INTO users (id, displayname)
        VALUES (?, ?)
        ON DUPLICATE KEY
        UPDATE displayName = ?
    ;`, [id, displayName, displayName]);
};

/*
 * Grant multiple permissions to a Discord user in the database.
 *
 * @param  id               The user's Discord snowflake id.
 * @param  permissionsList  A permission or list of permissions to revoke.
 */
e.grantPermissions = async (id, permissionsList) => {
    const permissions = helper.permissionsToInt(permissionsList);
    return;
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
    return;
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
 * Retrieve a Discord user from the database.
 *
 * @param    guildMember  The guild member to load from the database.
 * @returns  A TmhiMember object.
 */
e.loadUser = async (guildMember) => {
    let rows;

    // load user from database
    [rows] = await dbPool.query(`
        SELECT timezone
        FROM users
        WHERE id=?
    ;`, [guildMember.id]);

    // no user found
    if (rows.length === 0) {
        throw new Error(`Failed loading user with id: ${guildMember.id}`);
    }
    const { timezone } = rows[0];

    // load permissions for user
    [rows] = await dbPool.query(`
        SELECT permissions.id as id, permissions.name as name, permissions.description as description
        FROM rolepermissions
        JOIN permissions ON rolepermissions.permissionid=permissions.id
        WHERE rolepermissions.roleid IN (${Array(guildMember.roles.size).fill("?").join()})
    ;`, guildMember.roles.map(r => r.id));

    // map permissions into a Collection
    const permissions = new Collection();
    rows.forEach(row => {
        permissions.set(rows.id, {
            name:        row.name,
            description: row.description,
        });
    });

    return new TmhiMember(guildMember, timezone, permissions);
};
