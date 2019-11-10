/** A single permission for one or more users from a single guild */
class Permission {
    /**
     * Create a single permission for one or more users from a single guild
     * @param {Object} data The permission data
     * @param {string} data.id The permission ID
     * @param {string} data.guild The guild that this permission applies to
     * @param {string} [data.name] The pretty name of the permission
     * @param {string} [data.comment] An optional comment
     */
    constructor({
        id,
        name = "",
        comment = "",
        guild,
    } = {}) {
        this.id      = id;
        this.name    = name || id;
        this.comment = comment;
        this.guild   = guild;
    }
}

module.exports = Permission;
