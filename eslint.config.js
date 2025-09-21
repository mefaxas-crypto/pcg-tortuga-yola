const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");
const reactRecommended = require("eslint-plugin-react/configs/recommended");
const tsRecommended = require("@typescript-eslint/eslint-plugin/dist/configs/recommended.js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

module.exports = [
    ...compat.extends("next/core-web-vitals"),
    {
        files: ["**/*.ts", "**/*.tsx"],
        ...reactRecommended,
        ...tsRecommended,
        rules: {
            ...reactRecommended.rules,
            ...tsRecommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/ban-ts-comment": "off",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    }
];
