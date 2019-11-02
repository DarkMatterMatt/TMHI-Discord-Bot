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
        "indent": ["error", 4, {
            "SwitchCase": 1
        }],
        "quotes": ["error", "double"],
        "key-spacing": ["error", {
            "mode": "minimum",
            "align": "value",
        }],
        "max-len": ["warn", {
            "code": 120
        }],
        "no-bitwise": "off",
        "no-console": "off",
        "no-multi-spaces": ["error", {
            "exceptions": {
                "Property": true,
                "VariableDeclarator": true,
            },
        }],
        "no-unused-vars": ["warn"],
        "no-restricted-syntax": "off",
    },
};
