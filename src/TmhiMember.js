// imports
const Collection = require("discord.js/src/util/Collection");
const GuildMember = require("discord.js/src/structures/GuildMember");

/**
 * Holds all the information about a single TMHI member.
 */
module.exports = class TmhiMember extends GuildMember {
    constructor(guildMember, {
        timezone        = "",
        tmhiPermissions = new Collection(),
        wikiId          = 0,
        email           = "",
    } = {}) {
        // copy over guildMember data
        super(guildMember.client, {
            nick:          guildMember.nickname,
            joined_at:     guildMember.joinedTimestamp,
            premium_since: guildMember.premiumSinceTimestamp,
            user:          guildMember.user,
            roles:         guildMember._roles,
        }, guildMember.guild);

        this.timezone        = timezone;        // String
        this.tmhiPermissions = tmhiPermissions; // Collection
        this.wikiId          = wikiId;          // Integer
        this.email           = email;           // String
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

    hasPermission(permissionId) {
        // server owner and admins have all permissions
        if (this.tmhiPermissions.has("GOD_MODE") || this.tmhiPermissions.has("ADMIN")) {
            return true;
        }
        return this.tmhiPermissions.has(permissionId);
    }
};
