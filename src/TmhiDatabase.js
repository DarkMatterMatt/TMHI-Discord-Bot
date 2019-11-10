// imports
const mysql      = require("mysql2/promise");

const Collection = require("discord.js/src/util/Collection");
const TmhiMember = require("./TmhiMember.js");
const Permission = require("./Permission.js");
const Setting    = require("./Setting.js");

/**
 * Holds contains TMHI database related methods
 */
module.exports = class TmhiDatabase {
    constructor(createPoolOptions) {
        this.pool = mysql.createPool(createPoolOptions);
        this.pool.pool.config.connectionConfig.namedPlaceholders = true;
    }

    async storeGuildSettings(settings) {
        const queries = await Promise.all(settings.map(async (setting) => {
            // delete guildsetting entry if using default values
            if (setting.rawValue === undefined || setting.rawValue === null || setting.rawValue === "default") {
                return this.pool.query(`
                    DELETE FROM guildsettings
                    WHERE guildid=:guildId AND settingid=:settingId
                ;`, {
                    guildId:   setting.guild.id,
                    settingId: setting.id,
                });
            }
            // upsert guildsetting entry with setting value and comment
            return this.pool.query(`
                INSERT INTO guildsettings (guildid, settingid, value ${setting.comment ? ", comment" : ""})
                VALUES (:guildId, :settingId, :value ${setting.comment ? ", :comment" : ""})
                ON DUPLICATE KEY
                UPDATE value=:value ${setting.comment ? ", comment=:comment" : ""}
            ;`, {
                guildId:   setting.guild.id,
                settingId: setting.id,
                value:     setting.value,
                comment:   setting.comment,
            });
        }));

        // affected rows of all queries combined
        queries.affectedRows = queries.reduce((tot, query) => tot + query[0].affectedRows, 0);

        return queries;
    }

    async storeGuildSetting(setting) {
        const settings = new Collection();
        settings.set(setting.id, setting);

        const queries = await this.storeGuildSettings(settings);
        return queries[0];
    }

    async loadGuildSettings(guild) {
        // settings for guild
        const settings = new Collection();
        let rows;

        // load descriptions & default values
        [rows] = await this.pool.query(`
            SELECT id, name, comment, defaultvalue
            FROM settings
        ;`);

        rows.forEach(row => {
            settings.set(row.id, new Setting({
                id:           row.id,
                name:         row.name,
                comment:      row.comment,
                defaultValue: row.defaultvalue,
                guild,
            }));
        });

        // load guild settings
        [rows] = await this.pool.query(`
            SELECT settingid, value, comment
            FROM guildsettings
            WHERE guildid=:guildId
        ;`, { guildId: guild.id });

        rows.forEach(row => {
            const setting = settings.get(row.settingid);
            setting.value = row.value;
            setting.guildComment = row.comment;
        });

        return settings;
    }

    /*
     * Add a Discord guild to the database.
     *
     * @param  guild  The guild to add.
     */
    async addGuild(guild) {
        return this.pool.query(`
            INSERT INTO guilds (id, name, ownerid, iconurl, region, mfalevel, verificationlevel, createdtimestamp)
            VALUES (:id, :name, :ownerID, :iconURL, :region, :mfaLevel, :verificationLevel, :createdTimestamp)
            ON DUPLICATE KEY
            UPDATE name=:name
        ;`, guild);
    }

    /*
     * Add a Discord user to the database.
     *
     * @param  guildMember  The member to add.
     */
    async addMember(guildMember) {
        return this.pool.query(`
            INSERT INTO members (id, displayname)
            VALUES (:id, :displayname)
            ON DUPLICATE KEY
            UPDATE displayname=:displayname
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
            SELECT timezone, wikiid as wikiId, email
            FROM members
            WHERE id=:id
        ;`, { id: guildMember.id });

        // no user found
        if (rows.length === 0) {
            throw new Error(`Failed loading user with id: ${guildMember.id}`);
        }
        const { timezone, wikiId, email } = rows[0];

        // permissions for user
        const permissions = new Collection();

        // load permissions from roles
        [rows] = await this.pool.query(`
            SELECT permissions.id as id, permissions.name as name, permissions.comment as comment
            FROM rolepermissions
            JOIN permissions ON rolepermissions.permissionid=permissions.id
            WHERE rolepermissions.guildid=?
                AND rolepermissions.roleid IN (${Array(guildMember.roles.size).fill("?").join()})
        ;`, [guildMember.guild.id, ...guildMember.roles.map(r => r.id)]);

        rows.forEach(row => {
            permissions.set(row.id, new Permission({
                id:      row.id,
                name:    row.name,
                comment: row.comment,
                guild:   guildMember.guild,
            }));
        });

        // load member-specific permissions
        [rows] = await this.pool.query(`
            SELECT permissions.id as id, permissions.name as name, permissions.comment as comment
            FROM memberpermissions
            JOIN permissions ON memberpermissions.permissionid=permissions.id
            WHERE memberpermissions.memberid=:memberId AND memberpermissions.guildid=:guildId
        ;`, {
            memberId: guildMember.id,
            guildId:  guildMember.guild.id,
        });

        rows.forEach(row => {
            permissions.set(row.id, new Permission({
                id:      row.id,
                name:    row.name,
                comment: row.comment,
                guild:   guildMember.guild,
            }));
        });

        // owner has GOD_MODE permission
        if (guildMember.id === guildMember.guild.ownerID) {
            permissions.set("GOD_MODE", new Permission({
                id:      "GOD_MODE",
                name:    "God Mode",
                comment: "You're the boss, so you can do anything!",
                guild:   guildMember.guild,
            }));
        }

        return new TmhiMember(guildMember, {
            timezone,
            tmhiPermissions: permissions,
            wikiId,
            email,
        });
    }

    /**
     * Add a guild role to the database.
     * This should only be called after a role has been added via the Discord server.
     */
    async storeGuildRole(role, comment = null) {
        return this.pool.query(`
            INSERT INTO roles (id, guildid, name, hexcolor, discordpermissions ${comment ? ", comment" : ""})
            VALUES (:roleId, :guildId, :name, :hexColor, :permissions ${comment ? ", :comment" : ""})
            ON DUPLICATE KEY
            UPDATE name=:name, hexcolor=:hexColor, discordpermissions=:permissions
                ${comment !== null ? ", comment=:comment" : ""}
        `, {
            roleId:      role.id,
            guildId:     role.guild.id,
            name:        role.name,
            hexColor:    role.hexColor,
            permissions: role.permissions,
            comment,
        });
    }

    /**
     * Deletes guild roles that are NOT in the list of roles provided.
     * This should only be called when syncing guild roles.
     */
    async deleteGuildRolesExcluding(guild, roles) {
        return this.pool.query(`
            DELETE FROM roles
            WHERE guildid=? AND id NOT IN (${Array(roles.size).fill("?").join()})
        `, [guild.id, ...roles.map(r => r.id)]);
    }

    async syncGuildRoles(guild) {
        // remove roles that no longer exist
        await this.deleteGuildRolesExcluding(guild, guild.roles);

        // add roles
        return Promise.all(guild.roles.map(role => this.storeGuildRole(role)));
    }

    async syncGuild(guild) {
        // add guild to database
        await this.addGuild(guild);

        // make all basic permissions
        await this.initializeGuildPermissions(guild);

        // force update for all roles
        await this.syncGuildRoles(guild);

        // force update for all users
        guild.members.forEach(async (member, id) => {
            // skip bot users
            if (member.user.bot) {
                return;
            }

            // check that the user is added to the database
            await this.addMember(member);
            await this.syncMemberRoles(member);
        });
    }

    async initializeGuildPermissions(guild) {
        this.createPermission({
            id:      "ADMIN",
            name:    "Admin",
            comment: "Admins can run any commands",
            guild,
        });
        this.createPermission({
            id:      "CREATE_PERMISSIONS",
            name:    "Create Permissions",
            comment: "Run !createPermissions",
            guild,
        });
        this.createPermission({
            id:      "GRANT_ROLE_PERMISSIONS",
            name:    "Grant Role Permissions",
            comment: "Run !grantRolePermissions",
            guild,
        });
    }

    /**
     * Add a TMHI Discord role for the member to the database.
     * This should only be called after a role has been added via the Discord server.
     */
    async storeMemberRole(member, role, comment = null) {
        return this.pool.query(`
            INSERT INTO memberroles (memberid, roleid, guildid ${comment ? ", comment" : ""})
            VALUES (:memberId, :roleId, :guildId ${comment ? ", :comment" : ""})
            ON DUPLICATE KEY
            UPDATE memberid=memberid ${comment ? ", comment=:comment" : ""}
        `, {
            memberId: member.id,
            roleId:   role.id,
            guildId:  role.guild.id,
            comment,
        });
    }

    /**
     * Deletes all roles for the member that are NOT in the list of roles provided.
     * This should only be called when syncing roles.
     */
    async deleteMemberRolesExcluding(member, roles) {
        return this.pool.query(`
            DELETE FROM memberroles
            WHERE memberid=? AND guildid=? AND roleid NOT IN (${Array(roles.size).fill("?").join()})
        `, [member.id, member.guild.id, ...roles.map(r => r.id)]);
    }

    async syncMemberRoles(member) {
        // remove roles that the user no longer has
        await this.deleteMemberRolesExcluding(member, member.roles);

        // add roles
        return Promise.all(member.roles.map(role => this.storeMemberRole(member, role)));
    }

    /**
     * Grants a permission to a TMHI Discord role in the database.
     */
    async grantRolePermission(role, permission, comment = null) {
        if (role.guild.id !== permission.guild.id) {
            throw new Error("Cannot grant a permission to a role from another server!");
        }

        return this.pool.query(`
            INSERT INTO rolepermissions (roleid, permissionid, guildid ${comment ? ", comment" : ""})
            VALUES (:roleId, :permissionId, :guildId ${comment ? ", :comment" : ""})
            ON DUPLICATE KEY
            UPDATE roleid=roleid ${comment ? ", comment=:comment" : ""}
        `, {
            roleId:       role.id,
            permissionId: permission.id,
            guildId:      role.guild.id,
            comment,
        });
    }

    /**
     * Creates a new permission type in the database.
     */
    async createPermission(permission) {
        return this.pool.query(`
            INSERT INTO permissions (id, guildid, name ${permission.comment ? ", comment" : ""})
            VALUES (:permissionId, :guildid, :name ${permission.comment ? ", :comment" : ""})
            ON DUPLICATE KEY
            UPDATE name=:name ${permission.comment ? ", comment=:comment" : ""}
        `, {
            permissionId: permission.id,
            guildid:      permission.guild.id,
            name:         permission.name,
            comment:      permission.comment,
        });
    }

    /**
     * Check if a permission exists in the database.
     */
    async permissionExists(permission) {
        const [rows] = await this.pool.query(`
            SELECT id FROM permissions
            WHERE id=:permissionId AND guildid=:guildId
        `, {
            permissionId: permission.id,
            guildId:      permission.guild.id,
        });

        return rows.length !== 0;
    }
};
