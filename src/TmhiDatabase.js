// imports
const mysql       = require("mysql2/promise");

const Collection = require("discord.js/src/util/Collection");
const TmhiMember = require("./TmhiMember.js");

/**
 * Holds contains TMHI database related methods
 */
module.exports = class TmhiDatabase {
    constructor(createPoolOptions) {
        this.pool = mysql.createPool(createPoolOptions);
    }

    /*
     * Add a Discord user to the database.
     *
     * @param  guildMember  The member to add.
     */
    async addUserToDatabase(guildMember) {
        return this.pool.query(`
            INSERT INTO users (id, displayname)
            VALUES (?, ?)
            ON DUPLICATE KEY
            UPDATE displayName = ?
        ;`, [guildMember.id, guildMember.displayName, guildMember.displayName]);
    }

    /*
    * Retrieve a Discord user from the database.
    *
    * @param    guildMember  The guild member to load from the database.
    * @returns  A TmhiMember object.
    */
    async loadTmhiMember(guildMember) {
        let rows;

        // load user from database
        [rows] = await this.pool.query(`
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
        [rows] = await this.pool.query(`
            SELECT permissions.id as id, permissions.name as name, permissions.description as description
            FROM rolepermissions
            JOIN permissions ON rolepermissions.permissionid=permissions.id
            WHERE rolepermissions.roleid IN (${Array(guildMember.roles.size).fill("?").join()})
        ;`, guildMember.roles.map(r => r.id));

        // map permissions into a Collection
        const permissions = new Collection();
        rows.forEach(row => {
            permissions.set(row.id, {
                name:        row.name,
                description: row.description,
            });
        });

        // owner has GOD_MODE permission
        if (guildMember.id === guildMember.guild.ownerID) {
            permissions.set("GOD_MODE", {
                name:        "God Mode",
                description: "You're the boss, so you can do anything!",
            });
        }

        return new TmhiMember(guildMember, this, {
            timezone,
            tmhiPermissions: permissions,
        });
    }

    /**
     * Add a TMHI Discord role for the member to the database.
     * This should only be called after a role has been added via the Discord server.
     */
    addMemberRole(id, roleId, reason = "") {
        return this.pool.query(`
            INSERT INTO userroles (userid, roleid, reason)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY
            UPDATE id=id
        `, [id, roleId, reason]);
    }

    /**
     * Grants a permission to a TMHI Discord role in the database.
     */
    grantRolePermission(roleId, permissionId, reason = "") {
        return this.pool.query(`
            INSERT INTO rolepermissions (roleid, permissionid, description)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY
            UPDATE id=id
        `, [roleId, permissionId, reason]);
    }

    /**
     * Creates a new permission type in the database.
     */
    createPermissionType(permissionId, name, description) {
        return this.pool.query(`
            INSERT INTO permissions (id, name, description)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY
            UPDATE id=id
        `, [permissionId, name, description]);
    }
};
