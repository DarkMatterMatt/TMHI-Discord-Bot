/** Listens for, and acts on, user commands */
module.exports = class CommandManager {
    /**
     * Create a new command manager
     * @param {Client} client The client to catch events from
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
                /**
                 * Replies with the current version of the bot
                 */
                case "version": {
                    message.reply(`TMHI Discord Bot v${process.env.npm_package_version}`);
                    break;
                }

                /**
                 * Who knows what this command might do?
                 */
                case "test": {
                    break;
                }

                /**
                 * Choose whether to delete the command message after execution
                 * @param {('true'|'false'|'default')} newValue The new setting value
                 */
                case "setdeletecommand":
                case "setdeletecommandmessage": {
                    if (args.length !== 1) {
                        // incorrect number of arguments
                        message.reply(`Invalid syntax. Syntax is: \`${prefix}setDeleteCommandMessage`
                            + "true|false|default`");
                        break;
                    }

                    const newValue = args[0] === "null" ? null : args[0];
                    const author = await this.tmhiDatabase.loadTmhiMember(message.member);

                    if (!author.hasPermission("ADMIN")) {
                        // missing permissions
                        message.reply("You must be an admin to edit bot settings");
                        break;
                    }

                    const setting = settings.get("DELETE_COMMAND_MESSAGE");
                    setting.value = newValue;

                    const [rows] = await this.tmhiDatabase.storeGuildSetting(setting);
                    if (!rows.affectedRows) {
                        // database operation failed
                        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
                        break;
                    }

                    // successful database update
                    message.reply(`Command messages will ${setting.boolValue ? "" : "not "}`
                        + "be deleted after processing");
                    break;
                }

                /**
                 * Set the command prefix
                 * @param {string} newPrefix The new command prefix
                 */
                case "setprefix":
                case "setcommandprefix": {
                    if (args.length !== 1) {
                        // incorrect number of arguments
                        message.reply(`Invalid syntax. Syntax is: \`${prefix}setCommandPrefix newPrefix|null\``);
                        break;
                    }

                    const newPrefix = args[0] === "null" ? null : args[0];
                    const author = await this.tmhiDatabase.loadTmhiMember(message.member);

                    if (!author.hasPermission("ADMIN")) {
                        // missing permissions
                        message.reply("You must be an admin to edit bot settings");
                        break;
                    }

                    const setting = settings.get("COMMAND_PREFIX");
                    setting.value = newPrefix;

                    const [rows] = await this.tmhiDatabase.storeGuildSetting(setting);
                    if (!rows.affectedRows) {
                        // database operation failed
                        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
                        break;
                    }

                    // successful database update
                    message.reply(`Updated command prefix to \`${args[0]}\``);
                    break;
                }

                /**
                 * Load a member's permissions
                 * @param {string} [discordId] Optional @.member to fetch. If omitted, fetch own permissions
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
                    if (!author.hasPermission("ADMIN")) {
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

                /**
                 * Create a new permission which can be granted to Discord roles
                 * @param {string} roleId The new role ID
                 * @param {string} name A pretty name for the permission
                 * @param {string} description The permission's description
                 */
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

                /**
                 * Grant a permission to a role
                 * @param {string} roleId @.role to grant the permissions to
                 * @param {string} permissionId The ID of the permission to grant
                 * @param {string} [comment] An optional comment to accompany the database entry
                 */
                case "grantrolepermission": {
                    if (args.length !== 2 && args.length !== 3) {
                        // incorrect number of arguments
                        message.reply(`Invalid syntax. Syntax is: \`${prefix}grantRolePermission `
                            + "@role PERMISSION_ID ['Random comment']`");
                        break;
                    }

                    const roleId = args[0].replace(/\D/g, "");
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

                /**
                 * Invalid command, send a direct message to the member with the help text
                 * @todo Implement this command
                 */
                default: {
                    break;
                }
            }
            // delete command message if setting enabled
            if (settings.get("DELETE_COMMAND_MESSAGE").enabled) {
                message.delete();
            }
        });
    }
};
