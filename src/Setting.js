/**
 * A single permission for one or more users.
 */
module.exports = class Setting {
    constructor({
        id,
        name = "",
        comment = "",
        defaultValue,
        value,
        guild,
        guildComment,
    } = {}) {
        this.id           = id;
        this.name         = name || id;
        this._comment     = comment;
        this.defaultValue = defaultValue;
        this._value       = value;
        this.guild        = guild;
        this.guildComment = guildComment;
    }

    get value() {
        return this._value || this.defaultValue;
    }

    set value(value) {
        this._value = value;
    }

    get comment() {
        return this._comment || this.guildComment;
    }

    set comment(comment) {
        this._comment = comment;
    }

    get rawValue() {
        return this._value;
    }

    get numberValue() {
        return parseFloat(this.value);
    }

    get boolValue() {
        return ![0, false, null, "0", "false", "off"].includes(this.value);
    }

    get enabled() {
        return this.boolValue;
    }
};
