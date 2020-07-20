#!/usr/bin/env nodejs

// imports
const Discord        = require("discord.js");

const logger         = require("./logger");
const secrets        = require("./secrets");
const CommandManager = require("./CommandManager");
const TmhiDatabase   = require("./TmhiDatabase");

process.on("unhandledRejection", err => {
    logger.error("unhandledRejection:", err);
});

process.on("uncaughtException", err => {
    logger.error("uncaughtException:", err);
});

// create the discord client
const client = new Discord.Client();

client.on("ready", async () => {
    logger.info(`Logged in as ${client.user.tag}!`);

    // create the connection to database
    const tmhiDatabase = new TmhiDatabase(secrets.database);
    logger.verbose("Connected to database");

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
        logger.error("Failed loading clocks", clocks.error);
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

    logger.verbose("Finished initialization");
});

client.login(secrets.bot_token);
