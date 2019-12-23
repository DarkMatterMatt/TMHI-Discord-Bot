/**  A single setting for a guild */
class Setting {
    /**
     * Create a single setting for a guild
     * @param {Object} data T-MHI specific data
     * @param {string} data.id The setting ID
     * @param {string} data.guild The guild that this setting applies to
     * @param {number} data.defaultValue The default value of the setting
     * @param {string} [data.name] The pretty name of the setting
     * @param {string} [data.comment] An optional comment
     * @param {string} [data.value] The value of the setting for the guild. Default if omitted
     * @param {string} [data.guildComment] An optional guild specified comment for the setting
     */
    constructor({
        id,
        name = "",
        comment = "",
        defaultValue,
        value,
        guild,
        guildComment,
    } = {}) {
        Object.defineProperty(this, "client", { value: guild.client });
        this.id           = id;
        this.name         = name || id;
        this._comment     = comment;
        this.defaultValue = defaultValue;
        this._value       = value;
        this.guild        = guild;
        this.guildComment = guildComment;
    }

    /** The value of the setting, or the default value if unspecified */
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

    /** An optional comment about this setting */
    get comment() {
        return this._comment || this.guildComment;
    }

    set comment(comment) {
        this._comment = comment;
    }

    /** Fetches the guild specific value, does not use the default value */
    get rawValue() {
        return this._value;
    }

    /** The value, cast to a number */
    get numberValue() {
        return parseFloat(this.value);
    }

    /** The value, as a string of digits */
    get idValue() {
        return this.value.replace(/\D/g, "");
    }

    /** The value, converted to a boolean */
    get boolValue() {
        if ([0, false, null].includes(this.value)) {
            return false;
        }
        return !["0", "false", "off", "no", "n", ""].includes(this.value.toLowerCase());
    }

    /** Alias for boolValue */
    get enabled() {
        return this.boolValue;
    }
}

module.exports = Setting;
