// imports
const Collection = require("discord.js/src/util/Collection");
const GuildMember = require("discord.js/src/structures/GuildMember");

/**
 * Holds all the information about a single TMHI member.
 */
module.exports = class TmhiMember extends GuildMember {
    constructor(guildMember, tmhiDatabase, {
        timezone = "",
        tmhiPermissions = new Collection(),
    } = {}) {
        // copy over guildMember data
        super(guildMember.client, {
            nick:          guildMember.nickname,
            joined_at:     guildMember.joinedTimestamp,
            premium_since: guildMember.premiumSinceTimestamp,
            user:          guildMember.user,
            roles:         guildMember._roles,
        }, guildMember.guild);

        this.timezone         = timezone;        // String
        this._tmhiPermissions = tmhiPermissions; // Collection
        this.tmhiDatabase     = tmhiDatabase;    // TmhiDatabase
    }

    /**
     * The primary timezone for this member, taking only roles into account.
     */
    get timezone() {
        return this._timezone;
    }

    set timezone(timezone) {
        this._timezone = (timezone || "").toUpperCase();
    }

    /**
     * The TMHI permissions for this member, taking only roles into account.
     */
    get tmhiPermissions() {
        return this._tmhiPermissions;
    }

    hasPermission(permissionId) {
        // server owner has all permissions
        if (this.tmhiPermissions.has("GOD_MODE")) {
            return true;
        }
        return this.tmhiPermissions.has(permissionId);
    }
};
