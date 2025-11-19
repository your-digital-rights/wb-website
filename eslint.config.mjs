import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    ignores: [
        // Build output
        ".next/**",
        "out/**",
        "dist/**",
        "build/**",
        // Dependencies
        "node_modules/**",
        // Config files that use CommonJS require()
        "tailwind.config.js",
        "context/design-system/tailwind.config.js",
        "jest.config.js",
        // Test/debug files
        "debug-test.js",
        "test-dark-theme.js",
        "test-restart-fix.ts",
    ],
}, {
    extends: [...nextCoreWebVitals, ...nextTypescript],

    rules: {
        "@next/next/no-img-element": "off",
        "react/no-unescaped-entities": "off",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-object-type": "warn",
        "prefer-const": "warn",
        // Disable overly strict rule - setting loading states in effects is a common pattern
        "react-hooks/set-state-in-effect": "off",
    },
}, {
    files: ["**/__tests__/**/*", "**/*.spec.ts", "**/*.test.tsx"],

    rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-expressions": "off",
    },
}]);