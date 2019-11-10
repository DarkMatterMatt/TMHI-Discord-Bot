/**
 * A single permission for one or more users.
 */
class Permission {
    constructor({
        id,
        name = null,
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
