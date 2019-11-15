/* eslint-disable object-curly-newline */

// imports
const Discord    = require("discord.js");
const Collection = require("discord.js/src/util/Collection");
const Permission = require("./Permission.js");
const Command    = require("./Command.js");
const secrets    = require("./secrets.js");

const commands = new Collection();

/**
 * Add a single command
 * @param {Object} data Data to pass to the Command constructor
 */
function addCommand(data) {
    const command = new Command(data);
    commands.set(command.id, command);
}

/**
 * Add an alias for a command
 * @param {string} id The original command to create the alias to
 * @param {string} newId The new alias to create
 */
function addCommandAlias(id, newId) {
    const command = commands.get(id.toLowerCase());

    const clone = Object.assign(Object.create(command), command);
    clone.isAlias = true;

    commands.set(newId.toLowerCase(), clone);
}

/**
 * Send help in a direct message
 * @category Commands
 * @module help
 */
async function help({ message, args, settings, prefix }) {
    const embed = new Discord.RichEmbed()
        .setTimestamp()
        .setFooter(`T-MHI Bot v${process.env.npm_package_version} by @DarkMatterMatt`);

    if (args.length === 1) {
        // show help for a single command
        const command = commands.get(args[0]);

        if (command === undefined) {
            // command does not exist
            embed
                .setTitle("T-MHI Bot Help")
                .setDescription(`That command does not exist, try ${prefix}help to view available commands`);
        }
        else {
            // command exists, show command-specific syntax
            embed
                .setTitle(`T-MHI Bot Help: ${command.name}`)
                .setURL(secrets.command_documentation_url.replace("{{command}}", command.name))
                .addField("Syntax", command.syntax.replace("{{prefix}}", prefix));

            // add examples example
            command.examples.forEach((example, index) => {
                embed.addField(`Ex${index}: `, example);
            });
        }
    }
    else {
        // create message to send
        embed
            .setTitle("T-MHI Bot Help")
            .setDescription("Available commands are:")
            .setURL(secrets.documentation_url);

        // each command has field
        commands.forEach(command => {
            if (!command.isAlias) {
                embed.addField(command.name, command.syntax.replace("{{prefix}}", prefix));
            }
        });
    }

    // send DM
    const dmChannel = message.author.dmChannel || await message.author.createDM();
    dmChannel.send(embed);

    // reply so it doesn"t look like the command failed
    if (!settings.get("DELETE_COMMAND_MESSAGE").enabled) {
        message.reply("Sent you a DM!");
    }
}
addCommand({
    name:    "help",
    command: help,
    syntax:  "{{prefix}}help [command]",
});

/**
 * Replies with the current version of the bot
 * @category Commands
 * @module version
 */
async function version({ tmhiDatabase, message, args, settings, prefix }) {
    message.reply(`TMHI Discord Bot v${process.env.npm_package_version}`);
}
addCommand({
    name:    "version",
    command: version,
    syntax:  "{{prefix}}version",
});

/**
 * Choose whether to delete the command message after execution
 * @category Commands
 * @module setDeleteCommandMessage
 * @param {('true'|'false'|'default')} newValue The new setting value
 */
async function setDeleteCommandMessage({ tmhiDatabase, message, args, settings, prefix }) {
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
}
addCommand({
    name:    "setDeleteCommandMessage",
    command: setDeleteCommandMessage,
    syntax:  "{{prefix}}setDeleteCommandMessage newValue",
});
addCommandAlias("setDeleteCommandMessage", "setDeleteCommand");

/**
 * Set the command prefix
 * @category Commands
 * @module setCommandPrefix
 * @param {string} newPrefix The new command prefix
 */
async function setCommandPrefix({ tmhiDatabase, message, args, settings, prefix }) {
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
}
addCommand({
    name:    "setcommandprefix",
    command: setCommandPrefix,
    syntax:  "{{prefix}}setCommandPrefix newValue",
});
addCommandAlias("setCommandPrefix", "setPrefix");

/**
 * Load a member's permissions
 * @category Commands
 * @module getPermissions
 * @param {string} [discordId] Optional @.member to fetch. If omitted, fetch own permissions
 */
async function getPermissions({ tmhiDatabase, message, args, settings, prefix }) {
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
}
addCommand({
    name:    "getPermissions",
    command: getPermissions,
    syntax:  "{{prefix}}getPermissions [@.member]",
});
addCommandAlias("getPermissions", "permissions");

/**
 * Create a new permission which can be granted to Discord roles
 * @category Commands
 * @module createPermission
 * @param {string} permissionId The new permission ID
 * @param {string} name A pretty name for the permission
 * @param {string} description The permission's description
 */
async function createPermission({ tmhiDatabase, message, args, settings, prefix }) {
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
}
addCommand({
    name:    "createPermission",
    command: createPermission,
    syntax:  "{{prefix}}createPermission PERMISSION_ID \"Permission Name\" \"description\"",
});

/**
 * Grant a permission to a role
 * @category Commands
 * @module grantRolePermission
 * @param {string} roleId @.role to grant the permissions to
 * @param {string} permissionId The ID of the permission to grant
 * @param {string} [comment] An optional comment to accompany the database entry
 */
async function grantRolePermission({ tmhiDatabase, message, args, settings, prefix }) {
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
}
addCommand({
    name:    "grantRolePermission",
    command: grantRolePermission,
    syntax:  "{{prefix}}grantRolePermission @.role PERMISSION_ID \"comment\"",
});

/**
 * Creates a reaction poll
 * @category Commands
 * @module createPoll
 */
async function createPoll({ tmhiDatabase, message, args, settings, prefix }) {
    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (!author.hasPermission("CREATE_POLLS")) {
        message.reply("Sorry, to create a poll you need the CREATE_POLLS permission");
    }

    const [pollDescription] = args;
    const reactions = args.length === 1 ? ["👍", "👎"] : args.slice(1);

    // send the poll and add reactions
    const poll = await message.channel.send(pollDescription);
    reactions.forEach(async (reaction) => {
        const customCheck = message.guild.emojis.find(e => e.name === reaction);
        await poll.react(customCheck ? customCheck.id : reaction);
    });

    // always delete poll creation messages (because they're almost directly echoed back to the server)
    message.delete();
}
addCommand({
    name:    "createPoll",
    command: createPoll,
    syntax:  "{{prefix}}createPoll \"poll description\" [reaction1] [reaction2] ...",
});
addCommandAlias("createPoll", "poll");

/**
 * Invalid command, send a direct message to the member with the help text
 * @category Commands
 * @module invalidCommand
 */
addCommandAlias("help", "invalidCommand");

module.exports = commands;
