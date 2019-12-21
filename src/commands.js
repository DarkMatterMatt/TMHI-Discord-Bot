/* eslint-disable object-curly-newline */

// imports
const Discord    = require("discord.js");
const Collection = require("discord.js/src/util/Collection");
const Permission = require("./Permission");
const Command    = require("./Command");
const Clock      = require("./Clock");
const Timer      = require("./Timer");
const Stopwatch  = require("./Stopwatch");
const secrets    = require("./secrets");

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
async function version({ message }) {
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
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to edit bot settings");
        return;
    }

    const setting = settings.get("DELETE_COMMAND_MESSAGE");
    setting.value = newValue;

    const result = await tmhiDatabase.storeGuildSetting(setting);
    if (result.status !== "success") {
        // database operation failed
        console.error(result.error);
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
 * Set a setting
 * @category Commands
 * @module set
 * @param {string} settingId The id of the setting to change
 * @param {string} newValue The new setting value
 */
async function set({ tmhiDatabase, message, args, settings, prefix }) {
    if (args.length !== 2) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}set SETTING_ID newValue\``);
        return;
    }

    const settingId = args[0];
    const newValue = args[1] === "null" ? null : args[1];
    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to edit bot settings");
        return;
    }

    const setting = settings.get(settingId);
    if (settings === undefined) {
        // incorrect setting id
        message.reply("Sorry, I couldn't find that setting id!");
        return;
    }

    setting.value = newValue;

    const result = await tmhiDatabase.storeGuildSetting(setting);
    if (result.status !== "success") {
        // database operation failed
        console.error(result.error);
        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
        return;
    }

    // successful database update
    message.reply(`Changed ${setting.name} to ${setting.value}`);
}
addCommand({
    name:    "set",
    command: set,
    syntax:  "{{prefix}}set SETTING_ID newValue",
});

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
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to edit bot settings");
        return;
    }

    const setting = settings.get("COMMAND_PREFIX");
    setting.value = newPrefix;

    const result = await tmhiDatabase.storeGuildSetting(setting);
    if (result.status !== "success") {
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
async function getPermissions({ tmhiDatabase, message, args, prefix }) {
    if (args.length !== 0 && args.length !== 1) {
        // more than one argument
        message.reply(`Invalid syntax. Syntax is: \`${prefix}permissions [optional @someone]\``);
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

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
    const guildMember = message.guild.members.get(memberIdToFetch);
    if (guildMember === undefined) {
        // no such user in guild
        message.reply("Sorry, I don't think that user is in this server, maybe you mistyped their name?");
        return;
    }

    const member = await tmhiDatabase.loadTmhiMember(guildMember);
    if (member.status !== "success") {
        // failed to load user from database
        console.error(member.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

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
async function createPermission({ tmhiDatabase, message, args, prefix }) {
    if (args.length !== 3) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}createPermission `
            + "PERMISSION_ID 'Permission Pretty Name' 'Permission Description'`");
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

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

    const result = await tmhiDatabase.createPermission(permission);
    if (result.status !== "success") {
        // failed to load user from database
        console.error(result.error);
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
async function grantRolePermission({ tmhiDatabase, message, args, prefix }) {
    if (args.length !== 2 && args.length !== 3) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}grantRolePermission `
            + "@role PERMISSION_ID ['Random comment']`");
        return;
    }

    const roleId = args[0].replace(/\D/g, "");
    const [, permissionId, comment] = args;

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

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

    const result = await tmhiDatabase.grantRolePermission(role, permission, comment);
    if (result.status !== "success") {
        // failed to load user from database
        console.error(result.error);
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
 * @param {string} pollDescription The poll description to echo
 * @param {...string} reactions Any number of parameters, one reaction each
 */
async function createPoll({ tmhiDatabase, message, args }) {
    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("CREATE_POLLS")) {
        message.reply("Sorry, to create a poll you need the CREATE_POLLS permission");
        return;
    }

    const [pollDescription] = args;
    const reactions = args.length === 1 ? ["👍", "👎"] : args.slice(1);

    // send the poll and add reactions
    const poll = await message.channel.send(pollDescription);
    for (const reaction of reactions) {
        const customCheck = message.guild.emojis.find(e => e.name === reaction);

        // await so the reactions are in the correct order
        // eslint-disable-next-line no-await-in-loop
        await poll.react(customCheck ? customCheck.id : reaction);
    }

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
 * Adds a role to new members
 */
async function initiate({ tmhiDatabase, message, args, settings, prefix }) {
    if (args.length !== 1) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}initiate @member\``);
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("INITIATE")) {
        message.reply("Sorry, to initiate a user you need the INITIATE permission");
        return;
    }

    // load requested tmhiMember
    const memberIdToFetch = args[0].replace(/\D/g, "");
    const guildMember = message.guild.members.get(memberIdToFetch);
    if (guildMember === undefined) {
        // no such user in guild
        message.reply("Sorry, I don't think that user is in this server, maybe you mistyped their name?");
        return;
    }

    const member = await tmhiDatabase.loadTmhiMember(guildMember);
    if (member.status !== "success") {
        // failed to load user from database
        console.error(member.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    const initiateRole = settings.get("INITIATE_ROLE");
    if (initiateRole.enabled) {
        // give member the role
        member.addRole(initiateRole.idValue);
    }

    const initiateMessage = settings.get("INITIATE_MESSAGE");
    if (initiateMessage.enabled) {
        // send DM to member
        const dmChannel = member.dmChannel || await member.createDM();
        dmChannel.send(initiateMessage.value.replace("{{member}}", member.toString()));
    }

    if (!initiateRole.boolValue && !initiateMessage.boolValue) {
        message.reply("Please set the INITIATE_ROLE or INITIATE_MESSAGE settings to enable this command");
        return;
    }
    message.reply(`Initiated ${member}!`);
}
addCommand({
    name:    "initiate",
    command: initiate,
    syntax:  "{{prefix}}initiate @.member",
});

/**
 * Adds a live clock
 */
async function addClock({ tmhiDatabase, clocks, message, args, prefix }, inChannelName = false) {
    if ((inChannelName && args.length !== 3) || (!inChannelName && args.length !== 4)) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}addClock #.channel `
            + `${inChannelName ? "" : "[messageId] "}`
            + "utcOffset clockTextFormat`. https://www.npmjs.com/package/dateformat");
        return;
    }
    if (args.length === 3) {
        // fill in optional/missing arg (messageId default is to create a new message)
        args.splice(1, 0, "create");
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("CREATE_CLOCKS")) {
        message.reply("Sorry, to create clocks/timers/stopwatches you need the CREATE_CLOCKS permission");
        return;
    }

    const [channelId, messageId, utcOffset, textContent] = args;
    const { guild } = message;

    // load clock channel
    const channel = guild.channels.get(channelId.replace(/\D/g, ""));
    if (channel === undefined) {
        message.reply("Sorry, I couldn't find that channel");
        return;
    }

    // load clock message
    let clockMessage;
    if (inChannelName) {
        clockMessage = null;
    }
    else if (messageId === "create") {
        clockMessage = await channel.send("Creating clock...");
    }
    else {
        clockMessage = await channel.fetchMessage(messageId.replace(/\D/g, ""));
        if (clockMessage === null) {
            message.reply("Sorry, I couldn't find that message");
            return;
        }
    }

    // check that the utcOffset is valid
    if (Number.isNaN(parseFloat(utcOffset))) {
        message.reply("Sorry, I couldn't figure out what the utcOffset is. Try something like +13h");
        return;
    }

    // stop existing clock
    const clockId = Clock.id({
        guild,
        channel,
        message: clockMessage,
    });
    let clock = clocks.get(clockId);
    if (clock !== undefined) {
        clock.stop();
    }

    // create and start clock
    clock = new Clock({
        guild,
        channel,
        message:   clockMessage,
        textContent,
        utcOffset: parseFloat(utcOffset),
    });
    clocks.set(clock.id, clock);
    clock.start();
    await tmhiDatabase.storeClock(clock);

    message.reply("Started clock!");
}
addCommand({
    name:    "addClock",
    command: addClock,
    syntax:  "{{prefix}}addClock #.channel [messageId] utcOffset CLOCK_ID "
        + "clockTextFormat https://www.npmjs.com/package/dateformat",
});
addCommand({
    name:    "addClockChannel",
    command: (...data) => addClock(...data, true),
    syntax:  "{{prefix}}addClockChannel #.channel utcOffset CLOCK_ID "
        + "clockTextFormat https://www.npmjs.com/package/dateformat",
});

/**
 * Deletes a live clock
 */
async function deleteClock({ tmhiDatabase, clocks, message, args, prefix }) {
    if (args.length !== 1 && args.length !== 2) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}deleteClock #.channel [messageId]`);
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        console.error(author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    // check permissions
    if (!author.hasPermission("CREATE_CLOCKS")) {
        message.reply("Sorry, to delete clocks/timers/stopwatches you need the CREATE_CLOCKS permission");
        return;
    }

    const [channelId, messageId] = args;
    const { guild } = message;

    // load clock channel
    const channel = guild.channels.get(channelId.replace(/\D/g, ""));
    if (channel === undefined) {
        message.reply("Sorry, I couldn't find that channel");
        return;
    }

    // load clock message
    let clockMessage = null;
    if (messageId) {
        clockMessage = await channel.fetchMessage(messageId.replace(/\D/g, ""));
        if (clockMessage === null) {
            message.reply("Sorry, I couldn't find that message");
            return;
        }
    }

    // stop and delete clock
    const clockId = Clock.id({
        guild,
        channel,
        message: clockMessage,
    });
    const clock = clocks.get(clockId);
    clocks.delete(clockId);
    clock.stop();
    await tmhiDatabase.deleteClock(clockId);

    message.reply("Deleted clock! It will no longer update");
}
addCommand({
    name:    "deleteClock",
    command: deleteClock,
    syntax:  "{{prefix}}deleteClock #.channel [messageId]",
});
addCommand({
    name:    "deleteTimer",
    command: deleteClock,
    syntax:  "{{prefix}}deleteTimer #.channel [messageId]",
});
addCommand({
    name:    "deleteStopwatch",
    command: deleteClock,
    syntax:  "{{prefix}}deleteStopwatch #.channel [messageId]",
});

/**
 * Invalid command, send a direct message to the member with the help text
 * @category Commands
 * @module invalidCommand
 */
addCommandAlias("help", "invalidCommand");

module.exports = commands;
