/* eslint-disable */

module.exports = {
    plugins: ["plugins/markdown"],
    recurseDepth: 10,
    source: {
        include: ["README.md", "src", "jsdocExternals.js"],
        includePattern: ".+\\.js(doc|x)?$",
        excludePattern: "(^|\\/|\\\\)_",
    },
    sourceType: "module",
    tags: {
        allowUnknownTags: true,
        dictionaries: ["jsdoc", "closure"],
    },
    templates: {
        cleverLinks:    false,
        monospaceLinks: false,
    },
}
