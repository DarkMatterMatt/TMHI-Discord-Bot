/* imports */
const dateFormat = require("dateformat");

/** The base class of the live Clock/Timer/Stopwatch */
class ClockBase {
    /**
     * Create a live clock for a guild channel/message
     * @param {Object}  data The clock data
     * @param {string}  data.id The clock ID
     * @param {string}  data.guild The guild that this clock applies to
     * @param {external:GuildChannel?} data.channel The channel that this clock updates the name of
     * @param {external:Message?} data.message The message that this clock updates the content of
     * @param {string}  data.textContent The clock formatting
     */
    constructor({
        id,
        guild,
        channel,
        message,
        textContent,
    } = {}) {
        if (!channel && !message) {
            throw new Error("Channel or Message must be specified.");
        }
        Object.defineProperty(this, "client", { value: guild.client });
        this.id          = id;
        this.guild       = guild;
        this.channel     = channel;
        this.message     = message;
        this.textContent = textContent;
    }

    /** Generates the display string */
    // eslint-disable-next-line class-methods-use-this
    getFormattedString() {
        console.warn("Please use Clock/Timer/Stopwatch instead of ClockBase");
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

    /** Loop every minute */
    loop() {
        if (this._stop) {
            return;
        }

        this.update();

        const nextUpdate = new Date();
        nextUpdate.setMinutes(nextUpdate.getMinutes() + 1, 0, 0);
        setTimeout(this.loop, nextUpdate - new Date());
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
}

module.exports = ClockBase;
