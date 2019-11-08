#!/usr/bin/env nodejs

// crash Node on unhandled promise rejections
process.on("unhandledRejection", up => {
    throw up;
});

// imports
const Discord        = require("discord.js");

const secrets        = require("./secrets.js");
const CommandManager = require("./CommandManager.js");
const TmhiDatabase   = require("./TmhiDatabase.js");

// create the discord client
const client = new Discord.Client();

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // create the connection to database
    const tmhiDatabase = new TmhiDatabase(secrets.database);
    console.log("Connected to database");

    // start listening for user commands
    const commandManager = new CommandManager(client, tmhiDatabase);
    commandManager.startListening();

    client.guilds.forEach(async (guild) => {
        // force update for all roles
        await tmhiDatabase.syncGuildRoles(guild.roles);

        // force update for all users
        guild.members.forEach(async (member, id) => {
            // skip bot users
            if (member.user.bot) {
                return;
            }

            // check that the user is added to the database
            await tmhiDatabase.addUserToDatabase(member);
            await tmhiDatabase.syncMemberRoles(member);
        });
    });

    /*
     * New user has joined the server.
     */
    client.on("guildMemberAdd", async (member) => {
        // add the user to the database
        await tmhiDatabase.addUserToDatabase(member);
    });

    /*
     * Someone left the server.
     */
    client.on("guildMemberRemove", async (member) => {
        await tmhiDatabase.syncMemberRoles(member);
    });

    /*
     * The user has changed.
     */
    client.on("guildMemberUpdate", async (oldMember, newMember) => {
        await tmhiDatabase.syncMemberRoles(newMember);
    });

    console.log("Finished initialization");
});

client.login(secrets.bot_token);
