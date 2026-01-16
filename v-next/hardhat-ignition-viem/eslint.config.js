import path from "node:path";
import { createConfig } from "../config/eslint.config.js";

const config = createConfig(import.meta.filename);

// Use the tsconfig.test.json file for linting as it
// includes the test files
const parserOptions = config[0].languageOptions.parserOptions;
parserOptions.project = path.join(
  path.dirname(import.meta.filename),
  "tsconfig.test.json",
);
parserOptions.projectService = undefined;

export default config;
