/* imports */
const dateFormat = require("dateformat");
const ClockBase  = require("./ClockBase");

/** A live clock for a guild channel/message */
class Stopwatch extends ClockBase {
    /**
     * Create a live clock for a guild channel/message
     * @param {Object} data The clock data
     * @param {Date}   data.timeStart The start time
     * @param {Date}   data.timeFinish The finish time
     */
    constructor({
        timeFinish,
        timerFinishMessage,
        ...data
    } = {}) {
        super(data);

        this.timeFinish         = timeFinish;
        this.timerFinishMessage = timerFinishMessage;
    }

    /** Generates the display string */
    getFormattedString() {
        if (this.isFinished) {
            this.stop();
            return this.timerFinishMessage;
        }

        let diff = this.timerFinish - new Date();
        // round to nearest minute
        diff = Math.round(diff / 60e3) * 60e3;
        return dateFormat(diff, this.textContent, "UTC");
    }

    /** Whether the stopwatch is finished or not */
    get isFinished() {
        return new Date() > this.timeFinish;
    }
}

module.exports = Stopwatch;
