// imports
const Collection = require("discord.js/src/util/Collection");
const GuildMember = require("discord.js/src/structures/GuildMember");

/**
 * Contains information about a single TMHI member
 * @extends external:GuildMember
*/
class TmhiMember extends GuildMember {
    /**
     * Create a new T-MHI member
     * @param {external:GuildMember} guildMember The guild member to build on
     * @param {Object} data T-MHI specific data
     * @param {external:Collection<string, Permission>} data.tmhiPermissions The permissions for the member
     * @param {string} [data.timezone] The primary active timezone of the member
     * @param {number} [data.wikiId] The T-MHI wiki ID of the member
     * @param {string} [data.email] The member's email address
     */
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
     * The primary active timezone of the member
     * @type {string}
     */
    get timezone() {
        return this._timezone;
    }

    set timezone(timezone) {
        this._timezone = (timezone || "").toUpperCase();
    }

    /**
     * Check if the member has the specified permission
     * @param {string} permissionId The ID of the permission to check
     */
    hasPermission(permissionId) {
        // server owner and admins have all permissions
        if (this.tmhiPermissions.has("GOD_MODE") || this.tmhiPermissions.has("ADMIN")) {
            return true;
        }
        return this.tmhiPermissions.has(permissionId);
    }
}

module.exports = TmhiMember;
