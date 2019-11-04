#!/usr/bin/env nodejs

// crash Node on unhandled promise rejections
process.on("unhandledRejection", up => {
    throw up;
});

// imports
const Discord        = require("discord.js");
const mysql          = require("mysql2/promise");

const secrets        = require("./secrets.js");
const constants      = require("./constants.js");
const helper         = require("./helper.js");
const commandManager = require("./commandManager.js");
const userManager    = require("./userManager.js");

// create the connection to database
const dbPool = mysql.createPool({
    connectionLimit: 10,
    host:            secrets.database.host,
    user:            secrets.database.user,
    password:        secrets.database.password,
    database:        secrets.database.database,
});
console.log("Connected to database");

// create the discord client
const client = new Discord.Client();

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // load TMHI guild
    const guild = client.guilds.get(constants.config.guild);

    // initialize user and command managers
    userManager.initialize(guild, dbPool);
    commandManager.initialize(guild, dbPool);

    // force update for all users
    guild.members.forEach((member, id) => {
        // skip bot users
        if (member.user.bot) {
            return;
        }

        // grant permissions based off roles
        const permissionsList = helper.rolesToPermissions(member.roles);
        const permissions = helper.permissionsToInt(permissionsList);

        // check that the user is added to the database and apply permissions
        userManager.addUserToDatabase(member.id, member.displayName, permissions);
    });

    /*
     * New user has joined the server.
     */
    client.on("guildMemberAdd", async member => {
        // add the user to the database
        userManager.addUserToDatabase(member.id, member.displayName, constants.permissions.TMHI_MEMBER);
    });

    /*
     * Someone left the server.
     */
    client.on("guildMemberRemove", async member => {
        // revoke all permissions
        userManager.revokePermissions(member.id, constants.permissions.ALL);
    });

    /*
     * The user has changed.
     */
    client.on("guildMemberUpdate", async (_, member) => {
        // grant permissions based off roles.
        // note that removing a role does not remove the permission!
        const permissionsList = helper.rolesToPermissions(member.roles);
        const permissions = helper.permissionsToInt(permissionsList);
        userManager.grantPermissions(member.id, permissions);
    });

    console.log("Finished initialization");
});

client.login(secrets.bot_token);
