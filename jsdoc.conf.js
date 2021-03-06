/* eslint-disable */

module.exports = {
    plugins: [
        "plugins/markdown",
        "node_modules/better-docs/category",
    ],
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
    opts: {
        template: "node_modules/better-docs",
    },
    templates: {
        cleverLinks:    false,
        monospaceLinks: false,
    },
}
