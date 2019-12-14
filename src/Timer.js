/* imports */
const dateFormat = require("dateformat");
const ClockBase  = require("./ClockBase");

/** A live clock for a guild channel/message */
class Timer extends ClockBase {
    /**
     * Create a live clock for a guild channel/message
     * @param {Object} data The clock data
     * @param {Date}   data.timeFinish The finish time
     * @param {Date}   data.timerFinishMessage The final message to display
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
        }

        const diff = new Date() - this.timerFinish;
        return dateFormat(diff, this.textContent);
    }

    /** Whether the timer is finished or not */
    get isFinished() {
        return new Date() > this.timeFinish;
    }
}

module.exports = Timer;
