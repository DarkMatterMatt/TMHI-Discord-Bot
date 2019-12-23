/** A single command for one or more guilds */
class Command {
    /**
     * Create a single command for one or more guilds
     * @param {Object} data The command data
     * @param {string} data.name The pretty name of the command
     * @param {string} data.command The function to execute
     * @param {string} data.description A short function description
     * @param {string} data.syntax A string to be provided for help commands
     * @param {string|string[]} data.examples Example(s) to be provided for help commands
     * @param {boolean} data.isAlias Whether or not this command is an alias for another command
     */
    constructor({
        name,
        command,
        description,
        syntax,
        examples,
        isAlias = false,
    } = {}) {
        this.name        = name;
        this.run         = command;
        this.description = description;
        this.syntax      = syntax;
        this._id         = name.toLowerCase();
        this.isAlias     = isAlias;

        // make this.examples an array (or undefined)
        this.examples = typeof examples === "string" ? [examples] : examples || [];
    }

    /**
     * The command ID
     * @readonly
     */
    get id() {
        return this._id;
    }
}

module.exports = Command;
