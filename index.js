#!/usr/bin/env nodejs

// crash Node on unhandled promise rejections
process.on("unhandledRejection", up => {
    throw up;
});

// imports
const Discord        = require("discord.js");

const secrets        = require("./secrets.js");
const constants      = require("./constants.js");
const helper         = require("./helper.js");
const CommandManager = require("./CommandManager.js");
const TmhiDatabase   = require("./TmhiDatabase.js");

// create the discord client
const client = new Discord.Client();

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // create the connection to database
    const tmhiDatabase = new TmhiDatabase(secrets.database);
    console.log("Connected to database");

    // load TMHI guild
    const guild = client.guilds.get(constants.config.guild);

    // initialize user and command managers
    const commandManager = new CommandManager(client, tmhiDatabase);
    commandManager.startListening();

    // force update for all users
    guild.members.forEach((member, id) => {
        // skip bot users
        if (member.user.bot) {
            return;
        }

        // check that the user is added to the database
        tmhiDatabase.addUserToDatabase(member);
    });

    /*
     * New user has joined the server.
     */
    client.on("guildMemberAdd", member => {
        // add the user to the database
        tmhiDatabase.addUserToDatabase(member);
    });

    /*
     * Someone left the server.
     */
    client.on("guildMemberRemove", async member => {

    });

    /*
     * The user has changed.
     */
    client.on("guildMemberUpdate", async (_, member) => {

    });

    console.log("Finished initialization");
});

client.login(secrets.bot_token);
