// permission integers
const P_ALL             = 2147483647;
const P_TMHI_MEMBER     = 1 << 0;
const P_TMHI_ADMIN      = 1 << 1;
const P_WIKI_ACCESS     = 1 << 2;

// shorter alias for module.exports
const e = module.exports;

// TMHI Discord Bot version (note that this is NOT the constants.js version)
e.version = "1.0.0";

/*
 * Bot configuration options
 * - All options can be changed at any time and be applied with a bot restart
 *   (without having to change settings anywhere else, e.g. in the database)
 */
e.config = {

    prefix: "!",
    guild:  "621253060332879872", // TMHI Discord server id

};

/*
 * User permissions
 * - Permissions can be added at any time
 * - Changes to these values MUST be accompanied by a database update or everything will break!
 */
e.permissions = {

    ALL:            P_ALL,
    TMHI_MEMBER:    P_TMHI_MEMBER,
    TMHI_ADMIN:     P_TMHI_ADMIN,
    WIKI_ACCESS:    P_WIKI_ACCESS,

};

/*
 * User roles
 * - Maps role names to their Discord id, and the permissions for that role
 */
e.roles = {

    CEO:                { id: "624005296674570241", permissions: [P_TMHI_MEMBER, P_TMHI_ADMIN, P_WIKI_ACCESS] },
    FLEET_COMMANDER:    { id: "629067265576534036", permissions: [P_TMHI_MEMBER, P_WIKI_ACCESS] },
    OFFICER:            { id: "628393968144482314", permissions: [P_TMHI_MEMBER, P_WIKI_ACCESS] },
    MEMBER:             { id: "622969538916515864", permissions: [P_TMHI_MEMBER, P_WIKI_ACCESS] },
    INITIATE:           { id: "623302616486772742", permissions: [P_TMHI_MEMBER] },

    INDUSTRIAL:         { id: "627811415226580993", permissions: [] },
    BLACK_OPS:          { id: "627811756491931669", permissions: [] },

    AU_TZ:              { id: "628418837359886346", permissions: [] },
    EU_TZ:              { id: "628418919765377024", permissions: [] },
    US_TZ:              { id: "628418950044188712", permissions: [] },

    NEWBRO:             { id: "629067334581092365", permissions: [] },
    VETERAN_5:          { id: "629068271869624341", permissions: [] },
    VETERAN_10:         { id: "629067188682358874", permissions: [] },

    NITRO:              { id: "639621516044009473", permissions: [] },
    DEVELOPER:          { id: "635633288349745182", permissions: [] },
    BOT:                { id: "628408427621646376", permissions: [] },

};
