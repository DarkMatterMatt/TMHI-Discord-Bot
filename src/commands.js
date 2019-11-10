/* eslint-disable object-curly-newline */

// imports
const Permission = require("./Permission.js");

// commands
const commands = {};

/**
 * Send help in a direct message
 * @todo Implement this command
 */
commands.help = async ({ message }) => {
    message.reply("Help not yet implemented :(");
};

/**
 * Replies with the current version of the bot
 */
commands.version = async ({ tmhiDatabase, message, args, settings, prefix }) => {
    message.reply(`TMHI Discord Bot v${process.env.npm_package_version}`);
};

/**
 * Choose whether to delete the command message after execution
 * @param {('true'|'false'|'default')} newValue The new setting value
 */
commands.setDeleteCommandMessage = async ({ tmhiDatabase, message, args, settings, prefix }) => {
    if (args.length !== 1) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}setDeleteCommandMessage true|false|default\``);
        return;
    }

    const newValue = args[0] === "null" ? null : args[0];
    const author = await tmhiDatabase.loadTmhiMember(message.member);

    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to edit bot settings");
        return;
    }

    const setting = settings.get("DELETE_COMMAND_MESSAGE");
    setting.value = newValue;

    const [rows] = await tmhiDatabase.storeGuildSetting(setting);
    if (!rows.affectedRows) {
        // database operation failed
        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
        return;
    }

    // successful database update
    message.reply(`Command messages will ${setting.boolValue ? "" : "not "}be deleted after processing`);

    if (setting.boolValue) {
        // delete the command
        message.delete();
    }
};
commands.setDeleteCommand = commands.setDeleteCommandMessage;

/**
 * Set the command prefix
 * @param {string} newPrefix The new command prefix
 */
commands.setCommandPrefix = async ({ tmhiDatabase, message, args, settings, prefix }) => {
    if (args.length !== 1) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}setCommandPrefix newPrefix|null\``);
        return;
    }

    const newPrefix = args[0] === "null" ? null : args[0];
    const author = await tmhiDatabase.loadTmhiMember(message.member);

    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to edit bot settings");
        return;
    }

    const setting = settings.get("COMMAND_PREFIX");
    setting.value = newPrefix;

    const [rows] = await tmhiDatabase.storeGuildSetting(setting);
    if (!rows.affectedRows) {
        // database operation failed
        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
        return;
    }

    // successful database update
    message.reply(`Updated command prefix to \`${newPrefix}\``);
};
commands.setPrefix = commands.setCommandPrefix;

/**
 * Load a member's permissions
 * @param {string} [discordId] Optional @.member to fetch. If omitted, fetch own permissions
 */
commands.getPermissions = async ({ tmhiDatabase, message, args, settings, prefix }) => {
    if (args.length !== 0 && args.length !== 1) {
        // more than one argument
        message.reply(`Invalid syntax. Syntax is: \`${prefix}permissions [optional @someone]\``);
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);

    if (args.length === 0) {
        // fetching own permissions
        if (author.tmhiPermissions.size === 0) {
            message.reply("You have no permissions :cry:");
            return;
        }
        const permissionsString = author.tmhiPermissions.map(p => p.name).join(", ");
        message.reply(`Your permissions are: ${permissionsString}`);
        return;
    }

    // args.length===1, fetching someone else's permissions
    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to view another user's permissions");
        return;
    }

    // load requested tmhiMember
    const memberIdToFetch = args[0].replace(/\D/g, "");
    const member = await tmhiDatabase.loadTmhiMember(
        await message.guild.fetchMember(memberIdToFetch)
    );

    if (member.tmhiPermissions.size === 0) {
        message.reply(`${member.displayName} has no permissions`);
        return;
    }

    const permissionsString = member.tmhiPermissions.map(p => p.name).join(", ");
    message.reply(`${member.displayName}'s permissions are: ${permissionsString}`);
};
commands.permissions = commands.getPermissions;

/**
 * Create a new permission which can be granted to Discord roles
 * @param {string} roleId The new role ID
 * @param {string} name A pretty name for the permission
 * @param {string} description The permission's description
 */
commands.createPermission = async ({ tmhiDatabase, message, args, settings, prefix }) => {
    if (args.length !== 3) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}createPermission `
            + "PERMISSION_ID 'Permission Pretty Name' 'Permission Description'`");
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);

    if (!author.hasPermission("CREATE_PERMISSIONS")) {
        // missing permission
        message.reply("You are missing the CREATE_PERMISSIONS permission");
        return;
    }

    const [id, name, comment] = args;
    const permission = new Permission({
        id,
        name,
        comment,
        guild: message.guild,
    });

    const [rows] = await tmhiDatabase.createPermission(permission);

    if (!rows.affectedRows) {
        // database operation failed
        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
        return;
    }

    // successful database update
    message.reply(`Created permission: ${id}`);
};

/**
 * Grant a permission to a role
 * @param {string} roleId @.role to grant the permissions to
 * @param {string} permissionId The ID of the permission to grant
 * @param {string} [comment] An optional comment to accompany the database entry
 */
commands.grantRolePermission = async ({ tmhiDatabase, message, args, settings, prefix }) => {
    if (args.length !== 2 && args.length !== 3) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}grantRolePermission `
            + "@role PERMISSION_ID ['Random comment']`");
        return;
    }

    const roleId = args[0].replace(/\D/g, "");
    const [, permissionId, comment] = args;

    const author = await tmhiDatabase.loadTmhiMember(message.member);

    if (!author.hasPermission("GRANT_ROLE_PERMISSIONS")) {
        // user doesn't have permission
        message.reply("You're missing the GRANT_ROLE_PERMISSIONS permission");
        return;
    }

    const role = message.guild.roles.get(roleId);
    if (role === undefined) {
        // role doesn't exist
        message.reply("Sorry, I couldn't find that role. Try using the RoleId instead?");
        return;
    }

    const permission = new Permission({
        id:    permissionId,
        guild: message.guild,
    });
    if (!await tmhiDatabase.permissionExists(permission)) {
        // permission doesn't exist
        message.reply(`That permission doesn't exist. You need to create it using \`${prefix}createPermission\``);
        return;
    }

    const [rows] = await tmhiDatabase.grantRolePermission(role, permission, comment);

    if (rows.affectedRows === 0) {
        // database operation failed
        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
        return;
    }

    // successful database update
    message.reply(`Granted ${args[1]} to ${message.guild.roles.get(roleId)}`);
};

/**
 * Invalid command, send a direct message to the member with the help text
 */
commands.invalidCommand = commands.help;

module.exports = commands;
