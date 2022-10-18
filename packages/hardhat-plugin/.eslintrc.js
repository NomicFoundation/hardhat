const { resolve } = require("path");

module.exports = {
  extends: [resolve(__dirname, "../../config/eslint/.eslintrc.js")],
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
    sourceType: "module",
    createDefaultProgram: true,
  },
  ignorePatterns: ["**/assets/bundle.ts", "**/.eslintrc.js", "esbuild.js"],
};
