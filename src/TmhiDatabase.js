// imports
const mysql      = require("mysql2/promise");

const Collection = require("discord.js/src/util/Collection");
const TmhiMember = require("./TmhiMember.js");
const Permission = require("./Permission.js");
const Setting    = require("./Setting.js");
const secrets    = require("./secrets.js");

/** T-MHI database interface */
class TmhiDatabase {
    /**
     * Initialize a T-MHI database interface instance
     * @param {Object} createPoolOptions Options to pass through to mysql2.createPool
     */
    constructor(createPoolOptions) {
        this.pool = mysql.createPool(createPoolOptions);
        this.pool.pool.config.connectionConfig.namedPlaceholders = true;
    }

    /**
     * Store guild settings
     * @param {external:Collection<string, Setting>} settings A Collection of Settings to store
     * @returns {Object[]} An array of database query results
     */
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

    /**
     * Store a single guild setting
     * @param {Setting} setting A Setting to store
     * @returns {Object} A database query result
     */
    async storeGuildSetting(setting) {
        const settings = new Collection();
        settings.set(setting.id, setting);

        const [query] = await this.storeGuildSettings(settings);
        return query;
    }

    /**
     * Load guild settings
     * @param {external:Guild} guild The guild to fetch the Settings for
     * @returns {external:Collection<string, Setting>} A Collection of the guild's Settings
     */
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

    /**
     * Store a guild
     * @param {external:Guild} guild The guild to store
     * @returns {Object} A query result
     */
    async addGuild(guild) {
        return this.pool.query(`
            INSERT INTO guilds (id, name, ownerid, iconurl, region, mfalevel, verificationlevel, createdtimestamp)
            VALUES (:id, :name, :ownerID, :iconURL, :region, :mfaLevel, :verificationLevel, :createdTimestamp)
            ON DUPLICATE KEY
            UPDATE name=:name
        ;`, guild);
    }

    /**
     * Store a guild member
     * @param {external:GuildMember|TmhiMember} guildMember The member to add
     * @returns {Object} A query result
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

    /**
    * Retrieve a T-MHI member
    * @param {external:GuildMember|TmhiMember} guildMember The guild member to load
    * @returns {TmhiMember} The T-MHI member
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

        // GOD_MODE permission for guild and bot owners
        const godModePermission = new Permission({
            id:      "GOD_MODE",
            name:    "God Mode",
            comment: "You're the boss, so you can do anything!",
            guild:   guildMember.guild,
        });
        // owner always has GOD_MODE
        if (guildMember.id === guildMember.guild.ownerID) {
            permissions.set("GOD_MODE", godModePermission);
        }
        // bot owner has GOD_MODE if enabled in settings
        if (guildMember.id === secrets.bot_owner
                && (await this.loadGuildSettings(guildMember.guild)).get("BOT_OWNER_GOD_MODE").enabled) {
            permissions.set("GOD_MODE", godModePermission);
        }

        return new TmhiMember(guildMember, {
            timezone,
            tmhiPermissions: permissions,
            wikiId,
            email,
        });
    }

    /**
     * Store a guild role
     * @param {external:Role} role The role to store
     * @param {string} [comment] An optional comment to accompany the database entry
     * @returns {Object} A query result
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
     * Delete guild roles that are NOT in the list of roles provided
     * @param {external:Guild} guild The guild to delete the roles from
     * @param {external:Collection<external:Snowflake, Role>} roles The roles to keep
     * @returns {Object} A query result
     */
    async deleteGuildRolesExcluding(guild, roles) {
        return this.pool.query(`
            DELETE FROM roles
            WHERE guildid=? AND id NOT IN (${Array(roles.size).fill("?").join()})
        `, [guild.id, ...roles.map(r => r.id)]);
    }

    /**
     * Synchronize guild roles
     * @param {external:Guild} guild The guild to synchronize
     * @returns {Object[]} An array of query results
     */
    async syncGuildRoles(guild) {
        // remove roles that no longer exist
        await this.deleteGuildRolesExcluding(guild, guild.roles);

        // add roles
        return Promise.all(guild.roles.map(role => this.storeGuildRole(role)));
    }

    /**
     * Synchronize guild roles and members
     * @param {external:Guild} guild The guild to synchronize
     */
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

    /**
     * Initialize basic permissions
     * @param {external:Guild} guild The guild to initialize permissions for
     */
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
        this.createPermission({
            id:      "CREATE_POLLS",
            name:    "Create Polls",
            comment: "Run !createPoll",
            guild,
        });
    }

    /**
     * Add a TMHI Discord role for the member
     * @param {external:GuildMember|TmhiMember} member The member with the role
     * @param {external:Role} role The role to store
     * @param {string} [comment] An optional comment to accompany the database entry
     * @returns {Object} A query result
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
     * Delete a member's roles that are NOT in the list of roles provided
     * @param {external:GuildMember|TmhiMember} member The member to delete the roles from
     * @param {external:Collection<external:Snowflake, external:Role>} roles The roles to keep
     * @returns {Object} A query result
     */
    async deleteMemberRolesExcluding(member, roles) {
        return this.pool.query(`
            DELETE FROM memberroles
            WHERE memberid=? AND guildid=? AND roleid NOT IN (${Array(roles.size).fill("?").join()})
        `, [member.id, member.guild.id, ...roles.map(r => r.id)]);
    }

    /**
     * Synchronize a member's roles
     * @param {external:GuildMember|TmhiMember} member The member to synchronize
     * @returns {Object[]} An array of query results
     */
    async syncMemberRoles(member) {
        // remove roles that the user no longer has
        await this.deleteMemberRolesExcluding(member, member.roles);

        // add roles
        return Promise.all(member.roles.map(role => this.storeMemberRole(member, role)));
    }

    /**
     * Grant a permission to a Discord role
     * @param {external:Role} role The role to grant the permission to
     * @param {Permission} permission The permission to grant
     * @param {string} [comment] An optional comment to accompany the database entry
     * @returns {Object} A query result
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
     * Store a new permission
     * @param {Permission} permission The Permission to store
     * @returns {Object} A query result
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
     * Check if a permission exists
     * @param {Permission} permission The permission to check the existance of
     * @returns {boolean} True if the permission exists
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
}

module.exports = TmhiDatabase;
