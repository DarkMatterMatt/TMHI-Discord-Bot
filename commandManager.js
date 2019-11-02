// imports
const constants = require("./constants.js");

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
e.initialize = (client_, dbPool_) => {
    client = client_;
    dbPool = dbPool_;

    client.on("message", message => {
        // ignore messages from bots
        if (message.author.bot) {
            return;
        }

        // ignore messages without the prefix
        if (!message.content.startsWith(constants.prefix)) {
            return;
        }

        // remove prefix, normalize to lowercase
        const text = message.content.slice(constants.prefix.length).toLowerCase();

        // split into command and an array of arguments
        const [command, ...args] = text.trim().split(/\s+/);

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
             * Invalid command. Sends a direct message to the user with the help text.
             */
            default: {
                // TODO: direct message the user with the help text
            }
        }
    });
};
