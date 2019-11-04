/**
 * The commandManager listens for, and acts on, user commands.
 */

// imports
const constants   = require("./constants.js");
const userManager = require("./userManager.js");

// shorter alias for module.exports
const e = module.exports;

// shared discord client, TMHI guild & database connection pool
let client = null;
let guild  = null;
let dbPool = null;

/*
 * Initialise the module.
 *
 * @param  client  A reference to the Discord.js client.
 * @param  pool    A connection pool to the TMHI database.
 */
e.initialize = async (_guild, _dbPool) => {
    client = _guild.client;
    guild  = _guild;
    dbPool = _dbPool;

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
                const author = await userManager.loadUser(message.member);

                // fetching own permissions
                if (args.length === 0) {
                    if (author.tmhiPermissions.size === 0) {
                        message.reply("You have no permissions :cry:");
                        break;
                    }
                    const permissionsString = author.tmhiPermissions.map(p => p.name).join(", ");
                    message.reply(`Your permissions are ${permissionsString}`);
                    break;
                }
                // fetching someone else's permissions
                if (args.length === 1) {
                    // must have admin permissions to view another user's permissions
                    if (1 || author.tmhiPermissions.has("TMHI_ADMIN")) {
                        const memberIdToFetch = args[0].replace(/\D+/g, "");
                        const member = await userManager.loadUser(await message.guild.fetchMember(memberIdToFetch));

                        if (member.tmhiPermissions.size === 0) {
                            message.reply(`${member.displayName} has no permissions`);
                            break;
                        }

                        const permissionsString = member.tmhiPermissions.map(p => p.name).join(", ");
                        message.reply(`${member.displayName}'s permissions are ${permissionsString}`);
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
