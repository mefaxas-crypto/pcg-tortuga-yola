// eslint.config.js
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import path from "path";
import { fileURLToPath } from "url";

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

export default tseslint.config(
    // Ignore the build output directory to prevent false errors
    {
        ignores: [".next/**", "next-env.d.ts"],
    },
    ...compat.extends("next/core-web-vitals"),
    ...tseslint.configs.recommended,
    {
        rules: {
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/ban-ts-comment": "off",
        },
    }
);