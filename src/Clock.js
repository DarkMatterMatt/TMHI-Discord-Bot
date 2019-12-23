/* imports */
const dateFormat = require("dateformat");
const ClockBase  = require("./ClockBase");

/** A live clock for a guild channel/message */
class Clock extends ClockBase {
    /**
     * Create a live clock for a guild channel/message
     * @param {Object}  data The clock data
     * @param {Number}  data.utcOffset The clock's timezone (±13h)
     */
    constructor({
        utcOffset,
        ...data
    } = {}) {
        super(data);

        this.utcOffset = utcOffset;
    }

    /** Generates the display string */
    getFormattedString() {
        const time = new Date();
        time.setHours(time.getHours() + this.utcOffset);
        return dateFormat(time, this.textContent, 1);
    }
}

module.exports = Clock;
