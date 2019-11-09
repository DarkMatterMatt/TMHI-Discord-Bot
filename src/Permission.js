/**
 * A single permission for one or more users.
 */
module.exports = class Permission {
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
};
