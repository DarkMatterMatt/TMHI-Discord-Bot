module.exports = {
    env: {
        commonjs: true,
        es6: true,
        node: true,
    },
    extends: [
        "airbnb-base",
    ],
    globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
    },
    parserOptions: {
        ecmaVersion: 2019,
    },
    rules: {
        "arrow-parens": "off",
        "brace-style": ["error", "stroustrup"],
        "comma-dangle": ["error", {
            "arrays": "always-multiline",
            "objects": "always-multiline",
            "imports": "always-multiline",
            "exports": "always-multiline",
            "functions": "never",
        }],
        "indent": ["error", 4, {
            "SwitchCase": 1
        }],
        "key-spacing": ["error", {
            "mode": "minimum",
            "align": "value",
        }],
        "max-len": ["warn", {
            "code": 120
        }],
        "no-bitwise": "off",
        "no-console": "off",
        "no-multi-spaces": "off",
        "no-underscore-dangle": "off",
        "no-unused-vars": ["warn"],
        "no-restricted-syntax": "off",
        "quotes": ["error", "double"],
    },
};
