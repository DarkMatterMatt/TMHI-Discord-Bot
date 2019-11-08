/**
 * The CommandManager listens for, and acts on, user commands.
 */
module.exports = class CommandManager {
    constructor(client, tmhiDatabase) {
        this.client       = client;
        this.tmhiDatabase = tmhiDatabase;
    }

    startListening() {
        this.client.on("message", async (message) => {
            // ignore messages from bots
            if (message.author.bot) {
                return;
            }

            const prefix = await this.tmhiDatabase.loadGuildPrefix(message.guild) || `${this.client.user}`;

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

            // split into command and an array of arguments
            // support for quoted ('"`) string arguments, https://stackoverflow.com/a/366532/6595777
            // escaped quotes are NOT supported. Surely the user won't need 3 types of quotes...?
            const split = [];
            for (const match of messageContent.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`|[^\s]+/g)) {
                // prioritise capturing groups, default to raw match (match[0])
                split.push(match[1] || match[2] || match[3] || match[0]);
            }
            const [command, ...args] = split;

            // process command
            switch (command.toLowerCase()) {
                /*
                 * Replies with the current version of the bot.
                 */
                case "version": {
                    message.reply(`TMHI Discord Bot v${process.env.npm_package_version}`);
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
                    if (args.length !== 0 && args.length !== 1) {
                        // more than one argument
                        message.reply(`Invalid syntax. Syntax is: \`${prefix}permissions [optional @someone]\``);
                        break;
                    }

                    const author = await this.tmhiDatabase.loadTmhiMember(message.member);

                    if (args.length === 0) {
                        // fetching own permissions
                        if (author.tmhiPermissions.size === 0) {
                            message.reply("You have no permissions :cry:");
                            break;
                        }
                        const permissionsString = author.tmhiPermissions.map(p => p.name).join(", ");
                        message.reply(`Your permissions are: ${permissionsString}`);
                        break;
                    }

                    // args.length===1, fetching someone else's permissions
                    if (!author.hasPermission("TMHI_ADMIN")) {
                        // missing permissions
                        message.reply("You must be an admin to view another user's permissions");
                        break;
                    }

                    // load requested tmhiMember
                    const memberIdToFetch = args[0].replace(/\D+/g, "");
                    const member = await this.tmhiDatabase.loadTmhiMember(
                        await message.guild.fetchMember(memberIdToFetch)
                    );

                    if (member.tmhiPermissions.size === 0) {
                        message.reply(`${member.displayName} has no permissions`);
                        break;
                    }

                    const permissionsString = member.tmhiPermissions.map(p => p.name).join(", ");
                    message.reply(`${member.displayName}'s permissions are: ${permissionsString}`);
                    break;
                }

                case "createpermission":
                case "createpermissiontype": {
                    if (args.length !== 3) {
                        // incorrect number of arguments
                        message.reply("Invalid syntax. Syntax is: "
                            + `\`${prefix}createPermission `
                            + "PERMISSION_ID 'Permission Pretty Name' 'Permission Description'`");
                        break;
                    }

                    const author = await this.tmhiDatabase.loadTmhiMember(message.member);

                    if (author.hasPermission("CREATE_PERMISSIONS")) {
                        // missing permission
                        message.reply("You are missing the CREATE_PERMISSIONS permission");
                        break;
                    }

                    const [rows] = await this.tmhiDatabase.createPermissionType(args[0], args[1], args[2]);

                    if (!rows.affectedRows) {
                        // database operation failed
                        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
                        break;
                    }

                    // successful database update
                    message.reply(`Created permission: ${args[0]}`);
                    break;
                }

                case "grantrolepermission": {
                    if (args.length !== 2 && args.length !== 3) {
                        // incorrect number of arguments
                        message.reply(`Invalid syntax. Syntax is: \`${prefix}grantRolePermission `
                            + "@role PERMISSION_ID 'Random comment'`");
                        break;
                    }

                    const roleId = args[0].replace(/\D/g);
                    const [, permissionId, comment] = args;

                    const author = await this.tmhiDatabase.loadTmhiMember(message.member);

                    if (!author.hasPermission("GRANT_ROLE_PERMISSIONS")) {
                        // user doesn't have permission
                        message.reply("You're missing the GRANT_ROLE_PERMISSIONS permission");
                        break;
                    }

                    if (!message.guild.roles.has(roleId)) {
                        // role doesn't exist
                        message.reply("Sorry, I couldn't find that role. Try using the RoleId instead?");
                        break;
                    }

                    if (!await this.tmhiDatabase.permissionExists(permissionId)) {
                        // permission doesn't exist
                        message.reply("That permission doesn't exist. You need to create it using"
                            + `\`${prefix}createPermission\``);
                        break;
                    }

                    const [rows] = await this.tmhiDatabase.grantRolePermission(roleId, permissionId, comment);

                    if (rows.affectedRows === 0) {
                        // database operation failed
                        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
                        break;
                    }

                    // successful database update
                    message.reply(`Granted ${args[1]} to ${message.guild.roles.get(roleId)}`);
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
    }
};
