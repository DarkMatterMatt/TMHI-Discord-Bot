#!/usr/bin/env nodejs

// imports
const Discord        = require("discord.js");
const mysql          = require("mysql2");

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

    // initialize user and command managers
    userManager.initialize(dbPool);
    commandManager.initialize(client, dbPool);

    // load TMHI guild
    const guild = client.guilds.get(constants.guild);

    // force update for all users
    guild.members.values.forEach((member) => {
        // skip bot users
        if (member.user.bot) {
            return;
        }

        // grant permissions based off roles
        const permissionsList = [];
        constants.roles.values.forEach(role => {
            if (member.roles.has(role.id)) {
                permissionsList.push(...role.permissions);
            }
        });
        const permissions = helper.permissionsToInt(permissionsList);

        // check that the user is added to the database and apply permissions
        userManager.addUserToDatabase(member.id, member.displayName, permissions);
    });

    /*
     * New user has joined the server, add them to the database.
     */
    client.on("guildMemberAdd", async member => {
        userManager.addUserToDatabase(member.id, member.displayName, constants.permissions.TMHI_MEMBER);
    });

    /*
     * Someone left the server, strip their permissions.
     */
    client.on("guildMemberRemove", async member => {
        // create the connection to database
        userManager.revokePermissions(member.id, constants.permissions.ALL);
    });

    /*
     * New user has joined the server, add them to the database.
     */
    client.on("guildMemberUpdate", async (_, member) => {
        // grant permissions based off roles
        const permissionsList = [];
        constants.roles.values.forEach(role => {
            if (member.roles.has(role.id)) {
                permissionsList.push(...role.permissions);
            }
        });

        // apply permissions
        const permissions = helper.permissionsToInt(permissionsList);
        userManager.grantPermissions(member.id, permissions);
    });
});

client.login(secrets.bot_token);
