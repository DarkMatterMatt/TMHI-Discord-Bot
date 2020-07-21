/**
 * Replaces occurrences of {{name}} in str with replacements.name
 * @param {string} str The template string, with {{ }} template variables
 * @param {Record<string, string>} replacements The substitution strings
 */
function stringTemplate(str, replacements) {
    return str.replace(/\{\{([0-9a-zA-Z_]+)\}\}/g, (match, key_) => {
        const key = key_.trim().toLowerCase();
        const value = Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : null;
        return value == null ? "" : value;
    });
}

module.exports = {
    stringTemplate,
};
