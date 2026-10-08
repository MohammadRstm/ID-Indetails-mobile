// The tests run far from the company's time zone (Beirut), so anything formatted in the device's zone fails.
// Set here, before Jest starts its workers, so every worker inherits it.
process.env.TZ = "America/Los_Angeles";
process.env.EXPO_PUBLIC_API_URL = "http://api.test";

// Expo's Babel preset, which also transforms the app's own files (it is installed under expo).
const babelPresetExpo = require.resolve("babel-preset-expo", {
  paths: [require.resolve("expo/package.json")],
});

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
    // jest-expo resolves packages as React Native would, where MSW offers no server; tests run in Node.
    "^msw/node$": "<rootDir>/node_modules/msw/lib/node/index.js",
  },
  // A few of MSW's dependencies ship only ES modules (.mjs).
  transform: {
    "\\.mjs$": ["babel-jest", { presets: [babelPresetExpo] }],
  },
  // jest-expo's list, plus the ES-module packages the app and MSW use.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@dicebear|rettime|until-async|@open-draft/deferred-promise))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
};
