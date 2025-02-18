const { createConfig } = require("../../config-v-next/eslint.cjs");

const config = createConfig(__filename);

delete config.rules["@typescript-eslint/ban-ts-comment"]

module.exports = config;
