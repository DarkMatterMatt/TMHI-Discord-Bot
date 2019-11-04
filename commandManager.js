// imports
const constants   = require("./constants.js");

// shorter alias for module.exports
const e = module.exports;

// shared discord client & database connection pool
let client = null;
let dbPool = null;

/*
 * Initialise the module.
 *
 * @param  client  A reference to the Discord.js client.
 * @param  pool    A connection pool to the TMHI database.
 */
e.initialize = async (client_, dbPool_) => {
    client = client_;
    dbPool = dbPool_;

    client.on("message", async (message) => {
        // ignore messages from bots
        if (message.author.bot) {
            return;
        }

        // get text content
        let messageContent;
        if (message.content.startsWith(constants.config.prefix)) {
            // remove prefix
            messageContent = message.content.slice(constants.config.prefix.length);
        }
        else if (message.content.startsWith(`<@${client.user.id}>`)) {
            // remove prefix
            messageContent = message.content.slice(`<@${client.user.id}>`.length);
        }
        // ignore messages that don't start with the specified prefix or @TMHI-Bot
        else {
            return;
        }

        // split into command and an array of arguments
        const [command, ...args] = messageContent.toLowerCase().trim().split(/\s+/);

        // process command
        switch (command) {
            /*
             * Replies with the current version of the bot.
             */
            case "version": {
                message.reply(`TMHI Discord Bot v${constants.version}`);
                break;
            }

            /*
             * Who knows what this command might do?
             */
            case "test": {
                break;
            }

            /*
             * Invalid command. Sends a direct message to the user with the help text.
             */
            default: {
                // TODO: direct message the user with the help text
            }
        }
    });
};
