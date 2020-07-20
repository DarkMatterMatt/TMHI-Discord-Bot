const logger = require("./logger");

/** The base class of the live Clock/Timer/Stopwatch */
class ClockBase {
    /**
     * Create a live clock for a guild channel/message
     * @param {Object}  data The clock data
     * @param {string}  data.guild The guild that this clock applies to
     * @param {external:GuildChannel?} data.channel The channel that this clock updates the name of
     * @param {external:Message?} data.message The message that this clock updates the content of
     * @param {string}  data.textContent The clock formatting
     */
    constructor({
        guild,
        channel,
        message,
        textContent,
    } = {}) {
        if (!channel && !message) {
            throw new Error("Channel or Message must be specified.");
        }
        Object.defineProperty(this, "client", { value: guild.client });
        this.guild       = guild;
        this.channel     = channel;
        this.message     = message;
        this.textContent = textContent;
    }

    /** Generates the display string */
    // eslint-disable-next-line class-methods-use-this
    getFormattedString() {
        logger.warn("Please use Clock/Timer/Stopwatch instead of ClockBase");
        return "ClockBase";
    }

    /** Updates the channel name / messsage text */
    update() {
        const formattedString = this.getFormattedString();

        if (this.updatesChannel) {
            // update channel name
            return this.channel.setName(formattedString);
        }
        // update message content
        return this.message.edit(formattedString);
    }

    /** Loop regularly, every minute for messages and every 10 mins for channel names */
    loop() {
        if (this._stop) {
            return;
        }

        this.update();

        // 2020-07-20 - Discord limits channel name updates to once per 10 minutes
        const updateFreq = this.updatesChannel ? 10 * 60 * 1000 : 60 * 1000;
        setTimeout(() => this.loop(), updateFreq - (Date.now() % updateFreq));
    }

    /** Start looping */
    start() {
        this._stop = false;
        this.loop();
    }

    /** Stop looping */
    stop() {
        this._stop = true;
    }

    /** Whether the clock updates a message's content */
    get updatesMessage() {
        return this.message;
    }

    /** Whether the clock updates a channel's name */
    get updatesChannel() {
        return !this.updatesMessage;
    }

    /** The clock's unique ID */
    get id() {
        return this.constructor.id(this);
    }

    /** Calculate a clock's ID from a clock-like object or string */
    static id(clock) {
        let guildId;
        let channelId;
        let messageId;

        // string ID
        if (typeof clock === "string") {
            [guildId, channelId, messageId] = clock.split("|");
        }
        // guild, channel, message ID's are directly defined
        else if (clock.guildId !== undefined) {
            ({ guildId, channelId, messageId } = clock);
        }
        // normal clock object
        else {
            guildId   = clock.guild.id;
            channelId = clock.channel.id;
            messageId = clock.message ? clock.message.id : null;
        }
        if (!messageId) {
            return `${guildId}|${channelId}`;
        }
        return `${guildId}|${channelId}|${messageId}`;
    }
}

module.exports = ClockBase;
