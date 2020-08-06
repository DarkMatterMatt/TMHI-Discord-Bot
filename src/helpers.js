/**
 * Replaces occurrences of {{name}} in str with replacements.name
 * @param {string} str The template string, with {{ }} template variables
 * @param {Record<string, string>} replacements The substitution strings
 */
function stringTemplate(str, replacements) {
    return str.replace(/\{\{\s*([0-9a-zA-Z_]+)\s*\}\}/g, (match, key_) => {
        const key = key_.toLowerCase();
        const value = Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : null;
        return value == null ? "" : value;
    });
}

/**
 * Replaces occurrences of {{attribute}} in str with details from the guild member
 * @param {string} str The template string, with {{ }} template variables
 * @param {GuildMember} member The member to substitute values in from
 * @param {Record<string, string>} replacements Additional substitution strings to override values from member
 */
function stringTemplateMember(str, member, replacements = {}) {
    const roles = member.roles.cache.map(r => r.name).filter(r => r !== "@everyone");
    return stringTemplate(str, {
        id:      member.id,
        member:  member.toString(),
        mention: member.toString(),
        rawtag:  member.user.tag,
        roles:   roles.join("|") || "*none*",
        tag:     member.user.tag,
        ...replacements,
    });
}

module.exports = {
    stringTemplate,
    stringTemplateMember,
};
