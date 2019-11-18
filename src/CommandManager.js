// imports
const commands = require("./commands");

/** Listens for, and acts on, user commands */
class CommandManager {
    /**
     * Create a new command manager
     * @param {external:Client} client The client to catch events from
     * @param {tmhiDatabase} tmhiDatabase The T-MHI database interface
     */
    constructor(client, tmhiDatabase) {
        this.client       = client;
        this.tmhiDatabase = tmhiDatabase;
    }

    /**
     * Start listening for commands
     */
    startListening() {
        this.client.on("message", async (message) => {
            // ignore messages from bots
            if (message.author.bot) {
                return;
            }

            if (!message.guild || !message.guild.available) {
                message.reply("Sorry, I haven't learnt how to reply to DMs yet :cry:");
                return;
            }

            const settings = await this.tmhiDatabase.loadGuildSettings(message.guild);
            let prefix     = settings.get("COMMAND_PREFIX").value;
            if (prefix === null) {
                prefix = `${this.client.user}`;
            }

            // get text content
            let messageContent;
            if (message.content.startsWith(prefix)) {
                // remove prefix
                messageContent = message.content.slice(prefix.length);
            }
            else if (message.content.startsWith(`${this.client.user}`)) {
                // remove prefix
                messageContent = message.content.slice(`${this.client.user}`.length);
            }
            // ignore messages that don't start with the specified prefix or @TMHI-Bot
            else {
                return;
            }

            // no command
            if (messageContent === "") {
                message.reply("Yes? I'm listening");
                return;
            }

            // split into command and an array of arguments
            // support for quoted ('"`) string arguments, https://stackoverflow.com/a/366532/6595777
            // escaped quotes are NOT supported. Surely the user won't need 3 types of quotes...?
            const split = [];
            for (const match of messageContent.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`|[^\s]+/g)) {
                // prioritise capturing groups, default to raw match (match[0])
                split.push(match[1] || match[2] || match[3] || match[0]);
            }
            const [originalCommand, ...args] = split;
            const command = commands.get(originalCommand.toLowerCase());

            // data to pass to the command
            const commandData = {
                tmhiDatabase: this.tmhiDatabase,
                message,
                originalCommand,
                command,
                args,
                settings,
                prefix,
            };

            if (command !== undefined) {
                // run command
                command.run(commandData);
            }
            else {
                // default to "help" if command does not exist
                commands.get("help").run(commandData);
            }

            // delete command message if setting enabled
            if (settings.get("DELETE_COMMAND_MESSAGE").enabled) {
                message.delete();
            }
        });
    }
}

module.exports = CommandManager;
