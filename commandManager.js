/**
 * The commandManager listens for, and acts on, user commands.
 */

// imports
const constants   = require("./constants.js");
const userManager = require("./userManager.js");

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
             * Load the users permissions
             *
             * @param  [discordId]  Optional discordId to fetch. If omitted, fetches own permissions.
             */
            case "permissions":
            case "getpermissions": {
                const authorPermissions = await userManager.getPermissions(message.author.id);

                // fetching own permissions
                if (args.length === 0) {
                    message.reply(`Your permissions integer is ${authorPermissions}`);
                    break;
                }
                if (args.length === 1) {
                    // must have admin permissions to view another user's permissions
                    if (authorPermissions & constants.permissions.TMHI_ADMIN) {
                        const userToFetch = args[0].replace(/\D+/g, "");
                        const userPermissions = await userManager.getPermissions(userToFetch);

                        message.reply(`Their permissions integer is ${userPermissions}`);
                        break;
                    }
                    // not admin
                    message.reply("You must be an admin to view another user's permissions");
                }
                // more than one argument
                message.reply("Invalid syntax. "
                    + `Syntax is: \`${constants.config.prefix}permissions [optional @someone]\``);
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
