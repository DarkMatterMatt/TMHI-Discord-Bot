// imports
const mysql      = require("mysql2/promise");

const Collection = require("discord.js/src/util/Collection");
const TmhiMember = require("./TmhiMember");
const Permission = require("./Permission");
const Setting    = require("./Setting");
const Clock      = require("./Clock");
const Timer      = require("./Timer");
const Stopwatch  = require("./Stopwatch");
const secrets    = require("./secrets");

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
            if (setting.rawValue == null || setting.rawValue === "default") {
                return this.pool.query(`
                    DELETE FROM guildsettings
                    WHERE guildid=:guildId AND settingid=:settingId
                ;`, {
                    guildId:   setting.guild.id,
                    settingId: setting.id,
                }).catch(e => e);
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
            }).catch(e => e);
        }));

        // there was at least one error
        queries.error = queries.find(q => q instanceof Error);
        if (queries.error) {
            console.error(queries.error);
            queries.status = "error";
            return queries;
        }

        // affected rows of all queries combined
        queries.affectedRows = queries.reduce((tot, query) => tot + query[0].affectedRows, 0);
        queries.status = "success";
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
        if (query instanceof Error) {
            console.error(query);
            query.status = "error";
            query.error  = query;
            return query;
        }
        query.status = "success";
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
        try {
            [rows] = await this.pool.query(`
                SELECT id, name, comment, defaultvalue
                FROM settings
            ;`);
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }

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
        try {
            [rows] = await this.pool.query(`
                SELECT settingid, value, comment
                FROM guildsettings
                WHERE guildid=:guildId
            ;`, { guildId: guild.id });
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }

        rows.forEach(row => {
            const setting = settings.get(row.settingid);
            setting.value = row.value;
            setting.guildComment = row.comment;
        });

        settings.status = "success";
        return settings;
    }

    /**
     * Store a guild
     * @param {external:Guild} guild The guild to store
     * @returns {Object} A query result
     */
    async addGuild(guild) {
        try {
            const query = await this.pool.query(`
                INSERT INTO guilds (id, name, ownerid, iconurl, region, mfalevel, verificationlevel, createdtimestamp)
                VALUES (:id, :name, :ownerID, :iconURL, :region, :mfaLevel, :verificationLevel, :createdTimestamp)
                ON DUPLICATE KEY
                UPDATE name=:name
            ;`, {
                ...guild,
                iconURL: guild.iconURL(),
            });

            query.status = "success";
            return query;
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }
    }

    /**
     * Store a guild member
     * @param {external:GuildMember|TmhiMember} guildMember The member to add
     * @returns {Object} A query result
     */
    async addMember(guildMember) {
        try {
            const query = await this.pool.query(`
                INSERT INTO members (id, displayname)
                VALUES (:id, :displayname)
                ON DUPLICATE KEY
                UPDATE displayname=:displayname
            ;`, {
                id:          guildMember.id,
                displayname: guildMember.displayName,
            });

            query.status = "success";
            return query;
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }
    }

    /**
    * Retrieve a T-MHI member
    * @param {external:GuildMember|TmhiMember} guildMember The guild member to load
    * @returns {TmhiMember} The T-MHI member
    */
    async loadTmhiMember(guildMember) {
        let rows;

        // load user from database
        try {
            [rows] = await this.pool.query(`
                SELECT timezone, wikiid as wikiId, email
                FROM members
                WHERE id=:id
            ;`, { id: guildMember.id });
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }

        // no user found
        if (rows.length === 0) {
            console.error(`Failed loading user with id: ${guildMember.id} from the database`);
            return {
                status: "error",
                error:  `Failed loading user with id: ${guildMember.id} from the database`,
            };
        }
        const { timezone, wikiId, email } = rows[0];

        // permissions for user
        const permissions = new Collection();

        // load permissions from roles
        try {
            [rows] = await this.pool.query(`
                SELECT permissions.id as id, permissions.name as name, permissions.comment as comment
                FROM rolepermissions
                JOIN permissions ON rolepermissions.permissionid=permissions.id
                WHERE rolepermissions.guildid=?
                    AND rolepermissions.roleid IN (${Array(guildMember.roles.cache.size).fill("?").join()})
            ;`, [guildMember.guild.id, ...guildMember.roles.cache.map(r => r.id)]);
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }

        rows.forEach(row => {
            permissions.set(row.id, new Permission({
                id:      row.id,
                name:    row.name,
                comment: row.comment,
                guild:   guildMember.guild,
            }));
        });

        // load member-specific permissions
        try {
            [rows] = await this.pool.query(`
                SELECT permissions.id as id, permissions.name as name, permissions.comment as comment
                FROM memberpermissions
                JOIN permissions ON memberpermissions.permissionid=permissions.id
                WHERE memberpermissions.memberid=:memberId AND memberpermissions.guildid=:guildId
            ;`, {
                memberId: guildMember.id,
                guildId:  guildMember.guild.id,
            });
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }

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

        const tmhiMember = new TmhiMember(guildMember, {
            timezone,
            tmhiPermissions: permissions,
            wikiId,
            email,
        });
        tmhiMember.status = "success";
        return tmhiMember;
    }

    /**
     * Store a guild role
     * @param {external:Role} role The role to store
     * @param {string} [comment] An optional comment to accompany the database entry
     * @returns {Object} A query result
     */
    async storeGuildRole(role, comment = null) {
        try {
            const query = await this.pool.query(`
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
                permissions: role.permissions.bitfield,
                comment,
            });

            query.status = "success";
            return query;
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }
    }

    /**
     * Delete guild roles that are NOT in the list of roles provided
     * @param {external:Guild} guild The guild to delete the roles from
     * @param {external:Collection<external:Snowflake, Role>} roles The roles to keep
     * @returns {Object} A query result
     */
    async deleteGuildRolesExcluding(guild, roles) {
        try {
            const query = await this.pool.query(`
                DELETE FROM roles
                WHERE guildid=? AND id NOT IN (${Array(roles.size).fill("?").join()})
            `, [guild.id, ...roles.map(r => r.id)]);

            query.status = "success";
            return query;
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }
    }

    /**
     * Synchronize guild roles
     * @param {external:Guild} guild The guild to synchronize
     * @returns {Object[]} An array of query results
     */
    async syncGuildRoles(guild) {
        // remove roles that no longer exist
        const result = await this.deleteGuildRolesExcluding(guild, guild.roles.cache);

        if (result.status !== "success") {
            return result;
        }

        // add roles
        const queries = await Promise.all(guild.roles.cache.map(role => this.storeGuildRole(role).catch(e => e)));

        // there was at least one error
        queries.error = queries.find(q => q instanceof Error);
        if (queries.error) {
            console.error(queries.error);
            queries.status = "error";
            return queries;
        }

        // affected rows of all queries combined
        queries.affectedRows = queries.reduce((tot, query) => tot + query[0].affectedRows, 0);
        queries.status = "success";
        return queries;
    }

    /**
     * Synchronize guild roles and members
     * @param {external:Guild} guild The guild to synchronize
     */
    async syncGuild(guild) {
        let result;

        // add guild to database
        result = await this.addGuild(guild);
        if (result.status !== "success") {
            return result;
        }

        // make all basic permissions
        result = await this.initializeGuildPermissions(guild);
        if (result.status !== "success") {
            return result;
        }

        // force update for all roles
        result = await this.syncGuildRoles(guild);
        if (result.status !== "success") {
            return result;
        }

        // force update for all users
        await guild.members.fetch();
        for (const [, member] of guild.members.cache) {
            // check that the user is added to the database
            // eslint-disable-next-line no-await-in-loop
            result = await this.addMember(member);
            if (result.status !== "success") {
                return result;
            }

            // eslint-disable-next-line no-await-in-loop
            result = await this.syncMemberRoles(member);
            if (result.status !== "success") {
                return result;
            }
        }

        return { status: "success" };
    }

    /**
     * Initialize basic permissions
     * @param {external:Guild} guild The guild to initialize permissions for
     */
    async initializeGuildPermissions(guild) {
        let result;

        result = this.createPermission({
            id:      "ADMIN",
            name:    "Admin",
            comment: "Admins can run any commands",
            guild,
        });
        if (result.status !== "success") {
            return result;
        }

        result = this.createPermission({
            id:      "CREATE_PERMISSIONS",
            name:    "Create Permissions",
            comment: "Run !createPermissions",
            guild,
        });
        if (result.status !== "success") {
            return result;
        }

        result = this.createPermission({
            id:      "GRANT_ROLE_PERMISSIONS",
            name:    "Grant Role Permissions",
            comment: "Run !grantRolePermissions",
            guild,
        });
        if (result.status !== "success") {
            return result;
        }

        result = this.createPermission({
            id:      "CREATE_POLLS",
            name:    "Create Polls",
            comment: "Run !createPoll",
            guild,
        });
        if (result.status !== "success") {
            return result;
        }

        return { status: "success" };
    }

    /**
     * Add a TMHI Discord role for the member
     * @param {external:GuildMember|TmhiMember} member The member with the role
     * @param {external:Role} role The role to store
     * @param {string} [comment] An optional comment to accompany the database entry
     * @returns {Object} A query result
     */
    async storeMemberRole(member, role, comment = null) {
        const query = await this.pool.query(`
            INSERT INTO memberroles (memberid, roleid, guildid ${comment ? ", comment" : ""})
            VALUES (:memberId, :roleId, :guildId ${comment ? ", :comment" : ""})
            ON DUPLICATE KEY
            UPDATE memberid=memberid ${comment ? ", comment=:comment" : ""}
        `, {
            memberId: member.id,
            roleId:   role.id,
            guildId:  role.guild.id,
            comment,
        }).catch(e => e);

        // something went wrong
        if (query instanceof Error) {
            console.error(query);
            query.status = "error";
            query.error  = query;
            return query;
        }

        query.status = "success";
        return query;
    }

    /**
     * Delete a member's roles that are NOT in the list of roles provided
     * @param {external:GuildMember|TmhiMember} member The member to delete the roles from
     * @param {external:Collection<external:Snowflake, external:Role>} roles The roles to keep
     * @returns {Object} A query result
     */
    async deleteMemberRolesExcluding(member, roles) {
        const query = await this.pool.query(`
            DELETE FROM memberroles
            WHERE memberid=? AND guildid=? AND roleid NOT IN (${Array(roles.size).fill("?").join()})
        `, [member.id, member.guild.id, ...roles.map(r => r.id)]).catch(e => e);

        // something went wrong
        if (query instanceof Error) {
            console.error(query);
            query.status = "error";
            query.error  = query;
            return query;
        }

        query.status = "success";
        return query;
    }

    /**
     * Synchronize a member's roles
     * @param {external:GuildMember|TmhiMember} member The member to synchronize
     * @returns {Object[]} An array of query results
     */
    async syncMemberRoles(member) {
        // remove roles that the user no longer has
        const result = await this.deleteMemberRolesExcluding(member, member.roles.cache);
        if (result.status !== "success") {
            return result;
        }

        // add roles
        const queries = await Promise.all(
            member.roles.cache.map(role => this.storeMemberRole(member, role)
                .catch(e => e))
        );

        // there was at least one error
        queries.error = queries.find(q => q instanceof Error);
        if (queries.error) {
            console.error(queries.error);
            queries.status = "error";
            return queries;
        }

        // affected rows of all queries combined
        queries.affectedRows = queries.reduce((tot, query) => tot + query[0].affectedRows, 0);
        queries.status = "success";
        return queries;
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

        const query = await this.pool.query(`
            INSERT INTO rolepermissions (roleid, permissionid, guildid ${comment ? ", comment" : ""})
            VALUES (:roleId, :permissionId, :guildId ${comment ? ", :comment" : ""})
            ON DUPLICATE KEY
            UPDATE roleid=roleid ${comment ? ", comment=:comment" : ""}
        `, {
            roleId:       role.id,
            permissionId: permission.id,
            guildId:      role.guild.id,
            comment,
        }).catch(e => e);

        // something went wrong
        if (query instanceof Error) {
            console.error(query);
            query.status = "error";
            query.error  = query;
            return query;
        }

        query.status = "success";
        return query;
    }

    /**
     * Store a new permission
     * @param {Permission} permission The Permission to store
     * @returns {Object} A query result
     */
    async createPermission(permission) {
        const query = await this.pool.query(`
            INSERT INTO permissions (id, guildid, name ${permission.comment ? ", comment" : ""})
            VALUES (:permissionId, :guildid, :name ${permission.comment ? ", :comment" : ""})
            ON DUPLICATE KEY
            UPDATE name=:name ${permission.comment ? ", comment=:comment" : ""}
        `, {
            permissionId: permission.id,
            guildid:      permission.guild.id,
            name:         permission.name,
            comment:      permission.comment,
        }).catch(e => e);

        // something went wrong
        if (query instanceof Error) {
            console.error(query);
            query.status = "error";
            query.error  = query;
            return query;
        }

        query.status = "success";
        return query;
    }

    /**
     * Check if a permission exists
     * @param {Permission} permission The permission to check the existance of
     * @returns {boolean} True if the permission exists
     */
    async permissionExists(permission) {
        const query = await this.pool.query(`
            SELECT id FROM permissions
            WHERE id=:permissionId AND guildid=:guildId
        `, {
            permissionId: permission.id,
            guildId:      permission.guild.id,
        }).catch(e => e);

        // something went wrong
        if (query instanceof Error) {
            console.error(query);
            return false;
        }
        return query[0] && query[0].length;
    }

    /**
     * Load all clocks, timers and stopwatches
     * @returns {external:Collection<string, Clock|Timer|Stopwatch>} A collection of clocks, timers and stopwatches
     */
    async loadClocks(client) {
        let rows;

        // load clocks from database
        try {
            [rows] = await this.pool.query(`
                SELECT guildid, channelid, messageid, textcontent,
                    utcoffset, timefinish, timestart, timerfinishmessage
                FROM clocks
            `);
        }
        catch (error) {
            console.error(error);
            return {
                status: "error",
                error,
            };
        }

        const clocks = new Collection();
        for (const row of rows) {
            // load clock/timer/stopwatch
            let clock;

            const guild = client.guilds.resolve(row.guildid);
            if (guild == null) {
                this.deleteClock({
                    guildId:   row.guildid,
                    channelId: row.channelid,
                    messageId: row.messageid,
                });
                continue;
            }

            const channel = guild.channels.resolve(row.channelid);
            if (channel == null) {
                this.deleteClock({
                    guildId:   row.guildid,
                    channelId: row.channelid,
                    messageId: row.messageid,
                });
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            const message = row.messageid ? await channel.messages.fetch(row.messageid) : null;
            if (message == null) {
                this.deleteClock({
                    guildId:   row.guildid,
                    channelId: row.channelid,
                    messageId: row.messageid,
                });
                continue;
            }

            const baseData = {
                guild,
                channel,
                message,
                textContent: row.textcontent,
            };

            if (row.utcoffset !== null) {
                // clock
                clock = new Clock({
                    utcOffset:  row.utcoffset / (60 * 60 * 1000),
                    ...baseData,
                });
            }
            else if (row.timefinish !== null && row.timerfinishmessage !== null) {
                // timer
                clock = new Timer({
                    timeFinish:         new Date(row.timefinish),
                    timerFinishMessage: row.timerFinishMessage,
                    ...baseData,
                });
            }
            else if (row.timestart !== null && row.timefinish !== null) {
                // stopwatch
                clock = new Stopwatch({
                    timeStart:  new Date(row.timestart),
                    timeFinish: new Date(row.timefinish),
                    ...baseData,
                });
            }
            else {
                console.error(`Failed loading clock. Guild: ${guild}, Id: ${row.id}`, row);
                continue;
            }

            clocks.set(clock.uniqueId, clock);
        }

        clocks.status = "success";
        return clocks;
    }

    /**
     * Stores a clock, timer or stopwatch
     * @returns {external:Collection<string, Clock|Timer|Stopwatch>} A collection of clocks
     */
    async storeClock(clock) {
        // upsert guildsetting entry with setting value and comment
        const query = await this.pool.query(`
            INSERT INTO clocks (guildid, channelid, messageid, textcontent,
                utcoffset, timefinish, timestart, timerfinishmessage)
            VALUES (:guildId, :channelId, :messageId, :textContent,
                :utcOffset, :timeFinish, :timeStart, :timerFinishMessage)
            ON DUPLICATE KEY
            UPDATE channelid=:channelId, messageid=:messageId, textcontent=:textContent,
                utcoffset=:utcOffset, timefinish=:timeFinish, timerfinishmessage=:timerFinishMessage
        `, {
            guildId:            clock.guild.id,
            channelId:          clock.channel.id,
            messageId:          clock.message ? clock.message.id : "",
            textContent:        clock.textContent,
            utcOffset:          clock.utcOffset !== undefined ? clock.utcOffset * (60 * 60 * 1000) : null,
            timeFinish:         clock.timeFinish ? clock.timeFinish.getTime() : null,
            timeStart:          clock.timeStart ? clock.timeStart.getTime() : null,
            timerFinishMessage: clock.timerFinishMessage ? clock.timerFinishMessage : null,
        }).catch(e => e);

        if (query instanceof Error) {
            console.error(query);
            query.status = "error";
            query.error  = query;
            return query;
        }
        query.status = "success";
        return query;
    }

    /** Delete a clock, timer or stopwatch */
    async deleteClock(clock) {
        const [guildId, channelId, messageId] = Clock.id(clock).split("|");

        const query = await this.pool.query(`
            DELETE FROM clocks
            WHERE guildid=:guildId AND channelid=:channelId AND messageid=:messageId
        ;`, {
            guildId,
            channelId,
            messageId,
        }).catch(e => e);

        if (query instanceof Error) {
            console.error(query);
            query.status = "error";
            query.error  = query;
            return query;
        }
        query.status = "success";
        return query;
    }
}

module.exports = TmhiDatabase;
