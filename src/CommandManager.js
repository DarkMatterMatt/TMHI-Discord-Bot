// imports
const commands = require("./commands");

/** Listens for, and acts on, user commands */
class CommandManager {
    /**
     * Create a new command manager
     * @param {external:Client} client The client to catch events from
     * @param {tmhiDatabase} tmhiDatabase The T-MHI database interface
     */
    constructor(client, tmhiDatabase, clocks) {
        Object.defineProperty(this, "client", { value: client });
        this.tmhiDatabase = tmhiDatabase;
        this.clocks = clocks;
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
            if (settings.status !== "success") {
                // failed to load settings from database
                console.error("startListening => onMessage, settings", settings.error);
                message.reply("Failed loading settings from the database, go bug @DarkMatterMatt");
                return;
            }

            let prefix = settings.get("COMMAND_PREFIX").value;
            if (prefix === null) {
                prefix = `<@!${this.client.user.id}>`;
            }

            // get text content
            let messageContent;
            if (message.content.startsWith(prefix)) {
                // remove prefix
                messageContent = message.content.slice(prefix.length);
            }
            else if (message.content.startsWith(`<@!${this.client.user.id}>`)) {
                // remove prefix
                messageContent = message.content.slice(`<@!${this.client.user.id}>`.length);
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
                clocks:       this.clocks,
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

        /**
         * New user has joined the server.
         */
        this.client.on("guildMemberAdd", async (member) => {
            // load guild settings
            const settings = await this.tmhiDatabase.loadGuildSettings(member.guild);
            if (settings.status !== "success") {
                // failed to load settings from database
                console.error("startListening => onGuildMemberAdd, settings", settings.error);
                member.reply("Failed loading settings from the database, go bug @DarkMatterMatt");
                return;
            }

            const greetingMessage = settings.get("GREETING_MESSAGE");
            const greetingChannel = settings.get("GREETING_CHANNEL");

            if (!greetingChannel || !greetingMessage) {
                // no greeting
                return;
            }

            // fetch channel to greet in
            const channel = member.guild.channels.resolve(greetingChannel.idValue);
            if (channel == null) {
                console.error(`Failed fetching greeting channel: ${greetingChannel.value}`);
                return;
            }

            channel.send(greetingMessage.value.replace("{{member}}", member.toString()));
        });
    }
}

module.exports = CommandManager;
