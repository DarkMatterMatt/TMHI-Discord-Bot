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
        this.pool.pool.config.connectionConfig.namedPlaceholders = true;
    }

    /*
     * Add a Discord user to the database.
     *
     * @param  guildMember  The member to add.
     */
    async addUserToDatabase(guildMember) {
        return this.pool.query(`
            INSERT INTO users (id, displayname)
            VALUES (:id, :displayname)
            ON DUPLICATE KEY
            UPDATE displayName=:displayname
        ;`, {
            id:          guildMember.id,
            displayname: guildMember.displayName,
        });
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
            WHERE id=:id
        ;`, { id: guildMember.id });

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
    addMemberRole(userId, roleId, comment = "") {
        return this.pool.query(`
            INSERT INTO userroles (userid, roleid, comment)
            VALUES (:userId, :roleId, :comment)
            ON DUPLICATE KEY
            UPDATE comment=:comment
        `, {
            userId,
            roleId,
            comment,
        });
    }

    /**
     * Grants a permission to a TMHI Discord role in the database.
     */
    grantRolePermission(roleId, permissionId, comment = "") {
        return this.pool.query(`
            INSERT INTO rolepermissions (roleid, permissionid, comment)
            VALUES (:roleId, :permissionId, :comment)
            ON DUPLICATE KEY
            UPDATE comment=:comment
        `, {
            roleId,
            permissionId,
            comment,
        });
    }

    /**
     * Creates a new permission type in the database.
     */
    createPermissionType(permissionId, name, comment = "") {
        return this.pool.query(`
            INSERT INTO permissions (id, name, comment)
            VALUES (:id, :name, :comment)
            ON DUPLICATE KEY
            UPDATE name=:name, comment=:comment
        `, {
            id: permissionId,
            name,
            comment,
        });
    }
};
