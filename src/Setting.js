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
        if (this._value === "default") {
            return this.defaultValue;
        }
        return this._value || this.defaultValue;
    }

    set value(value) {
        // convert value to string if possible
        if (value === null) {
            this._value = value;
            return;
        }
        this._value = value.toString().trim();
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
        if ([0, false, null].includes(this.value)) {
            return false;
        }
        return !["0", "false", "off", "no", "n"].includes(this.value.toLowerCase());
    }

    get enabled() {
        return this.boolValue;
    }
};
