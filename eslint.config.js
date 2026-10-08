const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

// Dumb components (the UI kit and every feature's components/) render props only: no data, session or navigation.
const dumbImports = {
  patterns: [
    {
      group: ["@/api/*", "!@/api/types", "!@/api/mobileTypes"],
      message: "Dumb components get data through props.",
    },
    {
      group: ["@/auth/*", "@/permissions/*"],
      message: "Smart components read the session and permissions and pass booleans down.",
    },
  ],
  paths: [
    {
      name: "expo-router",
      message: "Dumb components report actions through callbacks; smart components navigate.",
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*", ".expo/*", "coverage/*", "src/api/schema.d.ts"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: [
      "src/ui/**/*.{ts,tsx}",
      "src/features/*/components/**/*.{ts,tsx}",
      "src/features/*/*/components/**/*.{ts,tsx}",
    ],
    rules: { "no-restricted-imports": ["error", dumbImports] },
  },
  {
    files: ["**/*.test.{ts,tsx}", "test/**/*.{ts,tsx}", "jest.setup.ts"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
      },
    },
  },
]);
