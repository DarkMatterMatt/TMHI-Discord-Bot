const chalk = require("chalk");
const { createLogger, format, transports } = require("winston");
const { inspect } = require("util");
const { SPLAT } = require("triple-beam");
const jsonStringify_ = require("fast-safe-stringify");
require("winston-daily-rotate-file");

const colors = {
    error:   "redBright",
    warn:    "yellowBright",
    info:    "greenBright",
    http:    "greenBright",
    verbose: "cyanBright",
};

const isPrimitive = val => val === null || (typeof val !== "object" && typeof val !== "function");

const formatWithInspect = val => {
    if (typeof val === "string") {
        return val;
    }
    const newLine = isPrimitive(val) ? "" : "\n";
    return newLine + inspect(val, { depth: null, colors: true });
};

const colorize = (color, s) => {
    if (!color) return s;
    if (!chalk.bold[color]) throw new Error(`Invalid console text color: '${color}'`);
    return chalk.bold[color](s);
};

const jsonStringifyErrors = (key, value) => {
    if (value instanceof Error) {
        const error = {};
        Object.getOwnPropertyNames(value).forEach(k => {
            error[k] = value[k];
        });
        return error;
    }
    return value;
};

const jsonStringify = obj => jsonStringify_(obj, jsonStringifyErrors);

const logger = createLogger({
    transports: [
        new transports.DailyRotateFile({
            filename: "combined_%DATE%.log",
            maxFiles: "14d",
            format:   format.combine(
                format.timestamp(),
                format.errors({ stack: true }),
                format.printf(info => {
                    const splatArgs = info[SPLAT];
                    if (splatArgs) {
                        // eslint-disable-next-line no-param-reassign
                        info.message = [info.message].concat(splatArgs);
                    }
                    return jsonStringify(info);
                })
            ),
        }),
        new transports.Console({
            level:  "debug",
            format: format.combine(
                format.timestamp({ format: "MMM DD, HH:mm:ss" }),
                format.printf(info => {
                    const coloredLevel = colorize(colors[info.level], info.level.padEnd(7));
                    const msg = formatWithInspect(info.message);
                    const splatArgs = info[SPLAT] || [];
                    const rest = splatArgs.map(formatWithInspect).join(" ");
                    return `${info.timestamp}  ${coloredLevel}  ${msg} ${rest}`;
                })
            ),
        }),
    ],
});

module.exports = logger;
