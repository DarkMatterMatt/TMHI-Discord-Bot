#!/usr/bin/env nodejs

// crash Node on unhandled promise rejections
process.on("unhandledRejection", up => {
    console.error("Time: " + new Date());
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

    client.guilds.cache.forEach(async (guild) => {
        await tmhiDatabase.syncGuild(guild);
    });

    // load clocks
    const clocks = await tmhiDatabase.loadClocks(client);
    if (clocks.status === "success") {
        // start all clocks
        clocks.forEach(clock => {
            clock.start();
        });
    }
    else {
        // failed to load clocks from database
        console.error("Failed loading clocks", clocks.error);
    }

    // start listening for user commands
    const commandManager = new CommandManager(client, tmhiDatabase, clocks);
    commandManager.startListening();

    /**
     * Bot joined a new server.
     */
    client.on("guildCreate", async (guild) => {
        await tmhiDatabase.syncGuild(guild);
    });

    /**
     * New user has joined the server.
     */
    client.on("guildMemberAdd", async (member) => {
        // add the user to the database
        await tmhiDatabase.addMember(member);
    });

    /**
     * Someone left the server.
     */
    client.on("guildMemberRemove", async (member) => {
        await tmhiDatabase.syncMemberRoles(member);
    });

    /**
     * The user has changed.
     */
    client.on("guildMemberUpdate", async (oldMember, newMember) => {
        await tmhiDatabase.syncMemberRoles(newMember);
    });

    /**
     * New role created.
     */
    client.on("roleCreate", async (role) => {
        await tmhiDatabase.syncGuildRoles(role.guild);
    });

    /**
     * Role was deleted.
     */
    client.on("roleDelete", async (role) => {
        await tmhiDatabase.syncGuildRoles(role.guild);
    });

    /**
     * A role changed.
     */
    client.on("roleUpdate", async (oldRole, newRole) => {
        await tmhiDatabase.syncGuildRoles(newRole.guild);
    });

    console.log("Finished initialization");
});

client.login(secrets.bot_token);
