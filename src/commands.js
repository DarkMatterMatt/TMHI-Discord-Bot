/* eslint-disable object-curly-newline */

// imports
const Discord = require("discord.js");
const Collection = require("discord.js/src/util/Collection");
const { convertArrayToCSV } = require("convert-array-to-csv");
const Permission = require("./Permission");
const Command = require("./Command");
const Clock = require("./Clock");
const Timer = require("./Timer");
const Stopwatch = require("./Stopwatch");
const secrets = require("./secrets");
const logger = require("./logger");
const { stringTemplateMember } = require("./helpers");

/**
 * Parse a Snowflake-like string into a Snowflake, or null for invalid formats.
 * @param {string} str snowflake to parse (non-digit characters are removed, <!@12345678987654321> is valid)
 */
function parseSnowflake(str) {
    const s = str.replace(/\D/g, "");

    // snowflake is between 17 and 19 characters long
    // eslint-disable-next-line yoda
    if (17 < s.length && s.length < 19) {
        return s;
    }
    return null;
}

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
    const embed = new Discord.MessageEmbed()
        .setTimestamp()
        .setFooter(`T-MHI Bot v${process.env.npm_package_version} by @DarkMatterMatt`);

    if (args.length === 1) {
        // show help for a single command
        const command = commands.get(args[0]);

        if (command == null) {
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

    // reply so it doesn't look like the command failed
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
        logger.error("setDeleteCommandMessage, author", author.error);
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
        logger.error("setDeleteCommandMessage, result", result.error);
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
        logger.error("set, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to edit bot settings");
        return;
    }

    const setting = settings.get(settingId);
    if (setting == null) {
        // incorrect setting id
        message.reply("Sorry, I couldn't find that setting id!");
        return;
    }

    setting.value = newValue;

    const result = await tmhiDatabase.storeGuildSetting(setting);
    if (result.status !== "success") {
        // database operation failed
        logger.error("set, result", result.error);
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
 * View current guild settings
 * @category Commands
 * @module viewSettings
 */
async function viewSettings({ tmhiDatabase, message, settings }) {
    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("set, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("ADMIN")) {
        // missing permissions
        message.reply("You must be an admin to view bot settings");
        return;
    }

    const embed = new Discord.MessageEmbed()
        .setTimestamp()
        .setFooter(`T-MHI Bot v${process.env.npm_package_version} by @DarkMatterMatt`)
        .setTitle(`Guild Settings for ${message.guild}`);

    // each setting has field
    settings.forEach(({ comment, defaultValue, id, name, value }) => {
        const formattedComment = comment ? `*${comment}*.\n` : "";
        embed.addField(name, `${formattedComment}${id} = ${value}\ndefault = ${defaultValue}`);
    });

    // send DM
    const dmChannel = message.author.dmChannel || await message.author.createDM();
    dmChannel.send(embed);

    // reply so it doesn't look like the command failed
    if (!settings.get("DELETE_COMMAND_MESSAGE").enabled) {
        message.reply("Sent you a DM!");
    }
}
addCommand({
    name:    "viewSettings",
    command: viewSettings,
    syntax:  "{{prefix}}viewSettings",
});
addCommandAlias("viewSettings", "settings");

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
        logger.error("setCommandPrefix, author", author.error);
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
        logger.error("getPermissions, author", author.error);
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
    const memberIdToFetch = parseSnowflake(args[0]);
    if (memberIdToFetch == null) {
        // invalid snowflake
        message.reply("Invalid user. Please tag them, @user");
        return;
    }

    let guildMember;
    try {
        guildMember = await message.guild.members.fetch(memberIdToFetch);
    }
    catch (error) {
        // no such user in guild
        message.reply("Sorry, I don't think that user is in this server, maybe you mistyped their name?");
        return;
    }

    const member = await tmhiDatabase.loadTmhiMember(guildMember);
    if (member.status !== "success") {
        // failed to load user from database
        logger.error("getPermissions, member", member.error);
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
        logger.error("createPermission, author", author.error);
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
        logger.error("createPermission, result", result.error);
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
        logger.error("grantRolePermission, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("GRANT_ROLE_PERMISSIONS")) {
        // user doesn't have permission
        message.reply("You're missing the GRANT_ROLE_PERMISSIONS permission");
        return;
    }

    const role = await message.guild.roles.cache.get(roleId);
    if (role == null) {
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
        logger.error("grantRolePermission, result", result.error);
        message.reply("Sorry, I failed to save that into the database, go bug @DarkMatterMatt");
        return;
    }

    // successful database update
    message.reply(`Granted ${args[1]} to ${role}`);
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
async function createPoll({ tmhiDatabase, message, args, prefix }) {
    if (args.length === 0) {
        // incorrect number of arguments
        message.reply("Invalid syntax. Syntax is: "
            + `\`${prefix}createPoll "poll description" [reaction1] [reaction2] ...\``);
        return;
    }
    if (args.length === 1) {
        args.push("👍", "👎");
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("createPoll, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("CREATE_POLLS")) {
        message.reply("Sorry, to create a poll you need the CREATE_POLLS permission");
        return;
    }

    const [pollDescription, ...reactions] = args;

    // send the poll and add reactions
    const poll = await message.channel.send(pollDescription);
    for (const reaction of reactions) {
        const customCheck = message.guild.emojis.resolve(reaction);

        try {
            // await so the reactions are in the correct order
            // eslint-disable-next-line no-await-in-loop
            await poll.react(customCheck ? customCheck.id : reaction);
        }
        catch (err) {
            // invalid reaction
            poll.delete();
            message.reply("Invalid reaction.");
            return;
        }
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
 * Adds an initiate role to new members
 */
async function initiate({ tmhiDatabase, message, args, settings, prefix }) {
    if (args.length !== 1) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}initiate @member\``);
        return;
    }

    // check that required settings are set before we do any actions
    const initiateRole = settings.get("INITIATE_ROLE");
    const initiateMessage = settings.get("INITIATE_MESSAGE");
    if (!initiateRole.boolValue && !initiateMessage.boolValue) {
        message.reply("Set INITIATE_ROLE or INITIATE_MESSAGE to enable this command");
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("initiate, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("INITIATE")) {
        message.reply("Sorry, to initiate a user you need the INITIATE permission");
        return;
    }

    // load requested tmhiMember
    const memberIdToFetch = parseSnowflake(args[0]);
    if (memberIdToFetch == null) {
        // invalid snowflake
        message.reply("Invalid user. Please tag them, @user");
        return;
    }

    let guildMember;
    try {
        guildMember = await message.guild.members.fetch(memberIdToFetch);
    }
    catch (err) {
        // no such user in guild
        message.reply("Sorry, I don't think that user is in this server, maybe you mistyped their name?");
        return;
    }

    const member = await tmhiDatabase.loadTmhiMember(guildMember);
    if (member.status !== "success") {
        // failed to load user from database
        logger.error("initiate, member", member.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    // make sure member has the 'VERIFIED_ROLE' prior to proceeding
    // this check *PASSES* if VERIFIED_ROLE is not set
    const verifiedRole = settings.get("VERIFIED_ROLE");
    if (verifiedRole.enabled && !member.roles.cache.has(verifiedRole.idValue)) {
        message.reply(`${member} is not yet verified, we cannot proceed just yet! Use the command "$force @${member}" to re-start verification process if it has expired. Member will recieve a PM instructing them withw hat to do next`);
        return;
    }

    if (initiateRole.enabled) {
        // give member the role
        member.roles.add(initiateRole.idValue);
        message.reply(`Initiated ${member}!`);
    }

    // Report log to other channel
    const recruitmentLog = settings.get("RECRUITMENT_LOG_CHANNEL");
    if (recruitmentLog.enabled) {
        const channel = member.guild.channels.resolve(recruitmentLogChannel.idValue);
        if (channel == null) {
            logger.error(`Failed fetching recruitment log channel: ${recruitmentLogChannel.value}`);
            return;
        }

        const recruitInitiateMessage = settings.get("RECRUIT_INITIATE_MESSAGE");
        if (recruitInitiateMessage.enabled) {
            recruitmentLogChannel.send(stringTemplateMember("{{member}}, {{author}}", member, { author: author.toString() }));
        }
    }
}
addCommand({
    name:    "initiate",
    command: initiate,
    syntax:  "{{prefix}}initiate @.member",
});

/*
 * Adds a member role to new initiate members
 */
async function concluded({ tmhiDatabase, message, args, settings, prefix }) {
    if (args.length !== 1) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}concluded @member\``);
        return;
    }

    // check that required settings are set before we do any actions
    const squadlessRole = settings.get("SQUADLESS_ROLE");
    const squadlessMessage = settings.get("SQUADLESS_MESSAGE");
    const squadlessChannel = settings.get("SQUADLESS_CHANNEL");
    if (!squadlessRole.enabled || !squadlessMessage.enabled || !squadlessChannel.enabled) {
        message.reply("Set all of { SQUADLESS_ROLE, SQUADLESS_MESSAGE, SQUADLESS_CHANNEL } to enable this command");
        return;
    }

    const concludedRole = settings.get("CONCLUDED_ROLE");
    const concludedMessage = settings.get("CONCLUDED_MESSAGE");
    if (!concludedRole.enabled || !concludedMessage.enabled) {
        message.reply("Set CONCLUDED_ROLE or CONCLUDED_MESSAGE to enable this command");
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("concluded, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    // uses the same permission as needed to initaite someone, keep it simple.
    if (!author.hasPermission("INITIATE")) {
        message.reply("Sorry, to initiate a user you need the INITIATE permission");
        return;
    }

    // load requested tmhiMember
    const memberIdToFetch = parseSnowflake(args[0]);
    if (memberIdToFetch == null) {
        // invalid snowflake
        message.reply("Invalid user. Please tag them, @user");
        return;
    }

    let guildMember;
    try {
        guildMember = await message.guild.members.fetch(memberIdToFetch);
    }
    catch (err) {
        // no such user in guild
        message.reply("Sorry, I don't think that user is in this server, maybe you mistyped their name?");
        return;
    }

    // grab the member from the list
    const member = await tmhiDatabase.loadTmhiMember(guildMember);
    if (member.status !== "success") {
        // failed to load user from database
        logger.error("concluded, member", member.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    // make sure member has the 'INITIATE_ROLE' prior to proceeding
    // this check *PASSES* if INITIATE_ROLE is not set
    const initiateRole = settings.get("INITIATE_ROLE");
    if (initiateRole.enabled && !member.roles.cache.has(initiateRole.idValue)) {
        message.reply(`${member} is not yet initiated, start by initiating them first!`);
        return;
    }

    // make sure member has the 'VERIFIED_ROLE' prior to proceeding
    // this check *PASSES* if VERIFIED_ROLE is not set
    const verifiedRole = settings.get("VERIFIED_ROLE");
    if (verifiedRole.enabled && !member.roles.cache.has(verifiedRole.idValue)) {
        message.reply(`${member} is not yet verified, we cannot proceed just yet! Use the command "$force @${member}" to re-start verification process if it has expired. Member will recieve a PM instructing them withw hat to do next`);
        return;
    }

    if (concludedRole.enabled) {
        // give member the role
        member.roles.add(concludedRole.idValue);
        message.reply(`Concluded signing up new member ${member}!`);
    }

    if (initiateRole.enabled) {
        // remove the intiaite role
        member.roles.remove(initiateRole.idValue);
    }

    // assign the 'squadless' role, for access to a squadless channel in order to find a squad-leader for them
    member.roles.add(squadlessRole.idValue);

    // fetch channel to send leaving message in
    const channel = member.guild.channels.resolve(squadlessChannel.idValue);
    if (channel == null) {
        logger.error(`Failed fetching leaving message channel: ${squadlessChannel.value}`);
        return;
    }

    // send message to the squadless channel created for this member, asking for
    // squad-leaders with the @LGM(Looking for member) role can be notified about this
    channel.send(stringTemplateMember(squadlessMessage.value, member));

    // Report log to other channel
    const recruitmentLog = settings.get("RECRUITMENT_LOG_CHANNEL");
    if (recruitmentLog.enabled) {
        const recruitmentLogChannel = member.guild.channels.resolve(recruitmentLogChannel.idValue);
        if (recruitmentLogChannel == null) {
            logger.error(`Failed fetching recruitment log channel: ${recruitmentLogChannel.value}`);
            return;
        }

        const recruitmentConcludedMessage = settings.get("RECRUIT_CONCLUDED_MESSAGE");
        if (recruitmentConcludedMessage.enabled) {
            recruitmentLogChannel.send(stringTemplateMember("{{member}}, {{author}}", member, { author: author.toString() }));
        }
    }
}
addCommand({
    name:    "concluded",
    command: concluded,
    syntax:  "{{prefix}}concluded @.member",
});

/**
 * Adds a countdown timer
 */
async function addTimer({ tmhiDatabase, clocks, message, args, prefix }, inChannelName = false) {
    // A timer in channel name must be 4 args. Otherwise can be 4 or 5 args
    if ((args.length !== 4 && args.length !== 5) || (inChannelName && args.length !== 4)) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}addTimer #.channel `
            + `${inChannelName ? "" : "[messageId] "}`
            + "utcFinishTime clockTextFormat timerfinishmessage`. https://www.npmjs.com/package/dateformat");
        return;
    }
    if (args.length === 4) {
        // fill in optional/missing arg (messageId default is to create a new message)
        args.splice(1, 0, "create");
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("addTimer, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("CREATE_CLOCKS")) {
        message.reply("Sorry, to create clocks/timers/stopwatches you need the CREATE_CLOCKS permission");
        return;
    }

    const [channelId, messageId, utcFinishTime, textContent, timerFinishMessage] = args;
    const { guild } = message;

    // parse the finish time
    let finishStr = utcFinishTime.toUpperCase();
    if (!finishStr.match(/[A-Z]+$/) && !finishStr.match(/^\d+$/)) {
        finishStr += "Z"; // default to UTC timezone
    }
    const finishTime = new Date(finishStr);
    if (Number.isNaN(Number(finishTime))) {
        message.reply("Sorry, I couldn't figure out what the finish time is. "
            + "Try something like '7 Jan 2009 05:00:00 PST'");
        return;
    }

    // load clock channel
    const channelIdToFetch = parseSnowflake(channelId);
    if (channelIdToFetch == null) {
        // invalid snowflake
        message.reply("Invalid channel. Please tag the correct channel");
        return;
    }

    const channel = guild.channels.resolve(channelIdToFetch);
    if (channel == null) {
        message.reply("Sorry, I couldn't find that channel");
        return;
    }

    // load clock message
    let timerMessage;
    if (inChannelName) {
        timerMessage = null;
    }
    else if (messageId === "create") {
        timerMessage = await channel.send("Creating clock...");
    }
    else {
        const messageIdToFetch = parseSnowflake(messageId);
        if (messageIdToFetch == null) {
            // invalid snowflake
            message.reply("Invalid message. Please copy the correct ID");
            return;
        }

        try {
            timerMessage = await channel.messages.fetch(messageIdToFetch);
        }
        catch (err) {
            // no such message in channel
            message.reply("Sorry, I couldn't find that message");
            return;
        }

        if (timerMessage.author.id !== guild.client.user.id) {
            message.reply("Sorry, I can only edit my own messages");
            return;
        }
    }

    // stop existing timer
    const timerId = Timer.id({
        guild,
        channel,
        message: timerMessage,
    });
    let timer = clocks.get(timerId);
    if (timer != null) {
        timer.stop();
    }

    // create and start timer
    timer = new Timer({
        guild,
        channel,
        message:    timerMessage,
        textContent,
        timeFinish: finishTime,
        timerFinishMessage,
    });
    clocks.set(timer.id, timer);
    timer.start();

    // store clock in database
    const result = await tmhiDatabase.storeClock(timer);
    if (result.status !== "success") {
        logger.error("addTimer, result", result.error);
        message.reply("Failed starting timer! Please ping @DarkMatterMatt");
        return;
    }

    message.reply("Started timer!");
}
addCommand({
    name:    "addTimer",
    command: addTimer,
    syntax:  "{{prefix}}addTimer #.channel [messageId] utcFinishTime clockTextFormat "
        + "timerfinishmessage https://www.npmjs.com/package/dateformat",
});
addCommand({
    name:    "addTimerChannel",
    command: (...data) => addTimer(...data, true),
    syntax:  "{{prefix}}addTimerChannel #.channel utcFinishTime clockTextFormat "
        + "timerfinishmessage https://www.npmjs.com/package/dateformat",
});

/**
 * Adds a live clock
 */
async function addClock({ tmhiDatabase, clocks, message, args, prefix }, inChannelName = false) {
    // A clock in channel name must be 3 args. Otherwise can be 3 or 4 args
    if ((args.length !== 3 && args.length !== 4) || (inChannelName && args.length !== 3)) {
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
        logger.error("addClock, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    if (!author.hasPermission("CREATE_CLOCKS")) {
        message.reply("Sorry, to create clocks/timers/stopwatches you need the CREATE_CLOCKS permission");
        return;
    }

    const [channelId, messageId, utcOffset, textContent] = args;
    const { guild } = message;

    // check that the utcOffset is valid
    if (Number.isNaN(parseFloat(utcOffset))) {
        message.reply("Sorry, I couldn't figure out what the utcOffset is. Try something like +13h");
        return;
    }

    // load clock channel
    const channelIdToFetch = parseSnowflake(channelId);
    if (channelIdToFetch == null) {
        // invalid snowflake
        message.reply("Invalid channel. Please tag the correct channel");
        return;
    }

    const channel = guild.channels.resolve(channelIdToFetch);
    if (channel == null) {
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
        const messageIdToFetch = parseSnowflake(messageId);
        if (messageIdToFetch == null) {
            // invalid snowflake
            message.reply("Invalid message. Please copy the correct ID");
            return;
        }

        try {
            clockMessage = await channel.messages.fetch(messageIdToFetch);
        }
        catch (err) {
            // no such message in channel
            message.reply("Sorry, I couldn't find that message");
            return;
        }

        if (clockMessage.author.id !== guild.client.user.id) {
            message.reply("Sorry, I can only edit my own messages");
            return;
        }
    }

    // stop existing clock
    const clockId = Clock.id({
        guild,
        channel,
        message: clockMessage,
    });
    let clock = clocks.get(clockId);
    if (clock != null) {
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

    // store clock in database
    const result = await tmhiDatabase.storeClock(clock);
    if (result.status !== "success") {
        logger.error("addClock, result", result.error);
        message.reply("Failed starting clock! Please ping @DarkMatterMatt");
        return;
    }

    message.reply("Started clock!");
}
addCommand({
    name:    "addClock",
    command: addClock,
    syntax:  "{{prefix}}addClock #.channel [messageId] utcOffset "
        + "clockTextFormat https://www.npmjs.com/package/dateformat",
});
addCommand({
    name:    "addClockChannel",
    command: (...data) => addClock(...data, true),
    syntax:  "{{prefix}}addClockChannel #.channel utcOffset "
        + "clockTextFormat https://www.npmjs.com/package/dateformat",
});

/**
 * Deletes a live clock
 */
async function deleteClock({ tmhiDatabase, clocks, message, args, prefix }) {
    if (args.length !== 1 && args.length !== 2) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}deleteClock #.channel [messageId]\``);
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("deleteClock, author", author.error);
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
    const channelIdToFetch = parseSnowflake(channelId);
    if (channelIdToFetch == null) {
        // invalid snowflake
        message.reply("Invalid channel. Please tag the correct channel");
        return;
    }

    const channel = guild.channels.resolve(channelIdToFetch);
    if (channel == null) {
        message.reply("Sorry, I couldn't find that channel");
        return;
    }

    // load clock message
    let clockMessage = null;
    if (messageId) {
        const messageIdToFetch = parseSnowflake(messageId);
        if (messageIdToFetch == null) {
            // invalid snowflake
            message.reply("Invalid message. Please copy the correct ID");
            return;
        }

        try {
            clockMessage = await channel.messages.fetch(messageIdToFetch);
        }
        catch (err) {
            // no such message in channel
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
 * Exports the guild members as a CSV file
 * @param format optional csv delimiter ([comma]/tab/caret)
 */
async function exportMembers({ tmhiDatabase, message, args, prefix, settings }) {
    const separators = {
        comma: ",",
        csv:   ",",
        ",":   ",",
        tab:   "\t",
        tsv:   "\t",
        caret: "^",
        "^":   "^",
    };

    if (args.length === 0) {
        args.push("csv");
    }
    if (args.length !== 1) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}exportMembers [format]\``);
        return;
    }

    const [format] = args;
    if (!Object.keys(separators).includes(format)) {
        // invalid format
        message.reply(`Invalid format. Choose one of: ${Object.keys(separators).map(s => `\`${s}\``).join(" ")}`);
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("exportMembers, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    // check permissions
    if (!author.hasPermission("ADMIN")) {
        message.reply("Sorry, to export members you need the ADMIN permission");
        return;
    }

    const { guild } = message;

    await guild.members.fetch();
    const members = guild.members.cache;

    const toExport = {
        id:                    m => m.id,
        displayName:           m => m.displayName,
        roles:                 m => m.roles.cache.map(r => r.name).join("|"),
        joinedTimestamp:       m => m.joinedTimestamp,
        lastMessageTimestamp:  m => m.lastMessage && (m.lastMessage.editedTimestamp || m.lastMessage.createdTimestamp),
        nickname:              m => m.nickname,
        username:              m => m.user.tag,
        premiumSinceTimestamp: m => m.premiumSinceTimestamp,
    };

    const header = Object.keys(toExport);
    const separator = separators[format];
    const data = members.map(m => Object.values(toExport).map(fn => fn(m)));
    const buf = Buffer.from(convertArrayToCSV(data, { header, separator }));
    const file = new Discord.MessageAttachment(buf, "members.csv");

    // send DM
    const dmChannel = message.author.dmChannel || await message.author.createDM();
    dmChannel.send(file);

    // reply so it doesn't look like the command failed
    if (!settings.get("DELETE_COMMAND_MESSAGE").enabled) {
        message.reply("Sent you a DM!");
    }
}
addCommand({
    name:    "exportMembers",
    command: exportMembers,
    syntax:  "{{prefix}}exportMembers [format]",
});

/**
 * Export a channel's messages as a CSV file
 * @param channel  the channel to export
 * @param format   optional csv delimiter ([comma]/tab/caret)
 * @param beforeId only load messages before this message ID
 */
async function exportChannelMessages({ tmhiDatabase, message, args, prefix, settings }) {
    const MAX_MESSAGES_PER_EXPORT = 10000;

    const { guild } = message;
    const separators = {
        comma: ",",
        csv:   ",",
        ",":   ",",
        tab:   "\t",
        tsv:   "\t",
        caret: "^",
        "^":   "^",
    };

    if (args.length === 1) {
        args.push("csv");
        args.push(undefined);
    }
    else if (args.length === 2) {
        // second arg is `format`
        if (Object.keys(separators).includes(args[1])) {
            args.push(undefined);
        }
        // second arg is `beforeId`
        else if (parseSnowflake(args[1])) {
            args.splice(1, 0, "csv");
        }
        // else reply with syntax
    }
    if (args.length !== 3) {
        // incorrect number of arguments
        message.reply(`Invalid syntax. Syntax is: \`${prefix}exportChannelMessages #channel [format] [beforeId]\``);
        return;
    }

    const [channelId, format] = args;
    let beforeMessageId = args[2];

    if (!Object.keys(separators).includes(format)) {
        // invalid format
        message.reply(`Invalid format. Choose one of: ${Object.keys(separators).map(s => `\`${s}\``).join(" ")}`);
        return;
    }

    if (beforeMessageId !== undefined && !beforeMessageId.match(/\d{17,19}/)) {
        // invalid format
        message.reply("Invalid message ID. Right-click on a message and select 'Copy ID'.");
        return;
    }

    const channelIdToFetch = parseSnowflake(channelId);
    if (channelIdToFetch == null) {
        // invalid snowflake
        message.reply("Invalid channel. Please tag the correct channel");
        return;
    }

    const channel = guild.channels.resolve(channelIdToFetch);
    if (channel == null) {
        message.reply("Sorry, I couldn't find that channel");
        return;
    }

    const author = await tmhiDatabase.loadTmhiMember(message.member);
    if (author.status !== "success") {
        // failed to load user from database
        logger.error("exportChannelMessages, author", author.error);
        message.reply("Failed loading user from the database, go bug @DarkMatterMatt");
        return;
    }

    // check permissions
    if (!author.hasPermission("ADMIN")) {
        message.reply("Sorry, to export a channel you need the ADMIN permission");
        return;
    }

    const toExport = {
        author:            m => m.author.tag,
        createdTimestamp:  m => m.createdTimestamp,
        editedTimestamp:   m => m.editedTimestamp,
        content:           m => m.content,
        mentionedEveryone: m => m.mentions.everyone,
        mentionedChannels: m => m.mentions.channels.map(c => c.name).join("|"),
        mentionedMembers:  m => m.mentions.members.map(n => n.displayName).join("|"),
        mentionedRoles:    m => m.mentions.roles.map(r => r.name).join("|"),
    };

    // send DM to say that we're starting - it may take a while
    const dmChannel = message.author.dmChannel || await message.author.createDM();
    const reply = await message.reply("Export is starting, it could take up to a minute so please be patient 🙂");

    let data = [];
    let messages;
    let totalMessagesExported = 0;

    do {
        // eslint-disable-next-line no-await-in-loop
        messages = await channel.messages.fetch({
            limit:  100,
            before: beforeMessageId,
        }, false);

        beforeMessageId = Math.min(...messages.keys());
        totalMessagesExported += messages.size;
        data = data.concat(messages.map(m => Object.values(toExport).map(fn => fn(m))));
    } while (messages.size === 100 && totalMessagesExported < MAX_MESSAGES_PER_EXPORT);

    const header = Object.keys(toExport);
    const separator = separators[format];
    const buf = Buffer.from(convertArrayToCSV(data, { header, separator }));
    const file = new Discord.MessageAttachment(buf, "channel.csv");

    // send file
    dmChannel.send(file);

    if (totalMessagesExported >= MAX_MESSAGES_PER_EXPORT) {
        dmChannel.send(`I only exported the latest ${totalMessagesExported} items, to export more run `
            + `\`${prefix}exportChannelMessages ${channel} "${format}" ${beforeMessageId}\``);
    }

    // delete our temporary reply
    if (settings.get("DELETE_COMMAND_MESSAGE").enabled) {
        reply.delete();
    }
    // modify our temporary message
    else {
        reply.edit("Sent you a DM!");
    }
}
addCommand({
    name:    "exportChannelMessages",
    command: exportChannelMessages,
    syntax:  "{{prefix}}exportChannelMessages #channel [format]",
});
addCommandAlias("exportChannelMessages", "exportChannel");

/**
 * Invalid command, send a direct message to the member with the help text
 * @category Commands
 * @module invalidCommand
 */
addCommandAlias("help", "invalidCommand");

module.exports = commands;
