// imports
const GuildMember = require("discord.js/src/structures/GuildMember");

/**
 * Holds all the information about a single TMHI member.
 */
module.exports = class TmhiMember extends GuildMember {
    constructor(guildMember, timezone, tmhiPermissions) {
        // copy over guildMember data
        super(guildMember.client, guildMember.guild);
        this.user                  = guildMember.user;
        this._roles                = guildMember._roles;
        this.nickname              = guildMember.nickname;
        this.joinedTimestamp       = guildMember.joinedTimestamp;
        this.premiumSinceTimestamp = guildMember.premiumSinceTimestamp;

        this._timezone             = timezone;        // String
        this._tmhiPermissions      = tmhiPermissions; // Collection
    }

    /**
     * The primary timezone for this member, taking only roles into account.
     */
    get timezone() {
        return this._timezone;
    }

    /**
     * The TMHI permissions for this member, taking only roles into account.
     */
    get tmhiPermissions() {
        return this._tmhiPermissions;
    }
};
